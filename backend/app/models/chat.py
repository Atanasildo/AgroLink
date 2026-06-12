import enum
import uuid

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class MessageType(str, enum.Enum):
    TEXTO = "texto"
    IMAGEM = "imagem"
    LOCALIZACAO = "localizacao"


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    remetente_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    destinatario_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    tipo = Column(Enum(MessageType, values_callable=lambda x: [e.value for e in x]), nullable=False, default=MessageType.TEXTO)

    conteudo = Column(String(2000), nullable=True)  # texto da mensagem
    imagem_url = Column(String(500), nullable=True)

    latitude = Column(Numeric(10, 6), nullable=True)
    longitude = Column(Numeric(10, 6), nullable=True)

    lida = Column(Boolean, default=False, nullable=False)

    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    remetente = relationship("User", foreign_keys=[remetente_id])
    destinatario = relationship("User", foreign_keys=[destinatario_id])
