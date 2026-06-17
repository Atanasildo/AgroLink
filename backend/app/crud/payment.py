import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.models.payment import Payment, PaymentStatus, PaymentType
from app.schemas.payment import PaymentCreate
from app.utils.mock_payment_gateway import gerar_referencia_simulada


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


def get_payment_by_referencia_id(db: Session, referencia_id: uuid.UUID) -> Payment | None:
    """Devolve o pagamento mais recente associado a uma entidade (ex: solicitação de transporte)."""
    return (
        db.query(Payment)
        .filter(Payment.referencia_id == referencia_id)
        .order_by(Payment.criado_em.desc())
        .first()
    )


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


def create_or_get_transport_payment(
    db: Session,
    transport_request,
    agricultor_id: uuid.UUID,
    comissao_percent: Decimal | None = None,
) -> Payment:
    """Garante que existe um pagamento com referência Multicaixa (sandbox) para
    uma solicitação de transporte.

    Idempotente: se já existir um pagamento para esta solicitação, devolve-o
    em vez de gerar uma nova referência.
    """
    existing = get_payment_by_referencia_id(db, transport_request.id)
    if existing:
        return existing

    if transport_request.valor_total is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível gerar referência de pagamento sem valor definido para o transporte.",
        )

    ref = gerar_referencia_simulada(transport_request.valor_total)

    db_payment = Payment(
        utilizador_id=agricultor_id,
        referencia_id=transport_request.id,
        tipo=PaymentType.TRANSPORTE,
        valor=ref["valor"],
        entidade=ref["entidade"],
        referencia=ref["referencia"],
        validade=ref["validade"],
        comissao_percent=comissao_percent,
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment


def simulate_payment_confirmation(db: Session, payment: Payment) -> Payment:
    """[SANDBOX] Marca um pagamento como pago, simulando a confirmação que
    normalmente chegaria via webhook do gateway real."""
    if payment.status == PaymentStatus.PAGO:
        return payment

    payment.status = PaymentStatus.PAGO
    payment.gateway_ref = f"SANDBOX-{payment.referencia}"
    payment.pago_em = func.now()

    if payment.comissao_percent:
        comissao = Decimal(str(payment.valor)) * (Decimal(str(payment.comissao_percent)) / Decimal("100"))
        payment.comissao_valor = comissao.quantize(Decimal("0.01"))
        payment.valor_liquido = (Decimal(str(payment.valor)) - comissao).quantize(Decimal("0.01"))
    else:
        payment.valor_liquido = payment.valor

    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment

