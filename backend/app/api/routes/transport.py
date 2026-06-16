"""
backend/app/api/routes/transport.py  (versão atualizada)

Adiciona:
  - WebSocket /transport/ws/{request_id}  — rastreamento GPS em tempo real
  - Integração FCM em accept_request, change_request_status, update_location
  - Emissão de eventos WS em cada mudança de estado
"""

import uuid
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import SessionLocal, get_db
from app.core.security import decode_token
from app.crud.transport import (
    accept_transport_request,
    create_route,
    create_transport_request,
    get_route,
    get_transport_request,
    list_incoming_requests,
    list_my_routes,
    list_my_transport_requests,
    search_routes,
    update_transport_location,
    update_transport_request_status,
)
from app.crud.user import get_user_by_id
from app.crud.vehicle import (
    create_vehicle,
    delete_vehicle,
    get_vehicle,
    list_vehicles_by_owner,
    update_vehicle,
)
from app.models.transport_request import TransportStatus
from app.models.user import User, UserRole
from app.schemas.transport import (
    TransportRequestCreate,
    TransportRequestLocationUpdate,
    TransportRequestRead,
    TransportRequestUpdateStatus,
    TransportRouteCreate,
    TransportRouteRead,
    VehicleCreate,
    VehicleRead,
    VehicleUpdate,
)
from app.utils.notifications import notify_new_request, notify_status_change
from app.utils.transport_ws_manager import TransportEvent, transport_ws_manager

router = APIRouter(prefix="/transport", tags=["Transporte Rural"])


# ---------- Helpers internos ----------

def _get_fcm_token(user: User | None) -> str | None:
    """Retorna o FCM token do utilizador, se disponível."""
    if user is None:
        return None
    return getattr(user, "fcm_token", None)


# ---------- Veículos ----------

@router.post("/vehicles", response_model=VehicleRead, status_code=status.HTTP_201_CREATED)
def register_vehicle(
    vehicle_in: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRANSPORTADOR)),
):
    """Registar um veículo (caminhão, carrinha, trator de carga, reboque)."""
    return create_vehicle(db, vehicle_in, proprietario_id=current_user.id)


@router.get("/vehicles/me", response_model=list[VehicleRead])
def my_vehicles(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRANSPORTADOR)),
):
    """Listar os veículos do transportador autenticado."""
    return list_vehicles_by_owner(db, current_user.id)


@router.put("/vehicles/{vehicle_id}", response_model=VehicleRead)
def edit_vehicle(
    vehicle_id: uuid.UUID,
    vehicle_in: VehicleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = get_vehicle(db, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Veículo não encontrado")
    if vehicle.proprietario_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")
    return update_vehicle(db, vehicle, vehicle_in)


@router.delete("/vehicles/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_vehicle(
    vehicle_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = get_vehicle(db, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Veículo não encontrado")
    if vehicle.proprietario_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")
    delete_vehicle(db, vehicle)


# ---------- Rotas ----------

@router.post("/routes", response_model=TransportRouteRead, status_code=status.HTTP_201_CREATED)
def publish_route(
    route_in: TransportRouteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRANSPORTADOR)),
):
    """Publicar uma rota (origem, destino, data, capacidade disponível, preço por tonelada)."""
    return create_route(db, route_in, transportador_id=current_user.id)


@router.get("/routes", response_model=list[TransportRouteRead])
def find_routes(
    origem: str | None = Query(default=None),
    destino: str | None = Query(default=None),
    data: date | None = Query(default=None),
    peso_minimo_disponivel: Decimal | None = Query(default=None, ge=0),
    db: Session = Depends(get_db),
):
    """Buscar rotas/transportadores próximos disponíveis."""
    return search_routes(db, origem=origem, destino=destino, data=data, peso_minimo_disponivel=peso_minimo_disponivel)


@router.get("/routes/me", response_model=list[TransportRouteRead])
def my_routes(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRANSPORTADOR)),
):
    """Listar as rotas publicadas pelo transportador autenticado."""
    return list_my_routes(db, current_user.id)


