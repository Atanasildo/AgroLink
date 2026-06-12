import enum
import uuid

from sqlalchemy import Column, Date, DateTime, Enum, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.database import Base


class CommodityType(str, enum.Enum):
    MILHO = "milho"
    FEIJAO = "feijao"
    MANDIOCA = "mandioca"
    SOJA = "soja"
    HORTALICAS = "hortalicas"


class PriceRecord(Base):
    """Registo histórico de preços de produtos agrícolas por região,
    usado para consultas, histórico, tendências e comparação por região."""

    __tablename__ = "price_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    produto = Column(Enum(CommodityType), nullable=False, index=True)
    provincia = Column(String(100), nullable=False, index=True)
    municipio = Column(String(100), nullable=True, index=True)

    preco_medio = Column(Numeric(12, 2), nullable=False)
    unidade = Column(String(20), nullable=False, default="kg")

    data_referencia = Column(Date, nullable=False, index=True)

    criado_em = Column(DateTime(timezone=True), server_default=func.now())
