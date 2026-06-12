import uuid

from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle
from app.schemas.transport import VehicleCreate, VehicleUpdate


def create_vehicle(db: Session, vehicle_in: VehicleCreate, proprietario_id: uuid.UUID) -> Vehicle:
    db_vehicle = Vehicle(**vehicle_in.model_dump(), proprietario_id=proprietario_id)
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle


def get_vehicle(db: Session, vehicle_id: uuid.UUID) -> Vehicle | None:
    return db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()


def list_vehicles_by_owner(db: Session, proprietario_id: uuid.UUID) -> list[Vehicle]:
    return db.query(Vehicle).filter(Vehicle.proprietario_id == proprietario_id).all()


def update_vehicle(db: Session, db_vehicle: Vehicle, vehicle_in: VehicleUpdate) -> Vehicle:
    update_data = vehicle_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_vehicle, field, value)
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle


def delete_vehicle(db: Session, db_vehicle: Vehicle) -> None:
    db.delete(db_vehicle)
    db.commit()
