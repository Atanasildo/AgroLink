import re
import uuid
from datetime import datetime
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.user import UserRole

_PASSWORD_MIN_LENGTH = 8
_PASSWORD_RE = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).{8,}$")


def _validate_foto_url(url: str | None) -> str | None:
    if not url:
        return url
    # Rejeitar base64 — deve fazer upload via /uploads/profile primeiro
    if url.startswith("data:"):
        raise ValueError("Usa /uploads/profile para fazer upload da foto. Não são aceites imagens em base64.")
    try:
        parsed = urlparse(url)
    except Exception:
        raise ValueError("URL de foto de perfil inválida")
    # Path relativo (ex: /uploads/profile/abc.jpg) — ok
    if not parsed.scheme:
        return url
    # Qualquer URL https é aceite
    if parsed.scheme in ("http", "https"):
        return url
    raise ValueError(f"Esquema não permitido: {parsed.scheme!r}")


class UserBase(BaseModel):
    nome: str = Field(min_length=2, max_length=150)
    email: EmailStr
    telefone: str | None = Field(default=None, max_length=30)
    role: UserRole
    provincia: str | None = None
    municipio: str | None = None


class UserCreate(UserBase):
    senha: str = Field(min_length=_PASSWORD_MIN_LENGTH, max_length=128)

    @field_validator("senha")
    @classmethod
    def _validate_senha(cls, v: str) -> str:
        if not _PASSWORD_RE.match(v):
            raise ValueError(
                "A senha deve ter pelo menos 8 caracteres, incluindo uma letra e um dígito."
            )
        return v


class UserLogin(BaseModel):
    email: EmailStr
    senha: str


class ChangePasswordRequest(BaseModel):
    senha_atual: str = Field(min_length=1)
    senha_nova: str = Field(min_length=_PASSWORD_MIN_LENGTH, max_length=128)

    @field_validator("senha_nova")
    @classmethod
    def _validate_senha_nova(cls, v: str) -> str:
        if not _PASSWORD_RE.match(v):
            raise ValueError(
                "A nova senha deve ter pelo menos 8 caracteres, incluindo uma letra e um dígito."
            )
        return v


class UserUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=150)
    telefone: str | None = None
    provincia: str | None = None
    municipio: str | None = None
    bio: str | None = Field(default=None, max_length=500)
    foto_perfil_url: str | None = None

    @field_validator("foto_perfil_url")
    @classmethod
    def _validate_foto(cls, v: str | None) -> str | None:
        return _validate_foto_url(v)


class AdminPromoteRequest(BaseModel):
    chave: str = Field(min_length=1)


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    bio: str | None = None
    foto_perfil_url: str | None = None
    email_verificado: bool
    telefone_verificado: bool
    ativo: bool
    criado_em: datetime


class UserPublicRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nome: str
    role: str
    provincia: str | None = None
    municipio: str | None = None
    bio: str | None = None
    foto_perfil_url: str | None = None
    email_verificado: bool
    telefone_verificado: bool
    is_online: bool = False
