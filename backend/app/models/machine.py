import enum
import uuid

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class MachineType(str, enum.Enum):
    TRATOR = "trator"
    COLHEITADEIRA = "colheitadeira"
    ARADO = "arado"
    PLANTADORA = "plantadora"
    IRRIGACAO = "irrigacao"
    OUTROS = "outros"


class Machine(Base):
    __tablename__ = "machines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proprietario_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    nome = Column(String(150), nullable=False)
    descricao = Column(String(1000), nullable=True)
    tipo = Column(Enum(MachineType, values_callable=lambda x: [e.value for e in x]), nullable=False)

    # Coluna real na BD é preco_diaria
    preco_diaria = Column(Numeric(12, 2), nullable=False)

    provincia = Column(String(100), nullable=False)
    municipio = Column(String(100), nullable=False)
    imagens = Column(ARRAY(String()), nullable=True)
    disponivel = Column(Boolean, default=True, nullable=False)

    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), onupdate=func.now())

    proprietario = relationship("User", back_populates="maquinas")
    reservas = relationship("MachineRental", back_populates="maquina", cascade="all, delete-orphan")


class MachineRentalStatus(str, enum.Enum):
    PENDENTE = "pendente"
    CONFIRMADO = "confirmado"
    EM_ANDAMENTO = "em_andamento"
    CONCLUIDO = "concluido"
    CANCELADO = "cancelado"


class MachineRental(Base):
    __tablename__ = "machine_rentals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    maquina_id = Column(UUID(as_uuid=True), ForeignKey("machines.id"), nullable=False)
    # Coluna real na BD é locatario_id (não agricultor_id)
    locatario_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    data_inicio = Column(DateTime, nullable=False)
    data_fim = Column(DateTime, nullable=False)

    valor_total = Column(Numeric(14, 2), nullable=False)
    comissao_percentual = Column(Numeric(5, 2), nullable=True)
    valor_comissao = Column(Numeric(14, 2), nullable=True)

    status = Column(
        Enum(MachineRentalStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=MachineRentalStatus.PENDENTE,
    )

    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    maquina = relationship("Machine", back_populates="reservas")
    locatario = relationship("User", foreign_keys=[locatario_id])
