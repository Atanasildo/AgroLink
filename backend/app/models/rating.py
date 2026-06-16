import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Rating(Base):
    __tablename__ = "ratings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    avaliador_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    avaliado_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Coluna real na BD é pontuacao (não nota)
    pontuacao = Column(Integer, nullable=False)
    comentario = Column(String(1000), nullable=True)

    # Critérios específicos (1-5 estrelas cada, opcionais)
    # Se não preenchidos, considerar-se-á apenas pontuacao geral
    criterio_confianca = Column(Integer, nullable=True)  # 1-5
    criterio_qualidade = Column(Integer, nullable=True)  # 1-5
    criterio_pontualidade = Column(Integer, nullable=True)  # 1-5
    criterio_atendimento = Column(Integer, nullable=True)  # 1-5

    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    avaliador = relationship("User", foreign_keys=[avaliador_id], back_populates="avaliacoes_feitas")
    avaliado = relationship("User", foreign_keys=[avaliado_id], back_populates="avaliacoes_recebidas")