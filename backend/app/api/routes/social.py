import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_current_user_optional
from app.core.database import get_db
from app.crud.social import (
    comments_counts_for_posts,
    count_comments,
    count_likes,
    create_comment,
    create_post,
    delete_post,
    get_post,
    has_liked,
    liked_post_ids,
    likes_counts_for_posts,
    list_comments,
    list_posts,
    toggle_like,
)
from app.models.social import PostType
from app.models.user import User, UserRole
from app.schemas.social import (
    CommentCreate,
    CommentRead,
    LikeToggleResult,
    PostCreate,
    PostRead,
)

router = APIRouter(prefix="/social", tags=["Rede Social Agrícola"])


def _serialize_post(post, db: Session, current_user: User | None) -> PostRead:
    return PostRead(
        id=post.id,
        autor_id=post.autor_id,
        conteudo=post.conteudo,
        tipo=post.tipo,
        imagens=post.imagens,
        criado_em=post.criado_em,
        autor=post.autor,
        likes_count=count_likes(db, post.id),
        comments_count=count_comments(db, post.id),
        curtido_por_mim=has_liked(db, post.id, current_user.id) if current_user else False,
    )


@router.post("/posts", response_model=PostRead, status_code=status.HTTP_201_CREATED)
def create_social_post(
    post_in: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Publicar um conteúdo na rede social (dúvida, dica, experiência ou notícia)."""
    db_post = create_post(db, post_in, autor_id=current_user.id)
    return _serialize_post(db_post, db, current_user)


@router.get("/posts", response_model=list[PostRead])
def list_social_posts(
    tipo: PostType | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """Feed da rede social agrícola, com contagem de curtidas e comentários.

    Pode ser filtrado por tipo: duvida, dica, experiencia ou noticia.
    """
    posts = list_posts(db, tipo=tipo, skip=skip, limit=limit)
    post_ids = [p.id for p in posts]

    likes = likes_counts_for_posts(db, post_ids)
    comments = comments_counts_for_posts(db, post_ids)
    liked = liked_post_ids(db, post_ids, current_user.id) if current_user else set()

    return [
        PostRead(
            id=p.id,
            autor_id=p.autor_id,
            conteudo=p.conteudo,
            tipo=p.tipo,
            imagens=p.imagens,
            criado_em=p.criado_em,
            autor=p.autor,
            likes_count=likes.get(p.id, 0),
            comments_count=comments.get(p.id, 0),
            curtido_por_mim=p.id in liked,
        )
        for p in posts
    ]


@router.get("/posts/{post_id}", response_model=PostRead)
def get_social_post(
    post_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publicação não encontrada")
    return _serialize_post(post, db, current_user)


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_social_post(
    post_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publicação não encontrada")
    if post.autor_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")
    delete_post(db, post)


@router.post("/posts/{post_id}/like", response_model=LikeToggleResult)
def toggle_social_post_like(
    post_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Curtir/descurtir uma publicação (alterna o estado)."""
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publicação não encontrada")

    curtido = toggle_like(db, post_id, current_user.id)
    return LikeToggleResult(curtido=curtido, likes_count=count_likes(db, post_id))


@router.get("/posts/{post_id}/comments", response_model=list[CommentRead])
def list_social_post_comments(post_id: uuid.UUID, db: Session = Depends(get_db)):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publicação não encontrada")
    return list_comments(db, post_id)


@router.post("/posts/{post_id}/comments", response_model=CommentRead, status_code=status.HTTP_201_CREATED)
def add_social_post_comment(
    post_id: uuid.UUID,
    comment_in: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publicação não encontrada")

    db_comment = create_comment(db, post_id, comment_in.conteudo, autor_id=current_user.id)
    db.refresh(db_comment)
    return db_comment
