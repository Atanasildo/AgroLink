import uuid
from datetime import date
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.transport_request import TransportRequest, TransportStatus
from app.models.transport_route import TransportRoute
from app.models.vehicle import Vehicle
from app.schemas.transport import (
    TransportRequestCreate,
    TransportRequestLocationUpdate,
    TransportRouteCreate,
    TransportRouteUpdate,
)


# ---------- Rotas ----------

def create_route(db: Session, route_in: TransportRouteCreate, transportador_id: uuid.UUID) -> TransportRoute:
    vehicle: Vehicle | None = db.query(Vehicle).filter(Vehicle.id == route_in.veiculo_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Veículo não encontrado")
    if vehicle.proprietario_id != transportador_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Veículo não pertence a este transportador")

    db_route = TransportRoute(
        veiculo_id=vehicle.id,
        transportador_id=transportador_id,
        origem=route_in.origem,
        destino=route_in.destino,
        data=route_in.data,
        preco_por_tonelada=route_in.preco_por_tonelada,
        capacidade_total_toneladas=vehicle.capacidade_toneladas,
        capacidade_disponivel_toneladas=vehicle.capacidade_toneladas,
    )
    db.add(db_route)
    db.commit()
    db.refresh(db_route)
    return db_route


def get_route(db: Session, route_id: uuid.UUID) -> TransportRoute | None:
    return db.query(TransportRoute).filter(TransportRoute.id == route_id).first()


def update_route(db: Session, db_route: TransportRoute, route_in: TransportRouteUpdate) -> TransportRoute:
    """Edita data e/ou preço por tonelada de uma rota já publicada."""
    update_data = route_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_route, field, value)
    db.add(db_route)
    db.commit()
    db.refresh(db_route)
    return db_route


def delete_route(db: Session, db_route: TransportRoute) -> None:
    """Remove uma rota publicada.

    Bloqueado se já existir alguma solicitação associada (mesmo cancelada):
    a relação TransportRoute.solicitacoes usa cascade="all, delete-orphan",
    o que apagaria esse histórico (incluindo transportes já concluídos e a
    ligação aos pagamentos) junto com a rota. Mais seguro recusar e deixar o
    transportador editar o preço/data, ou simplesmente deixar a rota "expirar".
    """
    tem_solicitacoes = (
        db.query(TransportRequest).filter(TransportRequest.rota_id == db_route.id).count() > 0
    )
    if tem_solicitacoes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Não é possível remover esta rota porque já tem solicitações associadas "
                "(isso apagaria esse histórico). Podes editar a data/preço, ou aguardar "
                "que a data da rota passe."
            ),
        )
    db.delete(db_route)
    db.commit()


def search_routes(
    db: Session,
    origem: str | None = None,
    destino: str | None = None,
    data: date | None = None,
    peso_minimo_disponivel: Decimal | None = None,
) -> list[TransportRoute]:
    """Encontra transportadores/rotas próximos disponíveis para uma solicitação."""
    query = db.query(TransportRoute)

    if origem:
        query = query.filter(TransportRoute.origem.ilike(f"%{origem}%"))
    if destino:
        query = query.filter(TransportRoute.destino.ilike(f"%{destino}%"))
    if data:
        query = query.filter(TransportRoute.data == data)
    if peso_minimo_disponivel is not None:
        query = query.filter(TransportRoute.capacidade_disponivel_toneladas >= peso_minimo_disponivel)

    return query.order_by(TransportRoute.data.asc()).all()


# ---------- Solicitações de Transporte ----------

def create_transport_request(
    db: Session, request_in: TransportRequestCreate, agricultor_id: uuid.UUID
) -> TransportRequest:
    rota = None
    if request_in.rota_id:
        rota = get_route(db, request_in.rota_id)
        if not rota:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rota não encontrada")
        if rota.capacidade_disponivel_toneladas < request_in.peso_toneladas:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Capacidade disponível insuficiente nesta rota para o peso solicitado",
            )

    db_request = TransportRequest(
        agricultor_id=agricultor_id,
        rota_id=request_in.rota_id,
        produto=request_in.produto,
        peso_toneladas=request_in.peso_toneladas,
        origem=request_in.origem,
        destino=request_in.destino,
        data=request_in.data,
        observacoes=request_in.observacoes,
        status=TransportStatus.PENDENTE,
    )

    # Se associado a uma rota, já calcula o valor estimado com base no preço por tonelada
    if rota:
        db_request.valor_total = (rota.preco_por_tonelada * request_in.peso_toneladas).quantize(Decimal("0.01"))

    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request


def get_transport_request(db: Session, request_id: uuid.UUID) -> TransportRequest | None:
    return db.query(TransportRequest).filter(TransportRequest.id == request_id).first()


