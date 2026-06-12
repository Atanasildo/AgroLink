import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.payment import PaymentStatus, PaymentType


class PaymentCreate(BaseModel):
    tipo: PaymentType
    transacao_id: uuid.UUID
    recebedor_id: uuid.UUID
    valor_total: Decimal = Field(gt=0)
    comissao: Decimal = Field(ge=0)
    metodo_pagamento: str | None = Field(default=None, max_length=50)
    referencia_externa: str | None = Field(default=None, max_length=150)


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tipo: PaymentType
    transacao_id: uuid.UUID
    pagador_id: uuid.UUID
    recebedor_id: uuid.UUID
    valor_total: Decimal
    comissao: Decimal
    valor_liquido: Decimal
    status_pagamento: PaymentStatus
    metodo_pagamento: str | None = None
    referencia_externa: str | None = None
    criado_em: datetime
