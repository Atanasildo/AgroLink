import enum
import uuid

from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class TransportStatus(str, enum.Enum):
    PENDENTE = "pendente"
    ACEITE = "aceite"
    EM_ANDAMENTO = "em_andamento"
    CONCLUIDO = "concluido"
    CANCELADO = "cancelado"


class TransportRequest(Base):
    """Solicitação de transporte feita por um agricultor.

    Pode estar associada a uma rota existente (compartilhamento de carga)
    ou ser uma solicitação independente que ainda aguarda um transportador.
    """

    __tablename__ = "transport_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    agricultor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    rota_id = Column(UUID(as_uuid=True), ForeignKey("transport_routes.id"), nullable=True)

    produto = Column(String(150), nullable=False)
    peso_toneladas = Column(Numeric(10, 2), nullable=False)

    origem = Column(String(150), nullable=False)
    destino = Column(String(150), nullable=False)
    data = Column(Date, nullable=False)
    observacoes = Column(String(1000), nullable=True)

    status = Column(Enum(TransportStatus), nullable=False, default=TransportStatus.PENDENTE)

    # Valores financeiros calculados automaticamente ao aceitar/concluir
    valor_total = Column(Numeric(12, 2), nullable=True)
    comissao_percentual = Column(Numeric(5, 2), nullable=True)
    valor_comissao = Column(Numeric(12, 2), nullable=True)
    valor_liquido_transportador = Column(Numeric(12, 2), nullable=True)

    # GPS / Rastreamento
    latitude_atual = Column(Numeric(10, 6), nullable=True)
    longitude_atual = Column(Numeric(10, 6), nullable=True)
    hora_prevista_chegada = Column(DateTime(timezone=True), nullable=True)

    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), onupdate=func.now())

    agricultor = relationship("User", foreign_keys=[agricultor_id])
    rota = relationship("TransportRoute", back_populates="solicitacoes")
