import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.crud.user import get_user_by_id, search_users, update_user
from app.models.user import User, UserRole
from app.schemas.user import AdminPromoteRequest, UserRead, UserUpdate

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


@router.post("/me/promote-admin", response_model=UserRead)
def promote_me_to_admin(
    payload: AdminPromoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Promove a própria conta autenticada a administrador.

    Requer a chave secreta definida na variável de ambiente ADMIN_SETUP_KEY
    do backend. Apenas o dono da aplicação conhece esta chave, por isso
    esta é a única forma de criar uma conta admin.
    """
    if not settings.ADMIN_SETUP_KEY or payload.chave != settings.ADMIN_SETUP_KEY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chave inválida")

    current_user.role = UserRole.ADMIN
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


class FCMTokenUpdate(BaseModel):
    fcm_token: str


@router.post("/me/fcm-token", response_model=UserRead)
def register_fcm_token(
    payload: FCMTokenUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Registar ou atualizar o token FCM do dispositivo móvel.

    Chamado pelo app Flutter após login ou quando o Firebase renova o token.
    Necessário para receber notificações push sobre transportes.
    """
    current_user.fcm_token = payload.fcm_token
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/{user_id}", response_model=UserRead)
def read_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """Visualizar o perfil público de um utilizador."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilizador não encontrado")
    return user


# ─── Denúncias ───────────────────────────────────────────────────────────────

import uuid as _uuid_mod
from datetime import datetime as _datetime
from pydantic import BaseModel as _BaseModel, ConfigDict as _ConfigDict
from app.models.report import Report, ReportReason as ReportReasonEnum


class ReportCreate(_BaseModel):
    denunciado_id: _uuid_mod.UUID
    motivo: ReportReasonEnum
    descricao: str | None = None


class ReportRead(_BaseModel):
    model_config = _ConfigDict(from_attributes=True)

    id: _uuid_mod.UUID
    denunciante_id: _uuid_mod.UUID
    denunciado_id: _uuid_mod.UUID
    motivo: ReportReasonEnum
    descricao: str | None = None
    criado_em: _datetime


@router.post("/reports", status_code=status.HTTP_201_CREATED)
def create_report(
    payload: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Criar uma denúncia contra outro utilizador."""
    if payload.denunciado_id == current_user.id:
        raise HTTPException(status_code=400, detail="Não é possível denunciar a si mesmo.")
    report = Report(
        denunciante_id=current_user.id,
        denunciado_id=payload.denunciado_id,
        motivo=payload.motivo,
        descricao=payload.descricao,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return {"id": str(report.id), "detail": "Denúncia registada com sucesso."}


@router.get("/reports", response_model=list[dict])
def list_my_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Listar as denúncias feitas pelo utilizador autenticado."""
    reports = db.query(Report).filter(Report.denunciante_id == current_user.id).all()
    return [
        {
            "id": str(r.id),
            "denunciado_id": str(r.denunciado_id),
            "motivo": r.motivo.value,
            "descricao": r.descricao,
            "criado_em": r.criado_em.isoformat() if r.criado_em else None,
        }
        for r in reports
    ]


@router.get("/reports/admin/all", response_model=list[dict])
def list_all_reports_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """Listar todas as denúncias da plataforma (apenas admin)."""
    from app.crud.user import get_user_by_id
    
    reports = db.query(Report).order_by(Report.criado_em.desc()).all()
    result = []
    for r in reports:
        denunciante = get_user_by_id(db, r.denunciante_id)
        denunciado = get_user_by_id(db, r.denunciado_id)
        result.append({
            "id": str(r.id),
            "denunciante_id": str(r.denunciante_id),
            "denunciante_nome": denunciante.nome if denunciante else "N/A",
            "denunciado_id": str(r.denunciado_id),
            "denunciado_nome": denunciado.nome if denunciado else "N/A",
            "motivo": r.motivo.value,
            "descricao": r.descricao,
            "criado_em": r.criado_em.isoformat() if r.criado_em else None,
        })
    return result
