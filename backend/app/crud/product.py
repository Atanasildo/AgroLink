import uuid
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.product import Product, ProductCategory
from app.schemas.product import ProductCreate, ProductUpdate


def create_product(db: Session, product_in: ProductCreate, agricultor_id: uuid.UUID) -> Product:
    db_product = Product(**product_in.model_dump(), agricultor_id=agricultor_id)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


def get_product(db: Session, product_id: uuid.UUID) -> Product | None:
    return db.query(Product).filter(Product.id == product_id).first()


def list_products(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    nome: str | None = None,
    categoria: ProductCategory | None = None,
    provincia: str | None = None,
    municipio: str | None = None,
    preco_min: Decimal | None = None,
    preco_max: Decimal | None = None,
) -> list[Product]:
    query = db.query(Product).filter(Product.ativo.is_(True))

    if nome:
        query = query.filter(Product.nome.ilike(f"%{nome}%"))
    if categoria:
        query = query.filter(Product.categoria == categoria)
    if provincia:
        query = query.filter(Product.provincia.ilike(provincia))
    if municipio:
        query = query.filter(Product.municipio.ilike(municipio))
    if preco_min is not None:
        query = query.filter(Product.preco >= preco_min)
    if preco_max is not None:
        query = query.filter(Product.preco <= preco_max)

    return query.order_by(Product.criado_em.desc()).offset(skip).limit(limit).all()


def update_product(db: Session, db_product: Product, product_in: ProductUpdate) -> Product:
    update_data = product_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_product, field, value)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


def delete_product(db: Session, db_product: Product) -> None:
    db.delete(db_product)
    db.commit()
