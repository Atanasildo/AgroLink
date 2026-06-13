import enum
import uuid

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.database import Base


class CommodityType(str, enum.Enum):
    MILHO = "milho"
    FEIJAO = "feijao"
    MANDIOCA = "mandioca"
    BATATA = "batata"
    TOMATE = "tomate"
    BANANA = "banana"
    CAFE = "cafe"
    ALGODAO = "algodao"


class PriceRecord(Base):
    __tablename__ = "price_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    produto = Column(Enum(CommodityType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    # Coluna real na BD é preco_kg
    preco_kg = Column(Numeric(10, 2), nullable=False)
    provincia = Column(String(100), nullable=False)
    fonte = Column(String(200), nullable=True)

    criado_em = Column(DateTime(timezone=True), server_default=func.now())
