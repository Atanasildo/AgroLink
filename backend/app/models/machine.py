import enum
import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class MachineType(str, enum.Enum):
    TRATOR = "trator"
    COLHEITADEIRA = "colheitadeira"
    PULVERIZADOR = "pulverizador"
    ARADO = "arado"
    SISTEMA_IRRIGACAO = "sistema_irrigacao"


class Machine(Base):
    __tablename__ = "machines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    proprietario_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    nome = Column(String(150), nullable=False)
    descricao = Column(String(2000), nullable=True)
    tipo = Column(Enum(MachineType), nullable=False)

    valor_diario = Column(Numeric(12, 2), nullable=False)

    provincia = Column(String(100), nullable=True)
    municipio = Column(String(100), nullable=True)

    disponivel = Column(Boolean, default=True, nullable=False)

    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), onupdate=func.now())

    proprietario = relationship("User", back_populates="maquinas")
    reservas = relationship("MachineRental", back_populates="maquina", cascade="all, delete-orphan")


class MachineRentalStatus(str, enum.Enum):
    PENDENTE = "pendente"
    APROVADO = "aprovado"
    EM_ANDAMENTO = "em_andamento"
    CONCLUIDO = "concluido"
    CANCELADO = "cancelado"


class MachineRental(Base):
    """Reserva de uma máquina agrícola, com cálculo automático de comissão (10%)."""

    __tablename__ = "machine_rentals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    maquina_id = Column(UUID(as_uuid=True), ForeignKey("machines.id"), nullable=False)
    agricultor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    data_inicio = Column(Date, nullable=False)
    data_fim = Column(Date, nullable=False)

    status = Column(Enum(MachineRentalStatus), nullable=False, default=MachineRentalStatus.PENDENTE)

    valor_total = Column(Numeric(12, 2), nullable=True)
    comissao_percentual = Column(Numeric(5, 2), nullable=True)
    valor_comissao = Column(Numeric(12, 2), nullable=True)
    valor_liquido_proprietario = Column(Numeric(12, 2), nullable=True)

    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), onupdate=func.now())

    maquina = relationship("Machine", back_populates="reservas")
    agricultor = relationship("User", foreign_keys=[agricultor_id])
