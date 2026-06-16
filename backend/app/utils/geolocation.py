"""
Busca de entidades por proximidade geográfica usando PostGIS.

Permite encontrar transportadores, máquinas, produtos, etc, próximos a uma localização.
"""

import logging
from decimal import Decimal

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.models.transport_route import TransportRoute
from app.models.vehicle import Vehicle

logger = logging.getLogger(__name__)


def find_nearby_transporters(
    db: Session,
    latitude: float,
    longitude: float,
    radius_km: float = 50,
    limit: int = 10,
) -> list[dict]:
    """Encontra transportadores (veículos) próximos usando PostGIS.

    Args:
        db: Sessão do SQLAlchemy
        latitude: Latitude da origem
        longitude: Longitude da origem
        radius_km: Raio de busca em quilómetros
        limit: Número máximo de resultados

    Returns:
        Lista com transportadores e distância em km
    """
    try:
        # ST_DWithin: procura entidades dentro de N metros
        # ST_Distance: calcula distância em metros (precisa de cast para km)
        query = text("""
            SELECT
                v.id,
                v.proprietario_id,
                v.tipo,
                v.capacidade,
                v.matricula,
                v.localizacao,
                ROUND(
                    ST_Distance(
                        ST_Point(:lon, :lat)::geography,
                        ST_Point(
                            CAST(
                                (v.localizacao->'coordinates'->>1) AS FLOAT
                            ),
                            CAST(
                                (v.localizacao->'coordinates'->>0) AS FLOAT
                            )
                        )::geography
                    ) / 1000,
                    2
                ) AS distancia_km
            FROM vehicles v
            WHERE
                v.disponivel = TRUE
                AND ST_DWithin(
                    ST_Point(:lon, :lat)::geography,
                    ST_Point(
                        CAST(
                            (v.localizacao->'coordinates'->>1) AS FLOAT
                        ),
                        CAST(
                            (v.localizacao->'coordinates'->>0) AS FLOAT
                        )
                    )::geography,
                    :radius_m
                )
            ORDER BY distancia_km ASC
            LIMIT :lim
        """)

        results = db.execute(
            query,
            {
                "lat": latitude,
                "lon": longitude,
                "radius_m": radius_km * 1000,  # Converter para metros
                "lim": limit,
            },
        ).fetchall()

        return [
            {
                "id": str(r[0]),
                "proprietario_id": str(r[1]),
                "tipo": r[2],
                "capacidade": float(r[3]) if r[3] else None,
                "matricula": r[4],
                "distancia_km": float(r[6]),
            }
            for r in results
        ]
    except Exception as exc:
        logger.error("Erro na busca por proximidade: %s", exc)
        return []


def find_nearby_routes(
    db: Session,
    latitude: float,
    longitude: float,
    radius_km: float = 100,
    limit: int = 20,
) -> list[dict]:
    """Encontra rotas de transporte próximas à localização."""
    try:
        query = text("""
            SELECT
                tr.id,
                tr.proprietario_id,
                tr.origem,
                tr.destino,
                tr.data,
                tr.capacidade_disponivel,
                tr.preco_por_tonelada,
                ROUND(
                    ST_Distance(
                        ST_Point(:lon, :lat)::geography,
                        ST_Point(
                            CAST(tr.latitude AS FLOAT),
                            CAST(tr.longitude AS FLOAT)
                        )::geography
                    ) / 1000,
                    2
                ) AS distancia_km
            FROM transport_routes tr
            WHERE
                tr.capacidade_disponivel > 0
                AND tr.data > NOW()
                AND ST_DWithin(
                    ST_Point(:lon, :lat)::geography,
                    ST_Point(CAST(tr.latitude AS FLOAT), CAST(tr.longitude AS FLOAT))::geography,
                    :radius_m
                )
            ORDER BY distancia_km ASC
            LIMIT :lim
        """)

        results = db.execute(
            query,
            {
                "lat": latitude,
                "lon": longitude,
                "radius_m": radius_km * 1000,
                "lim": limit,
            },
        ).fetchall()

        return [
            {
                "id": str(r[0]),
                "proprietario_id": str(r[1]),
                "origem": r[2],
                "destino": r[3],
                "data": r[4],
                "capacidade_disponivel": float(r[5]) if r[5] else None,
                "preco_por_tonelada": float(r[6]) if r[6] else None,
                "distancia_km": float(r[7]),
            }
            for r in results
        ]
    except Exception as exc:
        logger.error("Erro na busca de rotas próximas: %s", exc)
        return []


def calculate_distance_km(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """Calcula distância entre dois pontos usando PostGIS."""
    try:
        result = db.query(
            func.ST_Distance(
                func.ST_Point(lon1, lat1).cast(func.geography),
                func.ST_Point(lon2, lat2).cast(func.geography),
            ) / 1000
        ).scalar()
        return float(result) if result else 0.0
    except Exception:
        # Fallback: fórmula de Haversine simples
        import math

        R = 6371  # Raio da Terra em km
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_lat / 2) ** 2
            + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
        )
        c = 2 * math.asin(math.sqrt(a))
        return R * c