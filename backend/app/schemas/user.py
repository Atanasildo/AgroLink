import re
import uuid
from datetime import datetime
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.user import UserRole

# Domínios de confiança para foto de perfil
_ALLOWED_PHOTO_HOSTS: set[str] = {
    "localhost",
    "127.0.0.1",
    "storage.agrolink.ao",
    "minio",
}

_PASSWORD_MIN_LENGTH = 8
# Pelo menos uma letra e um dígito (complexidade mínima sem ser irritante em mobile)
_PASSWORD_RE = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).{8,}$")


def _validate_foto_url(url: str | None) -> str | None:
    if not url:
        return url
    try:
        parsed = urlparse(url)
    except Exception:
        raise ValueError("URL de foto de perfil inválida")
    # Paths relativos (uploads locais em dev) são ok
    if not parsed.scheme:
        return url
    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"Esquema não permitido: {parsed.scheme!r}")
    host = parsed.hostname or ""
    allowed = (
        host in _ALLOWED_PHOTO_HOSTS
        or host.endswith(".amazonaws.com")
        or host.endswith(".agrolink.ao")
    )
    if not allowed:
        raise ValueError(
            f"Domínio de foto não autorizado: {host!r}. "
            "Usa /uploads para fazer upload e usa a URL devolvida."
        )
    return url


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
    """Request para mudar a senha (autenticado ou com senha temporária)."""
    senha_atual: str = Field(min_length=1, description="Senha atual ou temporária")
    senha_nova: str = Field(min_length=_PASSWORD_MIN_LENGTH, max_length=128, description="Nova senha")

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
    chave: str = Field(min_length=1, description="Chave secreta de configuração (ADMIN_SETUP_KEY)")


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
    """Perfil público de um utilizador — sem email nem telefone."""
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
