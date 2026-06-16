"""
Rotas para sistema de preços com tendências.

GET /prices/{produto}/trend — análise de tendência
GET /prices/{produto}/regional — comparação por região
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.price import CommodityType, PriceRecord
from app.utils.price_trends import get_price_trend, get_regional_comparison

router = APIRouter(prefix="/prices", tags=["Preços"])


@router.get("/{produto}/trend", status_code=status.HTTP_200_OK)
def get_price_trend_endpoint(
    produto: CommodityType,
    provincia: str,
    db: Session = Depends(get_db),
) -> dict:
    """Análise de tendência de um produto numa província.
    
    Retorna: preço atual, variação 7 dias, médias móveis, tendência.
    """
    trend = get_price_trend(db, produto, provincia)
    if trend.get("dados_insuficientes"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dados insuficientes para análise de tendência.",
        )
    return trend


@router.get("/{produto}/regional", status_code=status.HTTP_200_OK)
def get_regional_comparison_endpoint(
    produto: CommodityType,
    db: Session = Depends(get_db),
) -> list[dict]:
    """Comparação regional: preço do produto em todas as províncias.
    
    Retorna: lista ordenada por preço (maior primeiro).
    """
    return get_regional_comparison(db, produto)


@router.get("/{produto}/historico", status_code=status.HTTP_200_OK)
def get_price_history(
    produto: CommodityType,
    provincia: str,
    dias: int = 30,
    db: Session = Depends(get_db),
) -> list[dict]:
    """Histórico de preços dos últimos N dias."""
    from datetime import datetime, timedelta, timezone

    cutoff = datetime.now(timezone.utc) - timedelta(days=dias)
    records = (
        db.query(PriceRecord)
        .filter(
            PriceRecord.produto == produto,
            PriceRecord.provincia == provincia,
            PriceRecord.criado_em >= cutoff,
        )
        .order_by(PriceRecord.criado_em.asc())
        .all()
    )

    return [
        {
            "data": r.criado_em,
            "preco": float(r.preco_kg),
            "fonte": r.fonte,
        }
        for r in records
    ]