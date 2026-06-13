import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RatingCreate(BaseModel):
    avaliado_id: uuid.UUID
    # API aceita nota; BD armazena como pontuacao
    nota: int = Field(ge=1, le=5)
    comentario: str | None = Field(default=None, max_length=1000)


class RatingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    avaliador_id: uuid.UUID
    avaliado_id: uuid.UUID
    nota: int  # mapeado de pontuacao
    comentario: str | None = None
    criado_em: datetime

    @classmethod
    def model_validate(cls, obj, **kwargs):  # type: ignore[override]
        if hasattr(obj, "pontuacao") and not hasattr(obj, "nota"):
            obj.__dict__["nota"] = obj.pontuacao
        return super().model_validate(obj, **kwargs)


class UserRatingSummary(BaseModel):
    media_geral: float
    total_avaliacoes: int
