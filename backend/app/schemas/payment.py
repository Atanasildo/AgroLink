import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.payment import PaymentStatus, PaymentType


class PaymentCreate(BaseModel):
    tipo: PaymentType
    referencia_id: uuid.UUID | None = None
    valor: Decimal = Field(gt=0)
    referencia_externa: str | None = Field(default=None, max_length=200)


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    utilizador_id: uuid.UUID
    referencia_id: uuid.UUID | None = None
    tipo: PaymentType
    valor: Decimal
    status: PaymentStatus
    referencia_externa: str | None = None
    entidade: str | None = None
    referencia: str | None = None
    validade: date | None = None
    criado_em: datetime
