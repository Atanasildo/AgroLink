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
