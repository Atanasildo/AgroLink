from datetime import date

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
    """Consulta de preços: retorna o registo mais recente por produto/província."""
    subquery = (
        db.query(
            PriceRecord.produto,
            PriceRecord.provincia,
            func.max(PriceRecord.data_referencia).label("max_data"),
        )
        .group_by(PriceRecord.produto, PriceRecord.provincia)
        .subquery()
    )

    query = db.query(PriceRecord).join(
        subquery,
        (PriceRecord.produto == subquery.c.produto)
        & (PriceRecord.provincia == subquery.c.provincia)
        & (PriceRecord.data_referencia == subquery.c.max_data),
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
    data_inicio: date | None = None,
    data_fim: date | None = None,
) -> list[PriceRecord]:
    """Histórico de preços de um produto numa província, ordenado por data."""
    query = db.query(PriceRecord).filter(
        PriceRecord.produto == produto,
        PriceRecord.provincia.ilike(provincia),
    )
    if data_inicio:
        query = query.filter(PriceRecord.data_referencia >= data_inicio)
    if data_fim:
        query = query.filter(PriceRecord.data_referencia <= data_fim)

    return query.order_by(PriceRecord.data_referencia.asc()).all()


def compare_regions(db: Session, produto: CommodityType, data_referencia: date) -> list[PriceRecord]:
    """Comparação do preço de um produto entre regiões, numa data de referência."""
    return (
        db.query(PriceRecord)
        .filter(PriceRecord.produto == produto, PriceRecord.data_referencia == data_referencia)
        .order_by(PriceRecord.preco_medio.asc())
        .all()
    )
