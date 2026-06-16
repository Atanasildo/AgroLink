"""
Análise de tendências de preço: variação percentual, média móvel, indicadores.
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.price import CommodityType, PriceRecord


def calculate_price_change_percent(
    current_price: Decimal, previous_price: Decimal
) -> float | None:
    """Calcula variação percentual."""
    if previous_price <= 0:
        return None
    return float(((current_price - previous_price) / previous_price) * 100)


def get_moving_average(
    db: Session,
    produto: CommodityType,
    provincia: str,
    days: int = 7,
) -> Decimal | None:
    """Média móvel dos últimos N dias."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    result = db.query(func.avg(PriceRecord.preco_kg)).filter(
        PriceRecord.produto == produto,
        PriceRecord.provincia == provincia,
        PriceRecord.criado_em >= cutoff,
    )

    avg = result.scalar()
    return Decimal(str(avg)) if avg else None


def get_price_trend(
    db: Session,
    produto: CommodityType,
    provincia: str,
) -> dict:
    """Análise completa de tendência: atual, mudança, médias móveis."""
    # Preço mais recente
    current = (
        db.query(PriceRecord)
        .filter(
            PriceRecord.produto == produto,
            PriceRecord.provincia == provincia,
        )
        .order_by(PriceRecord.criado_em.desc())
        .first()
    )

    if not current:
        return {
            "produto": produto,
            "provincia": provincia,
            "preco_atual": None,
            "dados_insuficientes": True,
        }

    # Preço de 7 dias atrás
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    week_old = (
        db.query(PriceRecord)
        .filter(
            PriceRecord.produto == produto,
            PriceRecord.provincia == provincia,
            PriceRecord.criado_em < week_ago,
        )
        .order_by(PriceRecord.criado_em.desc())
        .first()
    )

    change_7d = None
    if week_old:
        change_7d = calculate_price_change_percent(current.preco_kg, week_old.preco_kg)

    # Médias móveis
    ma_7 = get_moving_average(db, produto, provincia, days=7)
    ma_14 = get_moving_average(db, produto, provincia, days=14)
    ma_30 = get_moving_average(db, produto, provincia, days=30)

    # Indicador de tendência (simples)
    trend = "estável"
    if change_7d:
        if change_7d > 5:
            trend = "subida"
        elif change_7d < -5:
            trend = "queda"

    return {
        "produto": produto,
        "provincia": provincia,
        "preco_atual": float(current.preco_kg),
        "data_atual": current.criado_em,
        "variacao_7d_percent": change_7d,
        "media_movel_7d": float(ma_7) if ma_7 else None,
        "media_movel_14d": float(ma_14) if ma_14 else None,
        "media_movel_30d": float(ma_30) if ma_30 else None,
        "tendencia": trend,
    }


def get_regional_comparison(
    db: Session,
    produto: CommodityType,
) -> list[dict]:
    """Compara preços de um produto em todas as províncias."""
    # Último preço por província
    subquery = (
        db.query(
            PriceRecord.provincia,
            func.max(PriceRecord.criado_em).label("max_date"),
        )
        .filter(PriceRecord.produto == produto)
        .group_by(PriceRecord.provincia)
        .subquery()
    )

    records = db.query(PriceRecord).join(
        subquery,
        (PriceRecord.provincia == subquery.c.provincia)
        & (PriceRecord.criado_em == subquery.c.max_date),
    )

    result = []
    for record in records:
        trend = get_price_trend(db, produto, record.provincia)
        result.append({
            "provincia": record.provincia,
            "preco": float(record.preco_kg),
            "tendencia": trend.get("tendencia"),
            "variacao_7d": trend.get("variacao_7d_percent"),
        })

    # Ordenar por preço decrescente (mais caro primeiro)
    result.sort(key=lambda x: x["preco"], reverse=True)
    return result