from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.price import CommodityType, PriceRecord
from app.schemas.price import PriceRecordCreate


def create_price_record(db: Session, record_in: PriceRecordCreate) -> PriceRecord:
    db_record = PriceRecord(**record_in.model_dump())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record


def get_latest_prices(
    db: Session,
    produto: CommodityType | None = None,
    provincia: str | None = None,
) -> list[PriceRecord]:
    """Retorna o registo mais recente por produto/província."""
    subquery = (
        db.query(
            PriceRecord.produto,
            PriceRecord.provincia,
            func.max(PriceRecord.criado_em).label("max_data"),
        )
        .group_by(PriceRecord.produto, PriceRecord.provincia)
        .subquery()
    )

    query = db.query(PriceRecord).join(
        subquery,
        (PriceRecord.produto == subquery.c.produto)
        & (PriceRecord.provincia == subquery.c.provincia)
        & (PriceRecord.criado_em == subquery.c.max_data),
    )

    if produto:
        query = query.filter(PriceRecord.produto == produto)
    if provincia:
        query = query.filter(PriceRecord.provincia.ilike(provincia))

    return query.order_by(PriceRecord.produto, PriceRecord.provincia).all()


def get_price_history(
    db: Session,
    produto: CommodityType,
    provincia: str,
) -> list[PriceRecord]:
    return (
        db.query(PriceRecord)
        .filter(PriceRecord.produto == produto, PriceRecord.provincia.ilike(provincia))
        .order_by(PriceRecord.criado_em.asc())
        .all()
    )


def compare_regions(db: Session, produto: CommodityType) -> list[PriceRecord]:
    return (
        db.query(PriceRecord)
        .filter(PriceRecord.produto == produto)
        .order_by(PriceRecord.preco_kg.asc())
        .all()
    )
