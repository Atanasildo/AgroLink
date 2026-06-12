import uuid
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.map import MapEntityType, MapLocation
from app.schemas.map import MapLocationCreate


def create_map_location(db: Session, location_in: MapLocationCreate, utilizador_id: uuid.UUID) -> MapLocation:
    db_location = MapLocation(**location_in.model_dump(), utilizador_id=utilizador_id)
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location


def list_map_locations(
    db: Session,
    tipo: MapEntityType | None = None,
    provincia: str | None = None,
    municipio: str | None = None,
    bbox: tuple[Decimal, Decimal, Decimal, Decimal] | None = None,
) -> list[MapLocation]:
    """Listar pontos do mapa, opcionalmente filtrados por tipo, região ou
    caixa delimitadora (bbox = min_lat, min_lng, max_lat, max_lng)."""
    query = db.query(MapLocation)

    if tipo:
        query = query.filter(MapLocation.tipo == tipo)
    if provincia:
        query = query.filter(MapLocation.provincia.ilike(provincia))
    if municipio:
        query = query.filter(MapLocation.municipio.ilike(municipio))
    if bbox:
        min_lat, min_lng, max_lat, max_lng = bbox
        query = query.filter(
            MapLocation.latitude.between(min_lat, max_lat),
            MapLocation.longitude.between(min_lng, max_lng),
        )

    return query.all()


def delete_map_location(db: Session, db_location: MapLocation) -> None:
    db.delete(db_location)
    db.commit()


def get_map_location(db: Session, location_id: uuid.UUID) -> MapLocation | None:
    return db.query(MapLocation).filter(MapLocation.id == location_id).first()
