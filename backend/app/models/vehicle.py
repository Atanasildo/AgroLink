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
    TRATOR_DE_CARGA = "trator_de_carga"
    REBOQUE = "reboque"


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    proprietario_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    tipo = Column(Enum(VehicleType), nullable=False)
    capacidade_toneladas = Column(Numeric(10, 2), nullable=False)
    matricula = Column(String(20), unique=True, nullable=False)

    provincia = Column(String(100), nullable=True)
    municipio = Column(String(100), nullable=True)

    disponivel = Column(Boolean, default=True, nullable=False)

    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), onupdate=func.now())

    proprietario = relationship("User", back_populates="veiculos")
    rotas = relationship("TransportRoute", back_populates="veiculo", cascade="all, delete-orphan")
