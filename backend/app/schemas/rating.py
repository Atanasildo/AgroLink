import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RatingCreate(BaseModel):
    avaliado_id: uuid.UUID
    nota: int = Field(ge=1, le=5)
    confianca: int | None = Field(default=None, ge=1, le=5)
    qualidade: int | None = Field(default=None, ge=1, le=5)
    pontualidade: int | None = Field(default=None, ge=1, le=5)
    atendimento: int | None = Field(default=None, ge=1, le=5)
    comentario: str | None = Field(default=None, max_length=1000)
    transacao_tipo: str | None = Field(default=None, max_length=50)
    transacao_id: uuid.UUID | None = None


class RatingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    avaliador_id: uuid.UUID
    avaliado_id: uuid.UUID
    nota: int
    confianca: int | None = None
    qualidade: int | None = None
    pontualidade: int | None = None
    atendimento: int | None = None
    comentario: str | None = None
    transacao_tipo: str | None = None
    transacao_id: uuid.UUID | None = None
    criado_em: datetime


class UserRatingSummary(BaseModel):
    """Resumo das avaliações recebidas por um utilizador."""

    media_geral: float
    total_avaliacoes: int
