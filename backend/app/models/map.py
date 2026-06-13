import enum
import uuid

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class MapEntityType(str, enum.Enum):
    FAZENDA = "fazenda"
    PRODUTO = "produto"
    MAQUINA = "maquina"
    TRANSPORTADOR = "transportador"
    COOPERATIVA = "cooperativa"


class MapLocation(Base):
    __tablename__ = "map_locations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    tipo = Column(Enum(MapEntityType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    referencia_id = Column(UUID(as_uuid=True), nullable=True)
    utilizador_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    nome = Column(String(150), nullable=False)
    descricao = Column(String(500), nullable=True)
    latitude = Column(Numeric(10, 6), nullable=False)
    longitude = Column(Numeric(10, 6), nullable=False)
    provincia = Column(String(100), nullable=True)
    municipio = Column(String(100), nullable=True)

    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    utilizador = relationship("User", foreign_keys=[utilizador_id])
