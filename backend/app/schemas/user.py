import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserBase(BaseModel):
    nome: str = Field(min_length=2, max_length=150)
    email: EmailStr
    telefone: str | None = Field(default=None, max_length=30)
    role: UserRole
    provincia: str | None = None
    municipio: str | None = None


class UserCreate(UserBase):
    senha: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    senha: str


class UserUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=150)
    telefone: str | None = None
    provincia: str | None = None
    municipio: str | None = None
    bio: str | None = Field(default=None, max_length=500)
    foto_perfil_url: str | None = None


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
