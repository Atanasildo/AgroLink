import enum
import uuid

from sqlalchemy import ARRAY, Boolean, Column, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class ProductCategory(str, enum.Enum):
    CEREAIS = "cereais"
    LEGUMINOSAS = "leguminosas"
    TUBERCULOS = "tuberculos"
    HORTALICAS = "hortalicas"
    FRUTAS = "frutas"
    OUTROS = "outros"


class ProductUnit(str, enum.Enum):
    KG = "kg"
    TONELADA = "tonelada"
    SACO = "saco"
    UNIDADE = "unidade"
    LITRO = "litro"


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    nome = Column(String(150), nullable=False)
    descricao = Column(String(2000), nullable=True)
    categoria = Column(Enum(ProductCategory, values_callable=lambda x: [e.value for e in x]), nullable=False, index=True)

    preco = Column(Numeric(12, 2), nullable=False)
    quantidade = Column(Numeric(12, 2), nullable=False)
    unidade = Column(Enum(ProductUnit, values_callable=lambda x: [e.value for e in x]), nullable=False, default=ProductUnit.KG)

    imagens = Column(ARRAY(String), nullable=True)

    provincia = Column(String(100), nullable=False, index=True)
    municipio = Column(String(100), nullable=False, index=True)

    agricultor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    ativo = Column(Boolean, default=True, nullable=False)

    # Campos de moderation (admin aprova antes de publicar)
    aprovado = Column(Boolean, nullable=False, default=False)  # False = aguardando aprovação
    flagged = Column(Boolean, nullable=False, default=False)  # True = denunciado/suspeito
    flag_reason = Column(String(500), nullable=True)  # Motivo da denúncia

    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), onupdate=func.now())

    agricultor = relationship("User", back_populates="produtos")