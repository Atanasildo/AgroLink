import enum
import uuid

from sqlalchemy import Column, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class ReportReason(str, enum.Enum):
    FRAUDE = "fraude"
    PRODUTO_FALSO = "produto_falso"
    COMPORTAMENTO_ABUSIVO = "comportamento_abusivo"
    SPAM = "spam"
    OUTRO = "outro"


class Report(Base):
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    denunciante_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    denunciado_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    motivo = Column(Enum(ReportReason, values_callable=lambda x: [e.value for e in x]), nullable=False)
    descricao = Column(String(1000), nullable=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    denunciante = relationship("User", foreign_keys=[denunciante_id])
    denunciado = relationship("User", foreign_keys=[denunciado_id])
