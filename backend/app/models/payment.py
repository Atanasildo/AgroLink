import enum
import uuid

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.database import Base


class PaymentType(str, enum.Enum):
    TRANSPORTE = "transporte"
    MAQUINA = "maquina"
    SERVICO_FUTURO = "servico_futuro"


class PaymentStatus(str, enum.Enum):
    PENDENTE = "pendente"
    RETIDO = "retido"  # cliente pagou, plataforma retém o valor
    LIBERADO = "liberado"  # saldo liberado ao prestador (descontada a comissão)
    CANCELADO = "cancelado"
    REEMBOLSADO = "reembolsado"


class Payment(Base):
    """Registo de pagamento de uma transação (transporte, aluguel de
    máquina ou serviços futuros).

    Todas as transações passam pela plataforma: o cliente paga, o sistema
    retém a comissão, e o sistema libera o saldo ao prestador do serviço.
    """

    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    tipo = Column(Enum(PaymentType), nullable=False, index=True)
    transacao_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    pagador_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    recebedor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    valor_total = Column(Numeric(12, 2), nullable=False)
    comissao = Column(Numeric(12, 2), nullable=False)
    valor_liquido = Column(Numeric(12, 2), nullable=False)

    status_pagamento = Column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.PENDENTE)

    metodo_pagamento = Column(String(50), nullable=True)
    referencia_externa = Column(String(150), nullable=True)

    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), onupdate=func.now())
