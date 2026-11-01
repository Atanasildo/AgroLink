import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Rating(Base):
    __tablename__ = "ratings"
    __table_args__ = (
        # Um utilizador só pode avaliar outro uma vez — previne spam de avaliações
        UniqueConstraint("avaliador_id", "avaliado_id", name="uq_rating_avaliador_avaliado"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    avaliador_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    avaliado_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Coluna real na BD é pontuacao (não nota)
    pontuacao = Column(Integer, nullable=False)
    comentario = Column(String(1000), nullable=True)

    # Critérios específicos (1-5 estrelas cada, opcionais)
    criterio_confianca = Column(Integer, nullable=True)
    criterio_qualidade = Column(Integer, nullable=True)
    criterio_pontualidade = Column(Integer, nullable=True)
    criterio_atendimento = Column(Integer, nullable=True)

    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    avaliador = relationship("User", foreign_keys=[avaliador_id], back_populates="avaliacoes_feitas")
    avaliado = relationship("User", foreign_keys=[avaliado_id], back_populates="avaliacoes_recebidas")
