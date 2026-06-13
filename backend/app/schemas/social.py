import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.social import PostType
from app.models.user import UserRole


class AuthorBrief(BaseModel):
    """Dados resumidos do autor, incluídos nas publicações e comentários."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nome: str
    role: UserRole
    foto_perfil_url: str | None = None


class PostCreate(BaseModel):
    conteudo: str = Field(min_length=1, max_length=5000)
    tipo: PostType = PostType.EXPERIENCIA
    imagens: list[str] | None = None


class PostRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    autor_id: uuid.UUID
    conteudo: str
    tipo: PostType
    imagens: list[str] | None = None
    criado_em: datetime

    autor: AuthorBrief
    likes_count: int = 0
    comments_count: int = 0
    curtido_por_mim: bool = False


class CommentCreate(BaseModel):
    conteudo: str = Field(min_length=1, max_length=1000)


class CommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    post_id: uuid.UUID
    autor_id: uuid.UUID
    conteudo: str
    criado_em: datetime

    autor: AuthorBrief


class LikeToggleResult(BaseModel):
    curtido: bool
    likes_count: int
