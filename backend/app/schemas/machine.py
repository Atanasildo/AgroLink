import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.machine import MachineRentalStatus, MachineType


class MachineBase(BaseModel):
    nome: str = Field(min_length=2, max_length=150)
    descricao: str | None = Field(default=None, max_length=1000)
    tipo: MachineType
    # API aceita valor_diario mas armazena como preco_diaria na BD
    valor_diario: Decimal = Field(gt=0)
    provincia: str | None = None
    municipio: str | None = None


class MachineCreate(MachineBase):
    pass


class MachineUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=150)
    descricao: str | None = Field(default=None, max_length=1000)
    tipo: MachineType | None = None
    valor_diario: Decimal | None = Field(default=None, gt=0)
    provincia: str | None = None
    municipio: str | None = None
    disponivel: bool | None = None


from pydantic import BaseModel, ConfigDict, Field, model_validator, field_serializer


class MachineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    proprietario_id: uuid.UUID
    nome: str
    descricao: str | None = None
    tipo: MachineType
    preco_diaria: Decimal = Field(alias="valor_diario")  # Mapeia BD → API
    provincia: str | None = None
    municipio: str | None = None
    disponivel: bool
    criado_em: datetime

    @field_serializer("preco_diaria", when_used="json-unless-none")
    def serialize_preco(self, value: Decimal) -> str:
        return str(value)


# ---------- Reservas ----------

class MachineRentalCreate(BaseModel):
    data_inicio: date
    data_fim: date

    @model_validator(mode="after")
    def validate_dates(self) -> "MachineRentalCreate":
        if self.data_fim < self.data_inicio:
            raise ValueError("data_fim não pode ser anterior a data_inicio")
        return self


class MachineRentalUpdateStatus(BaseModel):
    status: MachineRentalStatus


class MachineRentalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    maquina_id: uuid.UUID
    locatario_id: uuid.UUID
    data_inicio: date
    data_fim: date
    status: MachineRentalStatus
    valor_total: Decimal | None = None
    comissao_percentual: Decimal | None = None
    valor_comissao: Decimal | None = None
    criado_em: datetime
