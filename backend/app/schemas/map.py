import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.map import MapEntityType


class MapLocationCreate(BaseModel):
    tipo: MapEntityType
    referencia_id: uuid.UUID | None = None
    nome: str = Field(max_length=150)
    descricao: str | None = Field(default=None, max_length=500)
    latitude: Decimal = Field(ge=-90, le=90)
    longitude: Decimal = Field(ge=-180, le=180)
    provincia: str | None = None
    municipio: str | None = None


class MapLocationRead(MapLocationCreate):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    utilizador_id: uuid.UUID | None = None
    criado_em: datetime
