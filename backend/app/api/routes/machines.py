import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.crud.machine import (
    create_machine,
    create_rental,
    delete_machine,
    get_machine,
    get_rental,
    list_machines,
    list_rentals_for_locatario,
    list_rentals_for_owner,
    update_machine,
    update_rental_status,
)
from app.models.machine import Machine
from app.models.user import User, UserRole
from app.schemas.machine import (
    MachineCreate,
    MachineRead,
    MachineRentalCreate,
    MachineRentalRead,
    MachineRentalUpdateStatus,
    MachineUpdate,
)

router = APIRouter(prefix="/machines", tags=["Aluguel de Máquinas"])


@router.post("/", response_model=MachineRead, status_code=status.HTTP_201_CREATED)
def register_machine(
    machine_in: MachineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PROPRIETARIO_MAQUINAS)),
):
    """Registar um equipamento (trator, colheitadeira, pulverizador, arado, sistema de irrigação)."""
    return create_machine(db, machine_in, proprietario_id=current_user.id)


@router.get("/", response_model=list[MachineRead])
def search_machines(
    provincia: str | None = Query(default=None),
    municipio: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Listar máquinas disponíveis para aluguel."""
    return list_machines(db, skip=skip, limit=limit, provincia=provincia, municipio=municipio)


@router.get("/me", response_model=list[MachineRead])
def my_machines(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PROPRIETARIO_MAQUINAS)),
):
    """Listar as minhas máquinas registadas."""
    return (
        db.query(Machine)
        .filter(Machine.proprietario_id == current_user.id)
        .order_by(Machine.criado_em.desc())
        .all()
    )


@router.get("/{machine_id}", response_model=MachineRead)
def read_machine(machine_id: uuid.UUID, db: Session = Depends(get_db)):
    machine = get_machine(db, machine_id)
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Máquina não encontrada")
    return machine


@router.put("/{machine_id}", response_model=MachineRead)
def edit_machine(
    machine_id: uuid.UUID,
    machine_in: MachineUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualizar dados ou disponibilidade do equipamento."""
    machine = get_machine(db, machine_id)
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Máquina não encontrada")
    if machine.proprietario_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")
    return update_machine(db, machine, machine_in)


@router.delete("/{machine_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_machine(
    machine_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    machine = get_machine(db, machine_id)
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Máquina não encontrada")
    if machine.proprietario_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")
    delete_machine(db, machine)


# ---------- Reservas ----------

@router.post("/{machine_id}/rentals", response_model=MachineRentalRead, status_code=status.HTTP_201_CREATED)
def request_rental(
    machine_id: uuid.UUID,
    rental_in: MachineRentalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.AGRICULTOR)),
):
    """Agricultor solicita reserva de uma máquina. A plataforma calcula
    automaticamente o valor total e a comissão (10%)."""
    machine = get_machine(db, machine_id)
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Máquina não encontrada")
    return create_rental(db, machine, rental_in, locatario_id=current_user.id)


@router.get("/rentals/me", response_model=list[MachineRentalRead])
def my_rentals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Listar reservas: como agricultor (solicitadas) ou proprietário (recebidas)."""
    if current_user.role == UserRole.PROPRIETARIO_MAQUINAS:
        return list_rentals_for_owner(db, current_user.id)
    return list_rentals_for_locatario(db, current_user.id)


@router.patch("/rentals/{rental_id}/status", response_model=MachineRentalRead)
def change_rental_status(
    rental_id: uuid.UUID,
    status_in: MachineRentalUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualizar status da reserva: pendente -> aprovado -> em_andamento -> concluido
    (ou cancelado nas etapas anteriores à conclusão)."""
    rental = get_rental(db, rental_id)
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reserva não encontrada")

    machine = get_machine(db, rental.maquina_id)
    is_owner = machine and machine.proprietario_id == current_user.id
    is_farmer = rental.locatario_id == current_user.id
    if not (is_owner or is_farmer or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    return update_rental_status(db, rental, status_in.status)
