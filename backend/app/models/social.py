import enum
import uuid

from sqlalchemy import (
    ARRAY,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class PostType(str, enum.Enum):
    DUVIDA = "duvida"
    DICA = "dica"
    EXPERIENCIA = "experiencia"
    NOTICIA = "noticia"


class Post(Base):
    """Publicação da Rede Social Agrícola (dúvidas, dicas, experiências, notícias)."""

    __tablename__ = "social_posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    autor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    conteudo = Column(Text, nullable=False)
    tipo = Column(
        Enum(PostType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=PostType.EXPERIENCIA,
    )
    imagens = Column(ARRAY(String), nullable=True)

    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    autor = relationship("User")
    likes = relationship("PostLike", cascade="all, delete-orphan", backref="post")
    comentarios = relationship("PostComment", cascade="all, delete-orphan", backref="post")


class PostLike(Base):
    """Curtida de um utilizador numa publicação (no máximo uma por par utilizador/post)."""

    __tablename__ = "social_post_likes"
    __table_args__ = (UniqueConstraint("post_id", "utilizador_id", name="uq_social_post_like"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    post_id = Column(UUID(as_uuid=True), ForeignKey("social_posts.id", ondelete="CASCADE"), nullable=False)
    utilizador_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    criado_em = Column(DateTime(timezone=True), server_default=func.now())


class PostComment(Base):
    """Comentário numa publicação da rede social."""

    __tablename__ = "social_post_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    post_id = Column(UUID(as_uuid=True), ForeignKey("social_posts.id", ondelete="CASCADE"), nullable=False)
    autor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    conteudo = Column(String(1000), nullable=False)

    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    autor = relationship("User")
