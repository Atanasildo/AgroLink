import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.chat import MessageType


class ChatMessageCreate(BaseModel):
    destinatario_id: uuid.UUID
    conteudo: str = Field(max_length=2000)
    tipo: MessageType = MessageType.TEXTO


class ChatMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    remetente_id: uuid.UUID
    destinatario_id: uuid.UUID
    conteudo: str
    tipo: MessageType
    lido: bool
    criado_em: datetime


class ConversationSummary(BaseModel):
    """Resumo de uma conversa com contagem de mensagens não lidas."""
    outro_utilizador_id: uuid.UUID
    ultima_mensagem: ChatMessageRead | None = None
    mensagens_nao_lidas: int = 0
