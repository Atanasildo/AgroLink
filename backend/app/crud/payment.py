import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.payment import Payment, PaymentStatus
from app.schemas.payment import PaymentCreate


def create_payment(db: Session, payment_in: PaymentCreate, utilizador_id: uuid.UUID) -> Payment:
    db_payment = Payment(
        **payment_in.model_dump(),
        utilizador_id=utilizador_id,
        status=PaymentStatus.PENDENTE,
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment


def get_payment(db: Session, payment_id: uuid.UUID) -> Payment | None:
    return db.query(Payment).filter(Payment.id == payment_id).first()


def list_payments_for_user(db: Session, utilizador_id: uuid.UUID) -> list[Payment]:
    return (
        db.query(Payment)
        .filter(Payment.utilizador_id == utilizador_id)
        .order_by(Payment.criado_em.desc())
        .all()
    )


def update_payment_status(db: Session, payment: Payment, new_status: PaymentStatus) -> Payment:
    payment.status = new_status
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment
