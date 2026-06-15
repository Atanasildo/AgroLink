"""
Rotas de administração — dados reais da base de dados.
Apenas utilizadores com role=admin têm acesso.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.transport_request import TransportRequest, TransportStatus
from app.models.transport_route import TransportRoute
from app.models.machine import Machine
from app.models.payment import Payment, PaymentStatus
from app.schemas.user import UserRead

router = APIRouter(prefix="/admin", tags=["Administração"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas administradores")
    return current_user


@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Estatísticas reais da plataforma para o painel de administração."""

    # Contagem de utilizadores por role
    role_counts = dict(
        db.query(User.role, func.count(User.id))
        .filter(User.ativo == True)
        .group_by(User.role)
        .all()
    )

    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.ativo == True).scalar() or 0

    # Transporte
    total_requests = db.query(func.count(TransportRequest.id)).scalar() or 0
    active_routes = (
        db.query(func.count(TransportRoute.id))
        .filter(TransportRoute.capacidade_disponivel_toneladas > 0)
        .scalar() or 0
    )
    requests_by_status = dict(
        db.query(TransportRequest.status, func.count(TransportRequest.id))
        .group_by(TransportRequest.status)
        .all()
    )

    # Produtos
    total_products = db.query(func.count(Product.id)).filter(Product.ativo == True).scalar() or 0

    # Máquinas
    total_machines = db.query(func.count(Machine.id)).filter(Machine.disponivel == True).scalar() or 0

    # Pagamentos
    payment_stats = (
        db.query(
            func.count(Payment.id).label("total"),
            func.coalesce(func.sum(case((Payment.status == PaymentStatus.PAGO, Payment.valor), else_=0)), 0).label("receita_total"),
        )
        .first()
    )

    return {
        "utilizadores": {
            "total": total_users,
            "ativos": active_users,
            "por_role": {
                "agricultor": role_counts.get(UserRole.AGRICULTOR, 0),
                "comprador": role_counts.get(UserRole.COMPRADOR, 0),
                "transportador": role_counts.get(UserRole.TRANSPORTADOR, 0),
                "proprietario_maquinas": role_counts.get(UserRole.PROPRIETARIO_MAQUINAS, 0),
                "admin": role_counts.get(UserRole.ADMIN, 0),
            },
        },
        "transporte": {
            "total_pedidos": total_requests,
            "rotas_ativas": active_routes,
            "por_status": {
                "pendente": requests_by_status.get(TransportStatus.PENDENTE, 0),
                "aceite": requests_by_status.get(TransportStatus.ACEITE, 0),
                "em_andamento": requests_by_status.get(TransportStatus.EM_ANDAMENTO, 0),
                "concluido": requests_by_status.get(TransportStatus.CONCLUIDO, 0),
                "cancelado": requests_by_status.get(TransportStatus.CANCELADO, 0),
            },
        },
        "marketplace": {
            "produtos_ativos": total_products,
        },
        "maquinas": {
            "disponiveis": total_machines,
        },
        "pagamentos": {
            "total_transacoes": int(payment_stats.total) if payment_stats else 0,
            "receita_total": float(payment_stats.receita_total) if payment_stats else 0.0,
        },
    }


@router.get("/users", response_model=list[UserRead])
def list_all_users(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Listar todos os utilizadores (paginado)."""
    return db.query(User).order_by(User.criado_em.desc()).offset(skip).limit(limit).all()


@router.patch("/users/{user_id}/toggle-active", response_model=UserRead)
def toggle_user_active(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Activar ou suspender um utilizador."""
    import uuid as _uuid
    user = db.query(User).filter(User.id == _uuid.UUID(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Não é possível suspender um admin")
    user.ativo = not user.ativo
    db.commit()
    db.refresh(user)
    return user


@router.get("/transport/requests")
def list_all_transport_requests(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Listar todos os pedidos de transporte."""
    from app.schemas.transport import TransportRequestRead
    requests = (
        db.query(TransportRequest)
        .order_by(TransportRequest.criado_em.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return requests


@router.get("/transport/routes")
def list_all_transport_routes(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Listar todas as rotas de transporte."""
    routes = (
        db.query(TransportRoute)
        .order_by(TransportRoute.criado_em.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return routes
