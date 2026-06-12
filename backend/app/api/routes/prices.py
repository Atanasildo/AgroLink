from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.database import get_db
from app.crud.price import compare_regions, create_price_record, get_latest_prices, get_price_history
from app.models.price import CommodityType
from app.models.user import User, UserRole
from app.schemas.price import PriceRecordCreate, PriceRecordRead

router = APIRouter(prefix="/prices", tags=["Sistema de Preços"])


@router.post("/", response_model=PriceRecordRead, status_code=status.HTTP_201_CREATED)
def add_price_record(
    record_in: PriceRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """Registar um preço de referência para um produto numa região e data (apenas admin)."""
    return create_price_record(db, record_in)


@router.get("/latest", response_model=list[PriceRecordRead])
def latest_prices(
    produto: CommodityType | None = Query(default=None),
    provincia: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """Consulta de preços atuais (mais recentes) por produto e/ou província."""
    return get_latest_prices(db, produto=produto, provincia=provincia)


@router.get("/history", response_model=list[PriceRecordRead])
def price_history(
    produto: CommodityType,
    provincia: str,
    data_inicio: date | None = Query(default=None),
    data_fim: date | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """Histórico de preços de um produto numa província (para gráficos de tendência)."""
    return get_price_history(db, produto=produto, provincia=provincia, data_inicio=data_inicio, data_fim=data_fim)


@router.get("/compare", response_model=list[PriceRecordRead])
def compare_prices_by_region(
    produto: CommodityType,
    data_referencia: date,
    db: Session = Depends(get_db),
):
    """Comparação do preço de um produto entre diferentes províncias numa data."""
    return compare_regions(db, produto=produto, data_referencia=data_referencia)