@router.get("/requests/incoming", response_model=list[TransportRequestRead])
def incoming_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRANSPORTADOR)),
):
    """Listar as solicitações recebidas pelo transportador (via suas rotas)."""
    return list_incoming_requests(db, current_user.id)


@router.get("/routes/{route_id}", response_model=TransportRouteRead)
def read_route(route_id: uuid.UUID, db: Session = Depends(get_db)):
    route = get_route(db, route_id)
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rota não encontrada")
    return route


# ---------- Solicitações de Transporte ----------

@router.post("/requests", response_model=TransportRequestRead, status_code=status.HTTP_201_CREATED)
async def request_transport(
    request_in: TransportRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.AGRICULTOR)),
):
    """Agricultor cria uma solicitação de transporte.

    Notifica o transportador via push FCM (se tiver rota associada).
    """
    db_request = create_transport_request(db, request_in, agricultor_id=current_user.id)

    # Push FCM ao transportador se a solicitação está ligada a uma rota
    if db_request.rota_id:
        rota = get_route(db, db_request.rota_id)
        if rota:
            transportador = get_user_by_id(db, rota.transportador_id)
            await notify_new_request(
                transportador_fcm_token=_get_fcm_token(transportador),
                request_id=str(db_request.id),
                produto=db_request.produto,
                peso=str(db_request.peso_toneladas),
                origem=db_request.origem,
                destino=db_request.destino,
            )

    return db_request


@router.get("/requests/me", response_model=list[TransportRequestRead])
def my_transport_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.AGRICULTOR)),
):
    """Listar as solicitações de transporte do agricultor autenticado."""
    return list_my_transport_requests(db, current_user.id)


@router.get("/requests/{request_id}", response_model=TransportRequestRead)
def read_transport_request(request_id: uuid.UUID, db: Session = Depends(get_db)):
    request = get_transport_request(db, request_id)
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitação não encontrada")
    return request


@router.post("/requests/{request_id}/accept", response_model=TransportRequestRead)
async def accept_request(
    request_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRANSPORTADOR)),
):
    """Transportador aceita o pedido. Calcula comissão automaticamente (5%).

    Emite evento WebSocket + push FCM ao agricultor.
    """
    db_request = get_transport_request(db, request_id)
    if not db_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitação não encontrada")

    db_request = accept_transport_request(db, db_request, transportador_id=current_user.id)

    agricultor = get_user_by_id(db, db_request.agricultor_id)

    # Evento WebSocket em tempo real
    await transport_ws_manager.send_status_changed(
        request_id=db_request.id,
        status=db_request.status.value,
    )

    # Push FCM ao agricultor
    await notify_status_change(
        agricultor_fcm_token=_get_fcm_token(agricultor),
        transportador_fcm_token=None,
        request_id=str(db_request.id),
        new_status=db_request.status.value,
        produto=db_request.produto,
        origem=db_request.origem,
        destino=db_request.destino,
    )

    return db_request


