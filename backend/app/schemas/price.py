import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.price import CommodityType


class PriceRecordCreate(BaseModel):
    produto: CommodityType
    provincia: str = Field(max_length=100)
    municipio: str | None = Field(default=None, max_length=100)
    preco_medio: Decimal = Field(gt=0)
    unidade: str = Field(default="kg", max_length=20)
    data_referencia: date


class PriceRecordRead(PriceRecordCreate):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    criado_em: datetime


class PriceTrendPoint(BaseModel):
    data_referencia: date
    preco_medio: Decimal


class RegionPriceComparison(BaseModel):
    provincia: str
    preco_medio: Decimal
