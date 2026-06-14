# app/routes/transport.py
# ============================================================================
# ENDPOINTS FastAPI - MÓDULO 3: TRANSPORTE RURAL
# AgroLink
# ============================================================================

from fastapi import APIRouter, Depends, HTTPException, WebSocket, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import math
import json
from decimal import Decimal

from app.database import get_db
from app.models.transport import (
    TransportRequest,
    Transporter,
    Vehicle,
    LoadPoint,
    TransportRating,
    TransportPayment,
    LocationHistory
)
from app.schemas.transport import (
    TransportRequestCreate,
    TransportRequestUpdate,
    TransporterCreate,
    VehicleCreate,
    TransportRatingCreate
)
from app.services.commission import CommissionService
from app.services.notification import NotificationService
from app.services.multicaixa import MulticaixaService
from app.utils.geo import calculate_distance
from app.security import get_current_user

router = APIRouter(prefix="/api/v1/transport", tags=["transport"])
commission_service = CommissionService()
notification_service = NotificationService()
multicaixa_service = MulticaixaService()

# ============================================================================
# 1. PEDIDOS DE TRANSPORTE
# ============================================================================

@router.post("/requests", response_model=dict)
async def create_transport_request(
    request_data: TransportRequestCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Criar novo pedido de transporte
    
    POST /api/v1/transport/requests
    {
        "origin": "Kilamba, Luanda",
        "destination": "Viana, Luanda",
        "product_id": "prod_001",
        "quantity": 5,
        "unit": "toneladas",
        "weight": 5000,
        "scheduled_date": "2024-06-14T14:00:00",
        "notes": "Produto frágil"
    }
    """
    try:
        # Validar que o usuário é agricultor
        if current_user.role != "farmer":
            raise HTTPException(status_code=403, detail="Apenas agricultores podem criar pedidos")

        # Calcular distância entre origem e destino
        distance = calculate_distance(
            request_data.origin_latitude,
            request_data.origin_longitude,
            request_data.destination_latitude,
            request_data.destination_longitude
        )

        # Calcular preço base
        base_price = commission_service.calculate_base_price(
            distance=distance,
            weight=request_data.weight
        )

        # Calcular comissão
        commission = commission_service.calculate_commission(base_price)

        # Gerar ID único do pedido
        request_id = generate_transport_id()

        # Criar pedido no banco de dados
        transport_request = TransportRequest(
            id=request_id,
            farmer_id=current_user.id,
            product_id=request_data.product_id,
            quantity=request_data.quantity,
            unit=request_data.unit,
            weight=request_data.weight,
            origin_address=request_data.origin,
            origin_latitude=request_data.origin_latitude,
            origin_longitude=request_data.origin_longitude,
            destination_address=request_data.destination,
            destination_latitude=request_data.destination_latitude,
            destination_longitude=request_data.destination_longitude,
            distance=distance,
            status="pendente",
            base_price=base_price,
            commission_amount=commission["amount"],
            commission_percentage=commission["percentage"],
            transporter_receives=commission["for_transporter"],
            platform_receives=commission["for_platform"],
            scheduled_date=request_data.scheduled_date,
            notes=request_data.notes
        )

        db.add(transport_request)
        db.commit()
        db.refresh(transport_request)

        # Notificar transportadores próximos
        await notify_nearby_transporters(request_id, distance)

        return {
            "id": request_id,
            "status": "pendente",
            "price_quote": float(base_price),
            "commission": {
                "percentage": commission["percentage"],
                "amount": float(commission["amount"]),
                "for_platform": float(commission["for_platform"]),
                "for_transporter": float(commission["for_transporter"])
            },
            "created_at": transport_request.created_at.isoformat()
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/requests/{request_id}")
async def get_transport_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Obter detalhes de um pedido de transporte
    """
    transport_request = db.query(TransportRequest).filter(
        TransportRequest.id == request_id
    ).first()

    if not transport_request:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    # Verificar permissões
    if current_user.id != transport_request.farmer_id and \
       current_user.id != (transport_request.transporter_id if transport_request.transporter_id else None):
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Acesso negado")

    return format_transport_response(transport_request)


@router.get("/requests")
async def list_transport_requests(
    status: Optional[str] = None,
    farmer_id: Optional[str] = None,
    transporter_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Listar pedidos com filtros
    
    GET /api/v1/transport/requests?status=pendente&skip=0&limit=20
    """
    query = db.query(TransportRequest)

    # Aplicar filtros baseado no papel do usuário
    if current_user.role == "farmer":
        query = query.filter(TransportRequest.farmer_id == current_user.id)
    elif current_user.role == "transporter":
        query = query.filter(TransportRequest.transporter_id == current_user.id)

    if status:
        query = query.filter(TransportRequest.status == status)
    if farmer_id:
        query = query.filter(TransportRequest.farmer_id == farmer_id)
    if transporter_id:
        query = query.filter(TransportRequest.transporter_id == transporter_id)

    requests = query.offset(skip).limit(limit).all()
    total = query.count()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "requests": [format_transport_response(r) for r in requests]
    }


@router.put("/requests/{request_id}")
async def update_transport_request(
    request_id: str,
    update_data: TransportRequestUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Atualizar pedido (apenas agricultor ou admin)
    """
    transport_request = db.query(TransportRequest).filter(
        TransportRequest.id == request_id
    ).first()

    if not transport_request:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    if current_user.id != transport_request.farmer_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")

    # Atualizar campos permitidos
    if update_data.status:
        transport_request.status = update_data.status
    if update_data.notes:
        transport_request.notes = update_data.notes

    db.commit()
    db.refresh(transport_request)

    return format_transport_response(transport_request)


# ============================================================================
# 2. ACEITAÇÃO E GERENCIAMENTO
# ============================================================================

@router.post("/requests/{request_id}/accept")
async def accept_transport_request(
    request_id: str,
    accept_data: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Transportador aceita um pedido
    
    POST /api/v1/transport/requests/{request_id}/accept
    {
        "transporter_id": "TRPT001",
        "vehicle_id": "VEH001"
    }
    """
    transport_request = db.query(TransportRequest).filter(
        TransportRequest.id == request_id
    ).first()

    if not transport_request:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    if transport_request.status != "pendente":
        raise HTTPException(status_code=400, detail="Pedido não está mais disponível")

    # Verificar se o transportador existe e está ativo
    transporter = db.query(Transporter).filter(
        Transporter.id == accept_data["transporter_id"]
    ).first()

    if not transporter or not transporter.is_active:
        raise HTTPException(status_code=404, detail="Transportador não encontrado")

    # Verificar capacidade do veículo
    vehicle = db.query(Vehicle).filter(
        Vehicle.id == accept_data["vehicle_id"]
    ).first()

    available_capacity = vehicle.capacity - vehicle.capacity_used
    if available_capacity < transport_request.weight:
        raise HTTPException(
            status_code=400,
            detail=f"Veículo não tem capacidade suficiente. Disponível: {available_capacity}kg"
        )

    # Atualizar pedido
    transport_request.transporter_id = transporter.id
    transport_request.vehicle_id = vehicle.id
    transport_request.status = "aceite"
    transport_request.accepted_at = datetime.now()
    transport_request.estimated_arrival = calculate_eta(
        transport_request.distance
    )

    # Atualizar veículo
    vehicle.capacity_used += transport_request.weight

    # Criar pontos de carga
    load_points = create_load_points(
        request_id=request_id,
        origin=(transport_request.origin_latitude, transport_request.origin_longitude),
        destination=(transport_request.destination_latitude, transport_request.destination_longitude)
    )

    db.add_all(load_points)
    db.commit()

    # Notificar agricultor
    await notification_service.send(
        user_id=transport_request.farmer_id,
        type="transportador_aceita",
        title="✓ Transportador Encontrado!",
        body=f"{transporter.name} aceitou seu pedido de transporte",
        data={
            "transport_id": request_id,
            "transporter_name": transporter.name,
            "vehicle_plate": vehicle.plate,
            "eta": transport_request.estimated_arrival.isoformat()
        }
    )

    return {
        "status": "aceite",
        "transporter": format_transporter_response(transporter),
        "vehicle": {
            "id": vehicle.id,
            "plate": vehicle.plate,
            "type": vehicle.type,
            "capacity": vehicle.capacity,
            "capacity_used": vehicle.capacity_used
        },
        "commission_reserved": float(transport_request.commission_amount),
        "eta": transport_request.estimated_arrival.isoformat()
    }


@router.post("/requests/{request_id}/cancel")
async def cancel_transport_request(
    request_id: str,
    cancel_data: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Cancelar pedido
    """
    transport_request = db.query(TransportRequest).filter(
        TransportRequest.id == request_id
    ).first()

    if not transport_request:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    # Verificar permissões
    if current_user.id != transport_request.farmer_id and \
       (not transport_request.transporter_id or current_user.id != transport_request.transporter_id):
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Acesso negado")

    # Não pode cancelar se já foi concluído
    if transport_request.status == "concluido":
        raise HTTPException(status_code=400, detail="Não é possível cancelar um transporte concluído")

    # Se tem transportador associado, liberar capacidade
    if transport_request.vehicle_id:
        vehicle = db.query(Vehicle).filter(
            Vehicle.id == transport_request.vehicle_id
        ).first()
        vehicle.capacity_used -= transport_request.weight

    transport_request.status = "cancelado"
    transport_request.cancellation_reason = cancel_data.get("reason", "Cancelado pelo usuário")

    db.commit()

    return {"status": "cancelado"}


# ============================================================================
# 3. RASTREAMENTO GPS
# ============================================================================

@router.get("/requests/{request_id}/tracking")
async def get_transport_tracking(
    request_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Obter localização atual do transporte
    """
    transport_request = db.query(TransportRequest).filter(
        TransportRequest.id == request_id
    ).first()

    if not transport_request:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    # Verificar permissões
    if current_user.id != transport_request.farmer_id and \
       (not transport_request.transporter_id or current_user.id != transport_request.transporter_id):
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Acesso negado")

    # Obter último ponto de localização
    last_location = db.query(LocationHistory).filter(
        LocationHistory.transport_request_id == request_id
    ).order_by(LocationHistory.recorded_at.desc()).first()

    # Obter pontos de carga
    load_points = db.query(LoadPoint).filter(
        LoadPoint.transport_request_id == request_id
    ).order_by(LoadPoint.sequence).all()

    return {
        "id": request_id,
        "status": transport_request.status,
        "current_location": {
            "latitude": float(last_location.latitude) if last_location else None,
            "longitude": float(last_location.longitude) if last_location else None,
            "speed": last_location.speed if last_location else 0,
            "direction": last_location.direction if last_location else "N",
            "timestamp": last_location.recorded_at.isoformat() if last_location else None
        },
        "eta": transport_request.estimated_arrival.isoformat() if transport_request.estimated_arrival else None,
        "distance_remaining": calculate_distance(
            float(last_location.latitude) if last_location else transport_request.origin_latitude,
            float(last_location.longitude) if last_location else transport_request.origin_longitude,
            transport_request.destination_latitude,
            transport_request.destination_longitude
        ) if last_location else transport_request.distance,
        "load_points": [
            {
                "sequence": lp.sequence,
                "status": lp.status,
                "address": lp.address,
                "scheduled_time": lp.scheduled_time.isoformat() if lp.scheduled_time else None,
                "completed_at": lp.completed_at.isoformat() if lp.completed_at else None
            }
            for lp in load_points
        ]
    }


@router.post("/requests/{request_id}/update-location")
async def update_transport_location(
    request_id: str,
    location_data: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Atualizar localização GPS do transporte
    
    POST /api/v1/transport/requests/{request_id}/update-location
    {
        "latitude": -8.8550,
        "longitude": 13.2100,
        "speed": 45,
        "direction": "NE"
    }
    """
    transport_request = db.query(TransportRequest).filter(
        TransportRequest.id == request_id
    ).first()

    if not transport_request:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    if transport_request.status not in ["em_andamento", "em_entrega"]:
        raise HTTPException(status_code=400, detail="Transporte não está em movimento")

    # Registrar localização no histórico
    location_record = LocationHistory(
        transport_request_id=request_id,
        vehicle_id=transport_request.vehicle_id,
        latitude=location_data["latitude"],
        longitude=location_data["longitude"],
        speed=location_data.get("speed", 0),
        direction=location_data.get("direction", "N")
    )

    # Atualizar localização atual do pedido
    transport_request.current_latitude = location_data["latitude"]
    transport_request.current_longitude = location_data["longitude"]
    transport_request.current_speed = location_data.get("speed", 0)
    transport_request.last_location_update = datetime.now()

    db.add(location_record)
    db.commit()

    # Enviar atualização via WebSocket
    await broadcast_location_update(request_id, location_data)

    return {"status": "updated"}


# ============================================================================
# 4. AVALIAÇÕES E COMISSÕES
# ============================================================================

@router.post("/requests/{request_id}/rate")
async def rate_transport(
    request_id: str,
    rating_data: TransportRatingCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Avaliar transporte
    """
    transport_request = db.query(TransportRequest).filter(
        TransportRequest.id == request_id
    ).first()

    if not transport_request:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    if transport_request.status != "concluido":
        raise HTTPException(status_code=400, detail="Apenas transportes concluídos podem ser avaliados")

    rating = db.query(TransportRating).filter(
        TransportRating.transport_request_id == request_id
    ).first()

    if not rating:
        rating = TransportRating(transport_request_id=request_id)
        db.add(rating)

    # Atualizar avaliação baseado em quem está avaliando
    if current_user.id == transport_request.farmer_id:
        rating.farmer_to_transporter_rating = rating_data.rating
        rating.farmer_to_transporter_criteria = rating_data.criteria
        rating.farmer_to_transporter_comment = rating_data.comment
        rating.farmer_rated_at = datetime.now()
    else:
        rating.transporter_to_farmer_rating = rating_data.rating
        rating.transporter_to_farmer_criteria = rating_data.criteria
        rating.transporter_to_farmer_comment = rating_data.comment
        rating.transporter_rated_at = datetime.now()

    db.commit()

    return {"status": "rated"}


@router.get("/requests/{request_id}/commission-details")
async def get_commission_details(
    request_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Obter detalhes da comissão
    """
    transport_request = db.query(TransportRequest).filter(
        TransportRequest.id == request_id
    ).first()

    if not transport_request:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    payment = db.query(TransportPayment).filter(
        TransportPayment.transport_request_id == request_id
    ).first()

    return {
        "total_value": float(transport_request.base_price),
        "service_fee_percentage": float(transport_request.commission_percentage),
        "service_fee_amount": float(transport_request.commission_amount),
        "transporter_receives": float(transport_request.transporter_receives),
        "payment_status": payment.payment_status if payment else "pending",
        "payment_method": payment.payment_method if payment else None,
        "expected_payout_date": (datetime.now() + timedelta(days=2)).isoformat()
    }


# ============================================================================
# 5. TRANSPORTADORES
# ============================================================================

@router.get("/transporters/nearby")
async def get_nearby_transporters(
    lat: float = Query(...),
    lng: float = Query(...),
    radius: int = Query(50),
    db: Session = Depends(get_db)
):
    """
    Buscar transportadores próximos (em raio especificado)
    
    GET /api/v1/transport/transporters/nearby?lat=-8.8383&lng=13.2344&radius=50
    """
    # Usar query com GIS para encontrar transportadores próximos
    from geoalchemy2.functions import ST_Distance, ST_Point
    
    origin = ST_Point(lng, lat, 4326)

    transporters = db.query(Transporter, Vehicle).join(
        Vehicle, Transporter.id == Vehicle.transporter_id
    ).filter(
        ST_Distance(Vehicle.current_location, origin) <= (radius * 1000),
        Transporter.is_active == True,
        Vehicle.is_available == True,
        Vehicle.capacity > Vehicle.capacity_used
    ).all()

    return [{
        "id": t[0].id,
        "name": t[0].name,
        "rating": float(t[0].rating),
        "vehicle": {
            "type": t[1].type,
            "plate": t[1].plate,
            "capacity": t[1].capacity,
            "capacity_used": t[1].capacity_used
        }
    } for t in transporters]


@router.get("/transporters/{transporter_id}/earnings")
async def get_transporter_earnings(
    transporter_id: str,
    period: str = Query("today"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Dashboard de ganhos do transportador
    
    GET /api/v1/transport/transporters/{transporter_id}/earnings?period=today
    """
    # Verificar permissões
    if current_user.role == "transporter":
        transporter = db.query(Transporter).filter(
            Transporter.user_id == current_user.id
        ).first()
        if not transporter or transporter.id != transporter_id:
            raise HTTPException(status_code=403, detail="Acesso negado")

    transporter = db.query(Transporter).filter(
        Transporter.id == transporter_id
    ).first()

    if not transporter:
        raise HTTPException(status_code=404, detail="Transportador não encontrado")

    # Calcular período
    if period == "today":
        start_date = datetime.now().date()
        end_date = start_date + timedelta(days=1)
    elif period == "week":
        start_date = datetime.now().date() - timedelta(days=7)
        end_date = datetime.now().date() + timedelta(days=1)
    elif period == "month":
        start_date = datetime.now().date() - timedelta(days=30)
        end_date = datetime.now().date() + timedelta(days=1)

    # Buscar transportes concluídos
    completed_trips = db.query(TransportRequest).filter(
        TransportRequest.transporter_id == transporter_id,
        TransportRequest.status == "concluido",
        TransportRequest.completed_at >= start_date,
        TransportRequest.completed_at < end_date
    ).all()

    total_earnings = sum(t.transporter_receives for t in completed_trips)
    avg_rating = transporter.rating

    return {
        "period": period,
        "total_earnings": float(total_earnings),
        "completed_trips": len(completed_trips),
        "average_rating": float(avg_rating),
        "total_reviews": transporter.total_reviews,
        "active_shipments": db.query(TransportRequest).filter(
            TransportRequest.transporter_id == transporter_id,
            TransportRequest.status.in_(["aceite", "em_andamento", "em_entrega"])
        ).count(),
        "capacity_utilization": calculate_capacity_utilization(db, transporter_id)
    }


# ============================================================================
# 6. WEBSOCKET PARA RASTREAMENTO REAL-TIME
# ============================================================================

@router.websocket("/ws/transport/{request_id}/{user_id}")
async def websocket_transport_tracking(
    websocket: WebSocket,
    request_id: str,
    user_id: str,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    WebSocket para rastreamento em tempo real
    
    ws://localhost:8000/ws/transport/{request_id}/{user_id}?token={token}
    """
    await websocket.accept()

    try:
        # Verificar token JWT
        current_user = verify_token(token)
        
        # Buscar transporte
        transport_request = db.query(TransportRequest).filter(
            TransportRequest.id == request_id
        ).first()

        if not transport_request:
            await websocket.send_json({"error": "Pedido não encontrado"})
            await websocket.close()
            return

        # Adicionar à lista de conexões ativas
        active_connections[request_id].append(websocket)

        while True:
            try:
                data = await websocket.receive_json()

                if data.get("type") == "location_update":
                    # Atualizar localização
                    location_record = LocationHistory(
                        transport_request_id=request_id,
                        vehicle_id=transport_request.vehicle_id,
                        latitude=data["latitude"],
                        longitude=data["longitude"],
                        speed=data.get("speed", 0),
                        direction=data.get("direction", "N")
                    )
                    db.add(location_record)
                    db.commit()

                    # Broadcast para todas as conexões
                    await broadcast_to_connection(
                        request_id,
                        {
                            "type": "location_update",
                            "data": {
                                "latitude": data["latitude"],
                                "longitude": data["longitude"],
                                "speed": data["speed"],
                                "timestamp": datetime.now().isoformat()
                            }
                        }
                    )

                elif data.get("type") == "chat_message":
                    # Salvar mensagem
                    message = TransportMessage(
                        transport_request_id=request_id,
                        sender_id=current_user.id,
                        message=data["message"]
                    )
                    db.add(message)
                    db.commit()

                    # Broadcast para ambos
                    await broadcast_to_connection(
                        request_id,
                        {
                            "type": "chat_message",
                            "data": {
                                "sender_id": current_user.id,
                                "message": data["message"],
                                "timestamp": datetime.now().isoformat()
                            }
                        }
                    )

            except Exception as e:
                print(f"Erro WebSocket: {e}")
                break

    except Exception as e:
        print(f"Erro ao conectar: {e}")
    finally:
        if request_id in active_connections:
            active_connections[request_id].remove(websocket)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def generate_transport_id() -> str:
    """Gerar ID único para transporte"""
    from datetime import datetime
    import random
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_digits = str(random.randint(1000, 9999))
    return f"TRN{timestamp}{random_digits}"[-20:]


def calculate_eta(distance: float, avg_speed: float = 50) -> datetime:
    """Calcular ETA baseado em distância"""
    hours = distance / avg_speed
    return datetime.now() + timedelta(hours=hours)


def create_load_points(request_id: str, origin: tuple, destination: tuple) -> list:
    """Criar pontos de carga para uma rota"""
    return [
        LoadPoint(
            transport_request_id=request_id,
            sequence=1,
            latitude=origin[0],
            longitude=origin[1],
            address="Origem",
            status="pending"
        ),
        LoadPoint(
            transport_request_id=request_id,
            sequence=2,
            latitude=destination[0],
            longitude=destination[1],
            address="Destino",
            status="pending"
        )
    ]


def format_transport_response(transport_request) -> dict:
    """Formatar resposta de transporte"""
    return {
        "id": transport_request.id,
        "status": transport_request.status,
        "product": transport_request.product_id,
        "quantity": float(transport_request.quantity),
        "unit": transport_request.unit,
        "origin": transport_request.origin_address,
        "destination": transport_request.destination_address,
        "distance": float(transport_request.distance),
        "price": float(transport_request.base_price),
        "commission": {
            "percentage": float(transport_request.commission_percentage),
            "amount": float(transport_request.commission_amount),
            "for_transporter": float(transport_request.transporter_receives)
        },
        "created_at": transport_request.created_at.isoformat(),
        "scheduled_date": transport_request.scheduled_date.isoformat()
    }


def format_transporter_response(transporter) -> dict:
    """Formatar resposta de transportador"""
    return {
        "id": transporter.id,
        "name": transporter.name,
        "rating": float(transporter.rating),
        "reviews": transporter.total_reviews,
        "phone": transporter.phone,
        "is_verified": transporter.is_verified
    }


async def notify_nearby_transporters(request_id: str, distance: float):
    """Notificar transportadores próximos sobre novo pedido"""
    # Implementar notificação
    pass


async def broadcast_location_update(request_id: str, location_data: dict):
    """Enviar atualização de localização via WebSocket"""
    # Implementar broadcast
    pass


async def broadcast_to_connection(request_id: str, message: dict):
    """Broadcast para todas as conexões de um pedido"""
    # Implementar broadcast
    pass


# Dicionário global para conexões WebSocket ativas
active_connections = defaultdict(list)
