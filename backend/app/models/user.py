import enum
import uuid

from sqlalchemy import Boolean, Column, DateTime, Enum, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class UserRole(str, enum.Enum):
    AGRICULTOR = "agricultor"
    COMPRADOR = "comprador"
    TRANSPORTADOR = "transportador"
    PROPRIETARIO_MAQUINAS = "proprietario_maquinas"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    nome = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    telefone = Column(String(30), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)

    role = Column(Enum(UserRole), nullable=False, default=UserRole.AGRICULTOR)

    # Localização
    provincia = Column(String(100), nullable=True)
    municipio = Column(String(100), nullable=True)

    foto_perfil_url = Column(String(500), nullable=True)
    bio = Column(String(500), nullable=True)

    # Verificações
    email_verificado = Column(Boolean, default=False, nullable=False)
    telefone_verificado = Column(Boolean, default=False, nullable=False)

    ativo = Column(Boolean, default=True, nullable=False)

    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), onupdate=func.now())

    # Relacionamentos
    produtos = relationship("Product", back_populates="agricultor", cascade="all, delete-orphan")
    veiculos = relationship("Vehicle", back_populates="proprietario", cascade="all, delete-orphan")
    maquinas = relationship("Machine", back_populates="proprietario", cascade="all, delete-orphan")

    avaliacoes_recebidas = relationship(
        "Rating", foreign_keys="Rating.avaliado_id", back_populates="avaliado"
    )
    avaliacoes_feitas = relationship(
        "Rating", foreign_keys="Rating.avaliador_id", back_populates="avaliador"
    )
