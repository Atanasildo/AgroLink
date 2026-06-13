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


class MachineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    proprietario_id: uuid.UUID
    nome: str
    descricao: str | None = None
    tipo: MachineType
    # Expõe preco_diaria como valor_diario para o frontend
    valor_diario: Decimal
    provincia: str | None = None
    municipio: str | None = None
    disponivel: bool
    criado_em: datetime

    @classmethod
    def model_validate(cls, obj, **kwargs):  # type: ignore[override]
        # Mapeia preco_diaria → valor_diario quando lê da BD
        if hasattr(obj, "preco_diaria") and not hasattr(obj, "valor_diario"):
            obj.__dict__["valor_diario"] = obj.preco_diaria
        return super().model_validate(obj, **kwargs)


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