@router.patch("/requests/{request_id}/status", response_model=TransportRequestRead)
async def change_request_status(
    request_id: uuid.UUID,
    status_in: TransportRequestUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualizar o status: pendente → aceite → em_andamento → concluido (ou cancelado).

    Emite evento WebSocket + push FCM.
    """
    db_request = get_transport_request(db, request_id)
    if not db_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitação não encontrada")

    db_request = update_transport_request_status(db, db_request, status_in.status)

    agricultor = get_user_by_id(db, db_request.agricultor_id)

    # Evento WebSocket em tempo real
    await transport_ws_manager.send_status_changed(
        request_id=db_request.id,
        status=db_request.status.value,
    )

    # Push FCM ao agricultor
    await notify_status_change(
        agricultor_fcm_token=_get_fcm_token(agricultor),
        transportador_fcm_token=None,
        request_id=str(db_request.id),
        new_status=db_request.status.value,
        produto=db_request.produto,
        origem=db_request.origem,
        destino=db_request.destino,
    )

    return db_request


@router.patch("/requests/{request_id}/location", response_model=TransportRequestRead)
async def update_location(
    request_id: uuid.UUID,
    location_in: TransportRequestLocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRANSPORTADOR)),
):
    """Atualizar a localização GPS em tempo real (rastreamento).

    Emite evento WebSocket de localização para todos os participantes da sala.
    Usado pelo app Flutter do transportador a cada N segundos.
    """
    db_request = get_transport_request(db, request_id)
    if not db_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitação não encontrada")
    if db_request.status not in (TransportStatus.ACEITE, TransportStatus.EM_ANDAMENTO):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Só é possível atualizar localização para transportes aceites ou em andamento",
        )

    db_request = update_transport_location(db, db_request, location_in)

    # Evento WebSocket GPS em tempo real para o agricultor acompanhar no mapa
    await transport_ws_manager.send_location_update(
        request_id=db_request.id,
        latitude=float(db_request.latitude_atual),
        longitude=float(db_request.longitude_atual),
        hora_prevista_chegada=(
            db_request.hora_prevista_chegada.isoformat()
            if db_request.hora_prevista_chegada
            else None
        ),
    )

    return db_request


# ---------- WebSocket de Rastreamento ----------

@router.websocket("/ws/{request_id}")
async def transport_tracking_ws(
    websocket: WebSocket,
    request_id: uuid.UUID,
    token: str = Query(...),
):
    """WebSocket de rastreamento em tempo real para uma solicitação de transporte.

    Agricultor e transportador conectam-se à mesma sala (request_id).
    Recebem eventos:
      - location_update  { latitude, longitude, hora_prevista_chegada }
      - status_changed   { status, updated_at }
      - connected        { message, participants }

    URL: ws://api/v1/transport/ws/{request_id}?token=<JWT>

    O cliente pode enviar um ping JSON para manter a conexão:
      { "type": "ping" }
    O servidor responde com:
      { "type": "pong" }
    """
    # Autenticação via JWT no query param (padrão WebSocket)
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = uuid.UUID(payload["sub"])

    db = SessionLocal()
    try:
        user = get_user_by_id(db, user_id)
        if user is None or not user.ativo:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # Verifica que o utilizador é participante desta solicitação
        db_request = get_transport_request(db, request_id)
        if db_request is None:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
            return

        is_agricultor = db_request.agricultor_id == user_id
        is_transportador = (
            db_request.rota_id is not None
            and db_request.rota is not None
            and db_request.rota.transportador_id == user_id
        )
        is_admin = user.role == UserRole.ADMIN

        if not (is_agricultor or is_transportador or is_admin):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        await transport_ws_manager.connect(request_id, websocket)

        # Confirma conexão e envia estado atual
        await websocket.send_json({
            "event": TransportEvent.CONNECTED,
            "request_id": str(request_id),
            "data": {
                "message": "Conectado ao rastreamento em tempo real",
                "role": "agricultor" if is_agricultor else "transportador",
                "current_status": db_request.status.value,
                "latitude": float(db_request.latitude_atual) if db_request.latitude_atual else None,
                "longitude": float(db_request.longitude_atual) if db_request.longitude_atual else None,
                "hora_prevista_chegada": (
                    db_request.hora_prevista_chegada.isoformat()
                    if db_request.hora_prevista_chegada
                    else None
                ),
            },
        })

        try:
            while True:
                data = await websocket.receive_json()
                # Suporte a ping/pong para manter conexão viva (mobile em background)
                if data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                # Transportador pode enviar localização diretamente via WS
                # (alternativa ao endpoint REST PATCH /location)
                elif data.get("type") == "location" and is_transportador:
                    lat = data.get("latitude")
                    lng = data.get("longitude")
                    eta = data.get("hora_prevista_chegada")
                    if lat is not None and lng is not None:
                        from app.schemas.transport import TransportRequestLocationUpdate
                        from decimal import Decimal
                        location_in = TransportRequestLocationUpdate(
                            latitude_atual=Decimal(str(lat)),
                            longitude_atual=Decimal(str(lng)),
                            hora_prevista_chegada=eta,
                        )
                        db_request = update_transport_location(db, db_request, location_in)
                        await transport_ws_manager.send_location_update(
                            request_id=request_id,
                            latitude=lat,
                            longitude=lng,
                            hora_prevista_chegada=eta,
                        )

        except WebSocketDisconnect:
            transport_ws_manager.disconnect(request_id, websocket)

    finally:
        db.close()