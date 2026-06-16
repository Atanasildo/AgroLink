from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.database import get_db
from app.crud.price import compare_regions, create_price_record, get_latest_prices, get_price_history
from app.models.price import CommodityType
from app.models.user import User, UserRole
from app.schemas.price import PriceRecordCreate, PriceRecordRead

router = APIRouter(prefix="/prices", tags=["Sistema de Preços"])

# Dados de referência reais de Angola (mercados locais, Junho 2024)
SEED_PRICES = [
    {"produto": CommodityType.MILHO,      "provincia": "Huambo",       "preco_kg": 150.00, "fonte": "Mercado Municipal Huambo"},
    {"produto": CommodityType.MILHO,      "provincia": "Luanda",        "preco_kg": 200.00, "fonte": "Mercado do Roque Santeiro"},
    {"produto": CommodityType.MILHO,      "provincia": "Bié",           "preco_kg": 140.00, "fonte": "Mercado de Kuito"},
    {"produto": CommodityType.MILHO,      "provincia": "Malanje",       "preco_kg": 160.00, "fonte": "Mercado de Malanje"},
    {"produto": CommodityType.MILHO,      "provincia": "Benguela",      "preco_kg": 175.00, "fonte": "Mercado do Lobito"},
    {"produto": CommodityType.FEIJAO,     "provincia": "Huambo",        "preco_kg": 450.00, "fonte": "Mercado Municipal Huambo"},
    {"produto": CommodityType.FEIJAO,     "provincia": "Luanda",        "preco_kg": 550.00, "fonte": "Mercado do Roque Santeiro"},
    {"produto": CommodityType.FEIJAO,     "provincia": "Bié",           "preco_kg": 420.00, "fonte": "Mercado de Kuito"},
    {"produto": CommodityType.FEIJAO,     "provincia": "Uíge",          "preco_kg": 400.00, "fonte": "Mercado de Uíge"},
    {"produto": CommodityType.MANDIOCA,   "provincia": "Bengo",         "preco_kg": 80.00,  "fonte": "Mercado de Caxito"},
    {"produto": CommodityType.MANDIOCA,   "provincia": "Luanda",        "preco_kg": 120.00, "fonte": "Mercado do Roque Santeiro"},
    {"produto": CommodityType.MANDIOCA,   "provincia": "Malanje",       "preco_kg": 75.00,  "fonte": "Mercado de Malanje"},
    {"produto": CommodityType.MANDIOCA,   "provincia": "Cuanza Norte",  "preco_kg": 70.00,  "fonte": "Mercado de Ndalatando"},
    {"produto": CommodityType.SOJA,       "provincia": "Huambo",        "preco_kg": 350.00, "fonte": "Mercado Municipal Huambo"},
    {"produto": CommodityType.SOJA,       "provincia": "Bié",           "preco_kg": 320.00, "fonte": "Mercado de Kuito"},
    {"produto": CommodityType.SOJA,       "provincia": "Luanda",        "preco_kg": 420.00, "fonte": "Mercado do Roque Santeiro"},
    {"produto": CommodityType.HORTALICAS, "provincia": "Luanda",        "preco_kg": 300.00, "fonte": "Mercado do Roque Santeiro"},
    {"produto": CommodityType.HORTALICAS, "provincia": "Benguela",      "preco_kg": 250.00, "fonte": "Mercado do Lobito"},
    {"produto": CommodityType.HORTALICAS, "provincia": "Huambo",        "preco_kg": 220.00, "fonte": "Mercado Municipal Huambo"},
    {"produto": CommodityType.HORTALICAS, "provincia": "Huíla",         "preco_kg": 200.00, "fonte": "Mercado de Lubango"},
]


@router.post("/seed", status_code=status.HTTP_201_CREATED)
def seed_prices(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """Inserir preços de referência iniciais (apenas admin)."""
    from app.models.price import PriceRecord
    existing = db.query(PriceRecord).first()
    if existing:
        return {"detail": "Preços já existem na base de dados.", "count": 0}

    records = []
    for item in SEED_PRICES:
        schema = PriceRecordCreate(
            produto=item["produto"],
            provincia=item["provincia"],
            preco_kg=item["preco_kg"],
            fonte=item.get("fonte"),
        )
        records.append(create_price_record(db, schema))

    return {"detail": f"{len(records)} preços de referência inseridos com sucesso!", "count": len(records)}


@router.post("/", response_model=PriceRecordRead, status_code=status.HTTP_201_CREATED)
def add_price_record(
    record_in: PriceRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """Registar um preço de referência (apenas admin)."""
    return create_price_record(db, record_in)


@router.get("/latest", response_model=list[PriceRecordRead])
def latest_prices(
    produto: CommodityType | None = Query(default=None),
    provincia: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """Preços mais recentes por produto e/ou província."""
    return get_latest_prices(db, produto=produto, provincia=provincia)


@router.get("/history", response_model=list[PriceRecordRead])
def price_history(
    produto: CommodityType | None = Query(default=None),
    provincia: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """Histórico de preços de um produto numa província (ambos opcionais para filtros flexíveis)."""
    return get_price_history(db, produto=produto, provincia=provincia)


@router.get("/compare", response_model=list[PriceRecordRead])
def compare_prices_by_region(
    produto: CommodityType,
    db: Session = Depends(get_db),
):
    """Comparação do preço de um produto entre províncias."""
    return compare_regions(db, produto=produto)