def list_my_transport_requests(db: Session, agricultor_id: uuid.UUID) -> list[TransportRequest]:
    return (
        db.query(TransportRequest)
        .filter(TransportRequest.agricultor_id == agricultor_id)
        .order_by(TransportRequest.criado_em.desc())
        .all()
    )


def _calculate_commission(valor_total: Decimal) -> tuple[Decimal, Decimal, Decimal]:
    """Calcula comissão da plataforma e valor líquido para o transportador."""
    percentual = Decimal(str(settings.TRANSPORT_COMMISSION_PERCENT))
    comissao = (valor_total * percentual / Decimal("100")).quantize(Decimal("0.01"))
    liquido = (valor_total - comissao).quantize(Decimal("0.01"))
    return percentual, comissao, liquido


def accept_transport_request(
    db: Session, db_request: TransportRequest, transportador_id: uuid.UUID
) -> TransportRequest:
    """Transportador aceita o pedido. Calcula comissão automaticamente e reserva
    capacidade na rota (compartilhamento de carga)."""
    if db_request.status != TransportStatus.PENDENTE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Solicitação não está pendente")

    if db_request.rota_id:
        rota = get_route(db, db_request.rota_id)
        if not rota:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rota não encontrada")
        if rota.transportador_id != transportador_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Esta rota não pertence a este transportador")
        if rota.capacidade_disponivel_toneladas < db_request.peso_toneladas:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Capacidade disponível insuficiente nesta rota",
            )

        # Reserva a capacidade (compartilhamento de carga entre vários agricultores)
        rota.capacidade_disponivel_toneladas -= db_request.peso_toneladas
        db.add(rota)

        if db_request.valor_total is None:
            db_request.valor_total = (rota.preco_por_tonelada * db_request.peso_toneladas).quantize(Decimal("0.01"))

    if db_request.valor_total is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valor do transporte não definido. Associe a uma rota com preço por tonelada.",
        )

    percentual, comissao, liquido = _calculate_commission(db_request.valor_total)
    db_request.comissao_percentual = percentual
    db_request.valor_comissao = comissao
    db_request.valor_liquido_transportador = liquido
    db_request.status = TransportStatus.ACEITE

    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request


def update_transport_request_status(
    db: Session, db_request: TransportRequest, new_status: TransportStatus
) -> TransportRequest:
    """Atualiza o status do transporte (em_andamento, concluido, cancelado)."""
    valid_transitions: dict[TransportStatus, set[TransportStatus]] = {
        TransportStatus.PENDENTE: {TransportStatus.ACEITE, TransportStatus.CANCELADO},
        TransportStatus.ACEITE: {TransportStatus.EM_ANDAMENTO, TransportStatus.CANCELADO},
        TransportStatus.EM_ANDAMENTO: {TransportStatus.CONCLUIDO, TransportStatus.CANCELADO},
        TransportStatus.CONCLUIDO: set(),
        TransportStatus.CANCELADO: set(),
    }

    if new_status not in valid_transitions.get(db_request.status, set()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transição de status inválida: {db_request.status.value} -> {new_status.value}",
        )

    # Se cancelado após aceite, devolve a capacidade reservada na rota
    if new_status == TransportStatus.CANCELADO and db_request.status == TransportStatus.ACEITE and db_request.rota_id:
        rota = get_route(db, db_request.rota_id)
        if rota:
            rota.capacidade_disponivel_toneladas += db_request.peso_toneladas
            db.add(rota)

    db_request.status = new_status
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request


def update_transport_location(
    db: Session, db_request: TransportRequest, location_in: TransportRequestLocationUpdate
) -> TransportRequest:
    """Atualiza a localização GPS em tempo real e a hora prevista de chegada."""
    db_request.latitude_atual = location_in.latitude_atual
    db_request.longitude_atual = location_in.longitude_atual
    if location_in.hora_prevista_chegada:
        db_request.hora_prevista_chegada = location_in.hora_prevista_chegada
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request


def list_my_routes(db: Session, transportador_id: uuid.UUID) -> list[TransportRoute]:
    return (
        db.query(TransportRoute)
        .filter(TransportRoute.transportador_id == transportador_id)
        .order_by(TransportRoute.data.desc())
        .all()
    )


def list_incoming_requests(db: Session, transportador_id: uuid.UUID) -> list[TransportRequest]:
    """Solicitações recebidas pelo transportador (via rotas que lhe pertencem)."""
    return (
        db.query(TransportRequest)
        .join(TransportRoute, TransportRequest.rota_id == TransportRoute.id)
        .filter(TransportRoute.transportador_id == transportador_id)
        .order_by(TransportRequest.criado_em.desc())
        .all()
    )
