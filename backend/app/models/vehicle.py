import enum
import uuid

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class VehicleType(str, enum.Enum):
    CAMINHAO = "caminhao"
    CARRINHA = "carrinha"
    TRATOR_CARGA = "trator_carga"
    REBOQUE = "reboque"


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proprietario_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    tipo = Column(Enum(VehicleType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    matricula = Column(String(20), unique=True, nullable=False)
    capacidade_toneladas = Column(Numeric(8, 2), nullable=False)
    descricao = Column(String(500), nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)

    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    proprietario = relationship("User", back_populates="veiculos")
    rotas = relationship("TransportRoute", back_populates="veiculo")
