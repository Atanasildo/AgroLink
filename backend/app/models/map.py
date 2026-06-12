import enum
import uuid

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.database import Base


class MapEntityType(str, enum.Enum):
    FAZENDA = "fazenda"
    PRODUTO = "produto"
    MAQUINA = "maquina"
    TRANSPORTADOR = "transportador"
    COOPERATIVA = "cooperativa"


class MapLocation(Base):
    """Ponto georreferenciado exibido no Mapa Agrícola Inteligente
    (OpenStreetMap), representando fazendas, produtos, máquinas,
    transportadores ou cooperativas.

    A base de dados utiliza PostGIS, permitindo evoluir este modelo para
    o tipo `geography(Point, 4326)` e consultas espaciais avançadas
    (ex.: distância, raio de busca) conforme o projeto evoluir.
    """

    __tablename__ = "map_locations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    tipo = Column(Enum(MapEntityType), nullable=False, index=True)

    # Referência opcional à entidade original (produto, máquina, etc.)
    referencia_id = Column(UUID(as_uuid=True), nullable=True)

    # Utilizador responsável pelo ponto (ex.: agricultor da fazenda)
    utilizador_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    nome = Column(String(150), nullable=False)
    descricao = Column(String(500), nullable=True)

    latitude = Column(Numeric(10, 6), nullable=False)
    longitude = Column(Numeric(10, 6), nullable=False)

    provincia = Column(String(100), nullable=True, index=True)
    municipio = Column(String(100), nullable=True, index=True)

    criado_em = Column(DateTime(timezone=True), server_default=func.now())
