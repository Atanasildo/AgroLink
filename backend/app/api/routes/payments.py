import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.crud.payment import create_payment, get_payment, list_payments_for_user, update_payment_status
from app.models.payment import PaymentStatus
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentRead

router = APIRouter(prefix="/payments", tags=["Pagamentos"])


@router.post("/", response_model=PaymentRead, status_code=status.HTTP_201_CREATED)
def initiate_payment(
    payment_in: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Registar um pagamento."""
    return create_payment(db, payment_in, utilizador_id=current_user.id)


@router.get("/me", response_model=list[PaymentRead])
def my_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Pagamentos do utilizador autenticado."""
    return list_payments_for_user(db, current_user.id)


@router.get("/{payment_id}", response_model=PaymentRead)
def get_payment_detail(
    payment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = get_payment(db, payment_id)
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pagamento não encontrado")
    if payment.utilizador_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")
    return payment
