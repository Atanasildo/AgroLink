import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.crud.map import create_map_location, delete_map_location, get_map_location, list_map_locations
from app.models.map import MapEntityType
from app.models.user import User, UserRole
from app.schemas.map import MapLocationCreate, MapLocationRead

router = APIRouter(prefix="/map", tags=["Mapa Agrícola"])


@router.post("/locations", response_model=MapLocationRead, status_code=status.HTTP_201_CREATED)
def add_location(
    location_in: MapLocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Adicionar um ponto ao mapa (fazenda, produto, máquina, transportador
    ou cooperativa), exibido sobre OpenStreetMap."""
    return create_map_location(db, location_in, utilizador_id=current_user.id)


@router.get("/locations", response_model=list[MapLocationRead])
def search_locations(
    tipo: MapEntityType | None = Query(default=None),
    provincia: str | None = Query(default=None),
    municipio: str | None = Query(default=None),
    min_lat: Decimal | None = Query(default=None, ge=-90, le=90),
    min_lng: Decimal | None = Query(default=None, ge=-180, le=180),
    max_lat: Decimal | None = Query(default=None, ge=-90, le=90),
    max_lng: Decimal | None = Query(default=None, ge=-180, le=180),
    db: Session = Depends(get_db),
):
    """Buscar pontos no mapa: fazendas, produtos, máquinas, transportadores
    e cooperativas. Filtre por tipo, região ou área visível (bbox)."""
    bbox = None
    if None not in (min_lat, min_lng, max_lat, max_lng):
        bbox = (min_lat, min_lng, max_lat, max_lng)

    return list_map_locations(db, tipo=tipo, provincia=provincia, municipio=municipio, bbox=bbox)


@router.delete("/locations/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_location(
    location_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    location = get_map_location(db, location_id)
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Localização não encontrada")
    if location.utilizador_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")
    delete_map_location(db, location)
