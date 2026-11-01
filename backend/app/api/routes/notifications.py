"""
Endpoint de notificações in-app para o utilizador autenticado.

GET /notifications — retorna contagens e itens pendentes relevantes:
  - Reservas de máquinas pendentes de aprovação (proprietário)
  - Pedidos de transporte pendentes de aceitação (transportador)
  - Transporte em andamento do agricultor
  - Avaliações por fazer (após transporte ou aluguel concluído)
"""

import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.machine import MachineRental, MachineRentalStatus
from app.models.transport_request import TransportRequest
from app.models.user import User, UserRole

router = APIRouter(prefix="/notifications", tags=["Notificações"])


@router.get("/")
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Retorna contagens de itens que precisam de atenção do utilizador autenticado."""

    items = []
    total = 0

    if current_user.role == UserRole.PROPRIETARIO_MAQUINAS:
        # Reservas pendentes de aprovação
        pending = (
            db.query(MachineRental)
            .join(MachineRental.maquina)
            .filter(
                MachineRental.maquina.has(proprietario_id=current_user.id),
                MachineRental.status == MachineRentalStatus.PENDENTE,
            )
            .count()
        )
        if pending:
            items.append({"tipo": "maquina_pendente", "count": pending,
                          "label": f"{pending} reserva{'s' if pending > 1 else ''} pendente{'s' if pending > 1 else ''} de aprovação",
                          "href": "/maquinas"})
            total += pending

    if current_user.role == UserRole.TRANSPORTADOR:
        # Pedidos de transporte pendentes de aceitação
        from app.models.transport_request import TransportRequest
        pending_t = (
            db.query(TransportRequest)
            .filter(
                TransportRequest.status == "pendente",
                TransportRequest.transportador_id == current_user.id,
            )
            .count()
        )
        # Pedidos na rota do transportador (status pendente, sem transportador_id)
        incoming = (
            db.query(TransportRequest)
            .filter(
                TransportRequest.status == "pendente",
                TransportRequest.transportador_id.is_(None),
            )
            .count()
        )
        if pending_t or incoming:
            count = pending_t + incoming
            items.append({"tipo": "transporte_pendente", "count": count,
                          "label": f"{count} pedido{'s' if count > 1 else ''} de transporte para processar",
                          "href": "/transporte"})
            total += count

    if current_user.role == UserRole.AGRICULTOR:
        # Transportes em andamento
        from app.models.transport_request import TransportRequest
        active = (
            db.query(TransportRequest)
            .filter(
                TransportRequest.agricultor_id == current_user.id,
                TransportRequest.status.in_(["aceite", "em_andamento"]),
            )
            .count()
        )
        if active:
            items.append({"tipo": "transporte_ativo", "count": active,
                          "label": f"{active} transporte{'s' if active > 1 else ''} em andamento",
                          "href": "/transporte"})
            total += active

        # Aluguéis confirmados (locatário)
        active_r = (
            db.query(MachineRental)
            .filter(
                MachineRental.locatario_id == current_user.id,
                MachineRental.status.in_(["confirmado", "em_andamento"]),
            )
            .count()
        )
        if active_r:
            items.append({"tipo": "aluguel_ativo", "count": active_r,
                          "label": f"{active_r} aluguel{'is' if active_r > 1 else ''} confirmado{'s' if active_r > 1 else ''}",
                          "href": "/maquinas"})
            total += active_r

    return {"total": total, "items": items}
