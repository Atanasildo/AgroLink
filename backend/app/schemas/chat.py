import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.chat import MessageType


class ChatMessageCreate(BaseModel):
    destinatario_id: uuid.UUID
    tipo: MessageType = MessageType.TEXTO
    conteudo: str | None = Field(default=None, max_length=2000)
    imagem_url: str | None = None
    latitude: Decimal | None = None
    longitude: Decimal | None = None


class ChatMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    remetente_id: uuid.UUID
    destinatario_id: uuid.UUID
    tipo: MessageType
    conteudo: str | None = None
    imagem_url: str | None = None
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    lida: bool
    criado_em: datetime


class ConversationSummary(BaseModel):
    """Resumo de uma conversa com outro utilizador."""

    model_config = ConfigDict(from_attributes=True)

    outro_utilizador_id: uuid.UUID
    ultima_mensagem: ChatMessageRead | None = None
    mensagens_nao_lidas: int
