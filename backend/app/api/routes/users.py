import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.crud.user import get_user_by_id, update_user
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["Utilizadores"])


@router.get("/{user_id}", response_model=UserRead)
def read_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """Visualizar o perfil público de um utilizador."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilizador não encontrado")
    return user


@router.put("/me", response_model=UserRead)
def update_my_profile(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualizar o próprio perfil (nome, telefone, localização, bio, foto)."""
    return update_user(db, current_user, user_in)
