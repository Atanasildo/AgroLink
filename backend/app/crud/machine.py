import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.machine import Machine, MachineRental, MachineRentalStatus
from app.schemas.machine import MachineCreate, MachineRentalCreate, MachineUpdate


# ---------- Máquinas ----------

def create_machine(db: Session, machine_in: MachineCreate, proprietario_id: uuid.UUID) -> Machine:
    data = machine_in.model_dump()
    # Schema usa valor_diario; coluna na BD é preco_diaria
    data["preco_diaria"] = data.pop("valor_diario")
    db_machine = Machine(**data, proprietario_id=proprietario_id)
    db.add(db_machine)
    db.commit()
    db.refresh(db_machine)
    return db_machine


def get_machine(db: Session, machine_id: uuid.UUID) -> Machine | None:
    return db.query(Machine).filter(Machine.id == machine_id).first()


def list_machines(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    provincia: str | None = None,
    municipio: str | None = None,
    disponivel: bool | None = True,
) -> list[Machine]:
    query = db.query(Machine)
    if disponivel is not None:
        query = query.filter(Machine.disponivel.is_(disponivel))
    if provincia:
        query = query.filter(Machine.provincia.ilike(provincia))
    if municipio:
        query = query.filter(Machine.municipio.ilike(municipio))
    return query.order_by(Machine.criado_em.desc()).offset(skip).limit(limit).all()


def update_machine(db: Session, db_machine: Machine, machine_in: MachineUpdate) -> Machine:
    update_data = machine_in.model_dump(exclude_unset=True)
    if "valor_diario" in update_data:
        update_data["preco_diaria"] = update_data.pop("valor_diario")
    for field, value in update_data.items():
        setattr(db_machine, field, value)
    db.add(db_machine)
    db.commit()
    db.refresh(db_machine)
    return db_machine


def delete_machine(db: Session, db_machine: Machine) -> None:
    db.delete(db_machine)
    db.commit()


# ---------- Reservas ----------

def _calculate_commission(valor_total: Decimal) -> tuple[Decimal, Decimal]:
    percentual = Decimal(str(settings.MACHINE_RENTAL_COMMISSION_PERCENT))
    comissao = (valor_total * percentual / Decimal("100")).quantize(Decimal("0.01"))
    return percentual, comissao


def create_rental(
    db: Session, machine: Machine, rental_in: MachineRentalCreate, locatario_id: uuid.UUID
) -> MachineRental:
    if not machine.disponivel:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Máquina não está disponível")

    dias = (rental_in.data_fim - rental_in.data_inicio).days + 1
    valor_total = (machine.preco_diaria * Decimal(dias)).quantize(Decimal("0.01"))
    percentual, comissao = _calculate_commission(valor_total)

    db_rental = MachineRental(
        maquina_id=machine.id,
        locatario_id=locatario_id,
        data_inicio=rental_in.data_inicio,
        data_fim=rental_in.data_fim,
        status=MachineRentalStatus.PENDENTE,
        valor_total=valor_total,
        comissao_percentual=percentual,
        valor_comissao=comissao,
    )
    db.add(db_rental)
    db.commit()
    db.refresh(db_rental)
    return db_rental


def get_rental(db: Session, rental_id: uuid.UUID) -> MachineRental | None:
    return db.query(MachineRental).filter(MachineRental.id == rental_id).first()


def list_rentals_for_owner(db: Session, proprietario_id: uuid.UUID) -> list[MachineRental]:
    return (
        db.query(MachineRental)
        .join(Machine, Machine.id == MachineRental.maquina_id)
        .filter(Machine.proprietario_id == proprietario_id)
        .order_by(MachineRental.criado_em.desc())
        .all()
    )


def list_rentals_for_locatario(db: Session, locatario_id: uuid.UUID) -> list[MachineRental]:
    return (
        db.query(MachineRental)
        .filter(MachineRental.locatario_id == locatario_id)
        .order_by(MachineRental.criado_em.desc())
        .all()
    )


def update_rental_status(db: Session, db_rental: MachineRental, new_status: MachineRentalStatus) -> MachineRental:
    valid_transitions: dict[MachineRentalStatus, set[MachineRentalStatus]] = {
        MachineRentalStatus.PENDENTE: {MachineRentalStatus.CONFIRMADO, MachineRentalStatus.CANCELADO},
        MachineRentalStatus.CONFIRMADO: {MachineRentalStatus.EM_ANDAMENTO, MachineRentalStatus.CANCELADO},
        MachineRentalStatus.EM_ANDAMENTO: {MachineRentalStatus.CONCLUIDO, MachineRentalStatus.CANCELADO},
        MachineRentalStatus.CONCLUIDO: set(),
        MachineRentalStatus.CANCELADO: set(),
    }

    if new_status not in valid_transitions.get(db_rental.status, set()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transição de status inválida: {db_rental.status.value} -> {new_status.value}",
        )

    db_rental.status = new_status

    machine = db.query(Machine).filter(Machine.id == db_rental.maquina_id).first()
    if machine:
        if new_status == MachineRentalStatus.CONFIRMADO:
            machine.disponivel = False
            db.add(machine)
        elif new_status in (MachineRentalStatus.CONCLUIDO, MachineRentalStatus.CANCELADO):
            machine.disponivel = True
            db.add(machine)

    db.add(db_rental)
    db.commit()
    db.refresh(db_rental)
    return db_rental
