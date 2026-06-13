import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.crud.product import (
    create_product,
    delete_product,
    get_product,
    list_products,
    update_product,
)
from app.models.product import Product as ProductModel, ProductCategory
from app.models.user import User, UserRole
from app.schemas.product import ProductCreate, ProductRead, ProductUpdate

router = APIRouter(prefix="/products", tags=["Marketplace"])


@router.post("/", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def publish_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.AGRICULTOR)),
):
    """Publicar um novo produto agrícola (apenas agricultores)."""
    return create_product(db, product_in, agricultor_id=current_user.id)


@router.get("/", response_model=list[ProductRead])
def search_products(
    nome: str | None = Query(default=None, description="Filtrar por nome do produto"),
    categoria: ProductCategory | None = Query(default=None, description="Filtrar por categoria"),
    provincia: str | None = Query(default=None, description="Filtrar por província"),
    municipio: str | None = Query(default=None, description="Filtrar por município"),
    preco_min: Decimal | None = Query(default=None, ge=0),
    preco_max: Decimal | None = Query(default=None, ge=0),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Listar/pesquisar produtos com filtros (produto, categoria, província, município, preço)."""
    return list_products(
        db,
        skip=skip,
        limit=limit,
        nome=nome,
        categoria=categoria,
        provincia=provincia,
        municipio=municipio,
        preco_min=preco_min,
        preco_max=preco_max,
    )


from app.models.product import Product as ProductModel, ProductCategory


@router.get("/me", response_model=list[ProductRead])
def my_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.AGRICULTOR)),
):
    """Listar os meus produtos publicados."""
    return (
        db.query(ProductModel)
        .filter(ProductModel.agricultor_id == current_user.id)
        .order_by(ProductModel.criado_em.desc())
        .all()
    )


@router.get("/{product_id}", response_model=ProductRead)
def read_product(product_id: uuid.UUID, db: Session = Depends(get_db)):
    product = get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado")
    return product


@router.put("/{product_id}", response_model=ProductRead)
def edit_product(
    product_id: uuid.UUID,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Editar um produto. Apenas o próprio agricultor (ou admin) pode editar."""
    product = get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado")
    if product.agricultor_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")
    return update_product(db, product, product_in)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_product(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remover um produto. Apenas o próprio agricultor (ou admin) pode remover."""
    product = get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado")
    if product.agricultor_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")
    delete_product(db, product)
