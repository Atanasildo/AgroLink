import uuid

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Rating(Base):
    """Avaliação de 1 a 5 estrelas entre utilizadores, com critérios.

    Pode estar associada a uma transação de transporte ou de aluguel
    de máquina (transacao_tipo + transacao_id), usados para auditoria.
    """

    __tablename__ = "ratings"
    __table_args__ = (
        CheckConstraint("nota >= 1 AND nota <= 5", name="ck_rating_nota_range"),
        CheckConstraint("confianca >= 1 AND confianca <= 5", name="ck_rating_confianca_range"),
        CheckConstraint("qualidade >= 1 AND qualidade <= 5", name="ck_rating_qualidade_range"),
        CheckConstraint("pontualidade >= 1 AND pontualidade <= 5", name="ck_rating_pontualidade_range"),
        CheckConstraint("atendimento >= 1 AND atendimento <= 5", name="ck_rating_atendimento_range"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    avaliador_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    avaliado_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Nota geral (média ou nota única)
    nota = Column(Integer, nullable=False)

    # Critérios específicos
    confianca = Column(Integer, nullable=True)
    qualidade = Column(Integer, nullable=True)
    pontualidade = Column(Integer, nullable=True)
    atendimento = Column(Integer, nullable=True)

    comentario = Column(String(1000), nullable=True)

    # Referência opcional à transação avaliada
    transacao_tipo = Column(String(50), nullable=True)  # "transporte" | "aluguel_maquina"
    transacao_id = Column(UUID(as_uuid=True), nullable=True)

    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    avaliador = relationship("User", foreign_keys=[avaliador_id], back_populates="avaliacoes_feitas")
    avaliado = relationship("User", foreign_keys=[avaliado_id], back_populates="avaliacoes_recebidas")
