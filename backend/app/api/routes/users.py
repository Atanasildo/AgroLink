import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.crud.user import get_user_by_id, search_users, update_user
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["Utilizadores"])


@router.get("/", response_model=list[UserRead])
def list_users(
    q: Optional[str] = Query(None, description="Pesquisar por nome"),
    role: Optional[str] = Query(None, description="Filtrar por role"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Pesquisar utilizadores por nome (para iniciar nova conversa)."""
    return search_users(db, q=q, role=role, exclude_id=current_user.id, limit=limit)


@router.get("/me", response_model=UserRead)
def read_my_profile(current_user: User = Depends(get_current_user)):
    """Retornar o perfil do utilizador autenticado."""
    return current_user


@router.put("/me", response_model=UserRead)
def update_my_profile(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualizar o próprio perfil (nome, telefone, localização, bio, foto)."""
    return update_user(db, current_user, user_in)


@router.get("/{user_id}", response_model=UserRead)
def read_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """Visualizar o perfil público de um utilizador."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilizador não encontrado")
    return user
