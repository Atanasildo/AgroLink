"""
Rotas administrativas para moderação de conteúdo e gestão de denúncias.

POST /admin/moderate/product/{id}/approve — aprova produto
POST /admin/moderate/product/{id}/reject — rejeita produto
POST /admin/moderate/post/{id}/approve — aprova publicação social
POST /admin/moderate/post/{id}/reject — rejeita publicação social
GET /admin/reports — lista denúncias
POST /admin/reports/{id}/resolve — marca denúncia como resolvida
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.product import Product
from app.models.report import Report, ReportReason
from app.models.social import Post
from app.models.user import User, UserRole

router = APIRouter(prefix="/admin", tags=["Administração"])


def check_admin(user: User = Depends(get_current_user)) -> User:
    """Valida se utilizador é administrador."""
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso apenas para administradores")
    return user


class ModerationRequest(BaseModel):
    reason: Optional[str] = None


@router.post("/moderate/product/{product_id}/approve", status_code=status.HTTP_200_OK)
def approve_product(
    product_id: str,
    admin: User = Depends(check_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Aprova um produto para publicação."""
    import uuid

    try:
        product = db.query(Product).filter(Product.id == uuid.UUID(product_id)).first()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="product_id inválido")

    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado")

    product.aprovado = True
    product.flagged = False
    product.flag_reason = None
    db.add(product)
    db.commit()

    return {"detail": f"Produto {product.nome} aprovado"}


@router.post("/moderate/product/{product_id}/reject", status_code=status.HTTP_200_OK)
def reject_product(
    product_id: str,
    payload: ModerationRequest,
    admin: User = Depends(check_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Rejeita um produto (sem publicar)."""
    import uuid

    try:
        product = db.query(Product).filter(Product.id == uuid.UUID(product_id)).first()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="product_id inválido")

    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado")

    product.aprovado = False
    product.flagged = True
    product.flag_reason = payload.reason or "Rejeitado pela administração"
    db.add(product)
    db.commit()

    return {"detail": f"Produto {product.nome} rejeitado"}


@router.post("/moderate/post/{post_id}/approve", status_code=status.HTTP_200_OK)
def approve_post(
    post_id: str,
    admin: User = Depends(check_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Aprova uma publicação social para exibição."""
    import uuid

    try:
        post = db.query(Post).filter(Post.id == uuid.UUID(post_id)).first()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="post_id inválido")

    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publicação não encontrada")

    post.aprovado = True
    post.flagged = False
    post.flag_reason = None
    db.add(post)
    db.commit()

    return {"detail": "Publicação aprovada"}


@router.post("/moderate/post/{post_id}/reject", status_code=status.HTTP_200_OK)
def reject_post(
    post_id: str,
    payload: ModerationRequest,
    admin: User = Depends(check_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Rejeita uma publicação social."""
    import uuid

    try:
        post = db.query(Post).filter(Post.id == uuid.UUID(post_id)).first()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="post_id inválido")

    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publicação não encontrada")

    post.aprovado = False
    post.flagged = True
    post.flag_reason = payload.reason or "Rejeitada pela administração"
    db.add(post)
    db.commit()

    return {"detail": "Publicação rejeitada"}


@router.get("/reports", status_code=status.HTTP_200_OK)
def list_reports(
    skip: int = 0,
    limit: int = 50,
    admin: User = Depends(check_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Lista todas as denúncias."""
    reports = db.query(Report).offset(skip).limit(limit).all()
    total = db.query(Report).count()

    return {
        "total": total,
        "reports": [
            {
                "id": str(r.id),
                "denunciante_id": str(r.denunciante_id),
                "denunciado_id": str(r.denunciado_id),
                "motivo": r.motivo,
                "descricao": r.descricao,
                "criado_em": r.criado_em,
            }
            for r in reports
        ],
    }


@router.post("/reports/{report_id}/resolve", status_code=status.HTTP_200_OK)
def resolve_report(
    report_id: str,
    admin: User = Depends(check_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Marca uma denúncia como resolvida (apaga-a)."""
    import uuid

    try:
        report = db.query(Report).filter(Report.id == uuid.UUID(report_id)).first()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="report_id inválido")

    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Denúncia não encontrada")

    db.delete(report)
    db.commit()

    return {"detail": "Denúncia resolvida e removida"}


@router.get("/dashboard", status_code=status.HTTP_200_OK)
def admin_dashboard(
    admin: User = Depends(check_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Dashboard administrativo com estatísticas."""
    from app.models.machine import Machine
    from app.models.payment import Payment, PaymentStatus
    from app.models.transport_request import TransportRequest

    total_users = db.query(User).count()
    total_products = db.query(Product).count()
    products_pending = db.query(Product).filter(Product.aprovado == False).count()
    total_reports = db.query(Report).count()
    total_payments = db.query(Payment).count()
    payments_pending = db.query(Payment).filter(Payment.status == PaymentStatus.PENDENTE).count()
    total_transports = db.query(TransportRequest).count()
    total_machines = db.query(Machine).count()

    return {
        "utilizadores": total_users,
        "produtos": {
            "total": total_products,
            "aguardando_aprovacao": products_pending,
        },
        "denuncias": total_reports,
        "pagamentos": {
            "total": total_payments,
            "pendentes": payments_pending,
        },
        "transportes": total_transports,
        "maquinas": total_machines,
    }