import uuid
from datetime import datetime
from decimal import Decimal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.product import ProductCategory, ProductUnit

# Domínios de armazenamento permitidos para imagens de produtos.
# Acrescenta aqui o domínio do teu S3/MinIO em produção.
_ALLOWED_IMAGE_HOSTS: set[str] = {
    "localhost",
    "127.0.0.1",
    "storage.agrolink.ao",
    "s3.af-south-1.amazonaws.com",
    # MinIO interno via docker-compose
    "minio",
}


def _validate_image_urls(urls: list[str] | None) -> list[str] | None:
    """Garante que cada URL de imagem aponta para um domínio de confiança."""
    if not urls:
        return urls
    for url in urls:
        try:
            parsed = urlparse(url)
            host = parsed.hostname or ""
        except Exception:
            from pydantic import ValidationError
            raise ValueError(f"URL de imagem inválida: {url!r}")

        # Permitir paths relativos (uploads locais em dev)
        if not parsed.scheme:
            continue

        if parsed.scheme not in ("http", "https"):
            raise ValueError(f"Esquema não permitido em URL de imagem: {parsed.scheme!r}")

        # Verificar host contra lista de confiança e sufixos conhecidos de S3
        allowed = (
            host in _ALLOWED_IMAGE_HOSTS
            or host.endswith(".amazonaws.com")
            or host.endswith(".agrolink.ao")
        )
        if not allowed:
            raise ValueError(
                f"Domínio de imagem não autorizado: {host!r}. "
                "Faz upload via /uploads e usa a URL devolvida."
            )
    return urls


class ProductBase(BaseModel):
    nome: str = Field(min_length=2, max_length=150)
    descricao: str | None = Field(default=None, max_length=2000)
    categoria: ProductCategory
    preco: Decimal = Field(gt=0)
    quantidade: Decimal = Field(gt=0)
    unidade: ProductUnit = ProductUnit.KG
    imagens: list[str] | None = None
    provincia: str = Field(max_length=100)
    municipio: str = Field(max_length=100)

    @field_validator("imagens")
    @classmethod
    def validate_imagens(cls, v: list[str] | None) -> list[str] | None:
        return _validate_image_urls(v)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=150)
    descricao: str | None = Field(default=None, max_length=2000)
    categoria: ProductCategory | None = None
    preco: Decimal | None = Field(default=None, gt=0)
    quantidade: Decimal | None = Field(default=None, gt=0)
    unidade: ProductUnit | None = None
    imagens: list[str] | None = None
    provincia: str | None = None
    municipio: str | None = None
    ativo: bool | None = None

    @field_validator("imagens")
    @classmethod
    def validate_imagens(cls, v: list[str] | None) -> list[str] | None:
        return _validate_image_urls(v)


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    agricultor_id: uuid.UUID
    ativo: bool
    criado_em: datetime
