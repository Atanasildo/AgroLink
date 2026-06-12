import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.payment import Payment, PaymentStatus
from app.schemas.payment import PaymentCreate


def create_payment(db: Session, payment_in: PaymentCreate, pagador_id: uuid.UUID) -> Payment:
    valor_liquido = payment_in.valor_total - payment_in.comissao
    db_payment = Payment(
        **payment_in.model_dump(),
        pagador_id=pagador_id,
        valor_liquido=valor_liquido,
        status_pagamento=PaymentStatus.PENDENTE,
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment


def get_payment(db: Session, payment_id: uuid.UUID) -> Payment | None:
    return db.query(Payment).filter(Payment.id == payment_id).first()


def list_payments_for_user(db: Session, user_id: uuid.UUID) -> list[Payment]:
    return (
        db.query(Payment)
        .filter((Payment.pagador_id == user_id) | (Payment.recebedor_id == user_id))
        .order_by(Payment.criado_em.desc())
        .all()
    )


def confirm_payment(db: Session, db_payment: Payment) -> Payment:
    """Cliente paga: a plataforma confirma o recebimento e retém o valor
    (incluindo a comissão) até a liberação ao prestador."""
    if db_payment.status_pagamento != PaymentStatus.PENDENTE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pagamento não está pendente")
    db_payment.status_pagamento = PaymentStatus.RETIDO
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment


def release_payment(db: Session, db_payment: Payment) -> Payment:
    """Sistema libera o saldo (valor líquido, já descontada a comissão) ao prestador."""
    if db_payment.status_pagamento != PaymentStatus.RETIDO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pagamento precisa estar retido para ser liberado",
        )
    db_payment.status_pagamento = PaymentStatus.LIBERADO
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment


def refund_payment(db: Session, db_payment: Payment) -> Payment:
    if db_payment.status_pagamento not in (PaymentStatus.PENDENTE, PaymentStatus.RETIDO):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pagamento não pode ser reembolsado")
    db_payment.status_pagamento = PaymentStatus.REEMBOLSADO
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment
