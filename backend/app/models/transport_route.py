import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class TransportRoute(Base):
    """Rota publicada por um transportador, com capacidade disponível
    para compartilhamento de carga entre vários agricultores.
    
    Latitude/longitude permitem busca por proximidade geográfica com PostGIS.
    """

    __tablename__ = "transport_routes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    veiculo_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=False)
    transportador_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    origem = Column(String(150), nullable=False)
    destino = Column(String(150), nullable=False)
    data = Column(Date, nullable=False)

    capacidade_total_toneladas = Column(Numeric(10, 2), nullable=False)
    capacidade_disponivel_toneladas = Column(Numeric(10, 2), nullable=False)
    preco_por_tonelada = Column(Numeric(12, 2), nullable=False)

    # Coordenadas geográficas da origem para busca por proximidade
    latitude = Column(Numeric(10, 8), nullable=True)  # ex: -8.8383
    longitude = Column(Numeric(11, 8), nullable=True)  # ex: 13.2344

    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), onupdate=func.now())

    veiculo = relationship("Vehicle", back_populates="rotas")
    solicitacoes = relationship(
        "TransportRequest", back_populates="rota", cascade="all, delete-orphan"
    )