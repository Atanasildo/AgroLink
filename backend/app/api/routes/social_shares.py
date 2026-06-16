"""
Rotas para compartilhamentos (shares) na rede social.

POST /social/{post_id}/share — compartilha uma publicação
GET /social/{post_id}/shares — lista compartilhamentos
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.social import Post, PostShare
from app.models.user import User

router = APIRouter(prefix="/social", tags=["Rede Social"])


class ShareCreateRequest(BaseModel):
    comentario: str | None = None


@router.post("/{post_id}/share", status_code=status.HTTP_201_CREATED)
def create_share(
    post_id: str,
    payload: ShareCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Compartilha uma publicação.
    
    Args:
        post_id: UUID da publicação a compartilhar
        comentario: Comentário adicional ao compartilhar (opcional)
    """
    import uuid

    try:
        post = db.query(Post).filter(Post.id == uuid.UUID(post_id)).first()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="post_id inválido")

    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publicação não encontrada")

    # Verificar se já compartilhou (evitar duplicatas)
    existing = (
        db.query(PostShare)
        .filter(
            PostShare.post_id == post.id,
            PostShare.utilizador_id == current_user.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já compartilhou esta publicação.",
        )

    # Criar share
    share = PostShare(
        post_id=post.id,
        utilizador_id=current_user.id,
        comentario=payload.comentario,
    )
    db.add(share)
    db.commit()

    return {
        "id": str(share.id),
        "post_id": str(post.id),
        "utilizador_id": str(current_user.id),
        "criado_em": share.criado_em,
    }


@router.delete("/{post_id}/share", status_code=status.HTTP_204_NO_CONTENT)
def remove_share(
    post_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Remove um compartilhamento."""
    import uuid

    try:
        post = db.query(Post).filter(Post.id == uuid.UUID(post_id)).first()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="post_id inválido")

    share = (
        db.query(PostShare)
        .filter(
            PostShare.post_id == post.id,
            PostShare.utilizador_id == current_user.id,
        )
        .first()
    )

    if not share:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Compartilhamento não encontrado")

    db.delete(share)
    db.commit()


@router.get("/{post_id}/shares", status_code=status.HTTP_200_OK)
def list_shares(
    post_id: str,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
) -> dict:
    """Lista compartilhamentos de uma publicação."""
    import uuid

    try:
        post = db.query(Post).filter(Post.id == uuid.UUID(post_id)).first()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="post_id inválido")

    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publicação não encontrada")

    shares = (
        db.query(PostShare)
        .filter(PostShare.post_id == post.id)
        .offset(skip)
        .limit(limit)
        .all()
    )

    total = db.query(PostShare).filter(PostShare.post_id == post.id).count()

    return {
        "total": total,
        "shares": [
            {
                "id": str(s.id),
                "utilizador_id": str(s.utilizador_id),
                "utilizador_nome": s.utilizador.nome if s.utilizador else "Desconhecido",
                "comentario": s.comentario,
                "criado_em": s.criado_em,
            }
            for s in shares
        ],
    }