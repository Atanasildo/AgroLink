import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.product import ProductCategory, ProductUnit


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


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    agricultor_id: uuid.UUID
    ativo: bool
    criado_em: datetime
