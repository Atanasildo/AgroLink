import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.crud.payment import (
    confirm_payment,
    create_payment,
    get_payment,
    list_payments_for_user,
    refund_payment,
    release_payment,
)
from app.models.user import User, UserRole
from app.schemas.payment import PaymentCreate, PaymentRead

router = APIRouter(prefix="/payments", tags=["Pagamentos"])


@router.post("/", response_model=PaymentRead, status_code=status.HTTP_201_CREATED)
def initiate_payment(
    payment_in: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Iniciar o registo de pagamento de uma transação (transporte, máquina
    ou serviço futuro). O valor líquido é calculado automaticamente
    (valor_total - comissão)."""
    return create_payment(db, payment_in, pagador_id=current_user.id)


@router.get("/me", response_model=list[PaymentRead])
def my_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Listar pagamentos feitos ou recebidos pelo utilizador autenticado."""
    return list_payments_for_user(db, current_user.id)


@router.post("/{payment_id}/confirm", response_model=PaymentRead)
def confirm(
    payment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cliente paga: a plataforma confirma o pagamento e retém o valor."""
    payment = get_payment(db, payment_id)
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pagamento não encontrado")
    if payment.pagador_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")
    return confirm_payment(db, payment)


@router.post("/{payment_id}/release", response_model=PaymentRead)
def release(
    payment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """Sistema libera o saldo (valor líquido) ao prestador do serviço (apenas admin)."""
    payment = get_payment(db, payment_id)
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pagamento não encontrado")
    return release_payment(db, payment)


@router.post("/{payment_id}/refund", response_model=PaymentRead)
def refund(
    payment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """Reembolsar um pagamento (apenas admin)."""
    payment = get_payment(db, payment_id)
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pagamento não encontrado")
    return refund_payment(db, payment)
