import enum
import uuid

from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class PaymentType(str, enum.Enum):
    TRANSPORTE = "transporte"
    ALUGUEL_MAQUINA = "aluguel_maquina"
    COMISSAO = "comissao"


class PaymentStatus(str, enum.Enum):
    PENDENTE = "pendente"
    PAGO = "pago"
    FALHADO = "falhado"
    REEMBOLSADO = "reembolsado"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    utilizador_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    referencia_id = Column(UUID(as_uuid=True), nullable=True)

    tipo = Column(Enum(PaymentType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    valor = Column(Numeric(14, 2), nullable=False)
    status = Column(
        Enum(PaymentStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=PaymentStatus.PENDENTE,
    )
    
    # Referência do gateway de pagamento (ProxyPay/Multicaixa EMIS)
    referencia_externa = Column(String(200), nullable=True)  # transaction_id do ProxyPay
    gateway_ref = Column(String(200), nullable=True)  # ID único da transação no gateway

    # Referência Multicaixa estilo RPS (entidade + referência), usada no fluxo
    # de pagamento por referência (real ou simulado em sandbox).
    entidade = Column(String(10), nullable=True)
    referencia = Column(String(20), nullable=True)
    validade = Column(Date, nullable=True)
    
    # Comissão da plataforma (retida quando pagamento é confirmado)
    comissao_percent = Column(Numeric(5, 2), nullable=True, default=0)
    comissao_valor = Column(Numeric(14, 2), nullable=True)
    
    # Valor líquido para o prestador (valor - comissão)
    valor_liquido = Column(Numeric(14, 2), nullable=True)
    
    # Saldo do prestador (atualizado quando pagamento é confirmado)
    saldo_prestador_atualizado = Column(String(1), nullable=False, default='0')  # '0' = não, '1' = sim

    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    pago_em = Column(DateTime(timezone=True), nullable=True)  # Data quando status = pago

    utilizador = relationship("User", foreign_keys=[utilizador_id])