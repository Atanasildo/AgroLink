import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.machine import MachineRentalStatus, MachineType


class MachineBase(BaseModel):
    nome: str = Field(min_length=2, max_length=150)
    descricao: str | None = Field(default=None, max_length=1000)
    tipo: MachineType
    preco_diaria: float = Field(gt=0)  # Simples float
    provincia: str | None = None
    municipio: str | None = None


class MachineCreate(MachineBase):
    pass


class MachineUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=150)
    descricao: str | None = Field(default=None, max_length=1000)
    tipo: MachineType | None = None
    preco_diaria: float | None = Field(default=None, gt=0)
    provincia: str | None = None
    municipio: str | None = None
    disponivel: bool | None = None


class MachineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    proprietario_id: uuid.UUID
    nome: str
    descricao: str | None = None
    tipo: MachineType
    preco_diaria: float  # BD tem isto, envia como está
    provincia: str | None = None
    municipio: str | None = None
    disponivel: bool
    criado_em: datetime


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
    valor_total: float | None = None
    comissao_percentual: float | None = None
    valor_comissao: float | None = None
    criado_em: datetime
