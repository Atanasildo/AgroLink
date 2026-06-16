import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.database import Base


class VerificationChannel(str, enum.Enum):
    EMAIL = "email"
    TELEFONE = "telefone"


class VerificationCode(Base):
    """Código OTP para verificação de email ou telefone."""

    __tablename__ = "verification_codes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    utilizador_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    canal = Column(Enum(VerificationChannel, values_callable=lambda x: [e.value for e in x]), nullable=False)
    destino = Column(String(255), nullable=False)
    codigo_hash = Column(String(128), nullable=False)
    tentativas = Column(Integer, nullable=False, default=0)
    usado = Column(Integer, nullable=False, default=0)
    expira_em = Column(DateTime(timezone=True), nullable=False)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
