import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.transport_request import TransportStatus
from app.models.vehicle import VehicleType


# ---------- Veículos ----------

class VehicleBase(BaseModel):
    tipo: VehicleType
    capacidade_toneladas: Decimal = Field(gt=0)
    matricula: str = Field(min_length=2, max_length=20)
    provincia: str | None = None
    municipio: str | None = None


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    tipo: VehicleType | None = None
    capacidade_toneladas: Decimal | None = Field(default=None, gt=0)
    matricula: str | None = None
    provincia: str | None = None
    municipio: str | None = None
    disponivel: bool | None = None


class VehicleRead(VehicleBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    proprietario_id: uuid.UUID
    disponivel: bool
    criado_em: datetime


# ---------- Rotas ----------

class TransportRouteBase(BaseModel):
    origem: str = Field(max_length=150)
    destino: str = Field(max_length=150)
    data: date
    preco_por_tonelada: Decimal = Field(gt=0)


class TransportRouteCreate(TransportRouteBase):
    veiculo_id: uuid.UUID


class TransportRouteRead(TransportRouteBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    veiculo_id: uuid.UUID
    transportador_id: uuid.UUID
    capacidade_total_toneladas: Decimal
    capacidade_disponivel_toneladas: Decimal
    criado_em: datetime


# ---------- Solicitações de Transporte ----------

class TransportRequestBase(BaseModel):
    produto: str = Field(max_length=150)
    peso_toneladas: Decimal = Field(gt=0)
    origem: str = Field(max_length=150)
    destino: str = Field(max_length=150)
    data: date
    observacoes: str | None = Field(default=None, max_length=1000)


class TransportRequestCreate(TransportRequestBase):
    rota_id: uuid.UUID | None = Field(
        default=None, description="Se informado, associa a solicitação a uma rota existente (carga compartilhada)"
    )


class TransportRequestUpdateStatus(BaseModel):
    status: TransportStatus


class TransportRequestLocationUpdate(BaseModel):
    latitude_atual: Decimal
    longitude_atual: Decimal
    hora_prevista_chegada: datetime | None = None


class TransportRequestRead(TransportRequestBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    agricultor_id: uuid.UUID
    rota_id: uuid.UUID | None = None
    status: TransportStatus

    valor_total: Decimal | None = None
    comissao_percentual: Decimal | None = None
    valor_comissao: Decimal | None = None
    valor_liquido_transportador: Decimal | None = None

    latitude_atual: Decimal | None = None
    longitude_atual: Decimal | None = None
    hora_prevista_chegada: datetime | None = None

    criado_em: datetime
