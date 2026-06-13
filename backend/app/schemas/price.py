import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.price import CommodityType


class PriceRecordCreate(BaseModel):
    produto: CommodityType
    provincia: str = Field(max_length=100)
    preco_kg: Decimal = Field(gt=0)
    fonte: str | None = Field(default=None, max_length=200)


class PriceRecordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    produto: CommodityType
    provincia: str
    preco_kg: Decimal
    fonte: str | None = None
    criado_em: datetime


class RegionPriceComparison(BaseModel):
    provincia: str
    preco_kg: Decimal
