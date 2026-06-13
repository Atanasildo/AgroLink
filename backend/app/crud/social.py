import uuid

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.social import Post, PostComment, PostLike, PostType
from app.schemas.social import PostCreate


def create_post(db: Session, post_in: PostCreate, autor_id: uuid.UUID) -> Post:
    db_post = Post(**post_in.model_dump(), autor_id=autor_id)
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post


def get_post(db: Session, post_id: uuid.UUID) -> Post | None:
    return (
        db.query(Post)
        .options(joinedload(Post.autor))
        .filter(Post.id == post_id)
        .first()
    )


def list_posts(
    db: Session,
    tipo: PostType | None = None,
    skip: int = 0,
    limit: int = 20,
) -> list[Post]:
    query = db.query(Post).options(joinedload(Post.autor))
    if tipo is not None:
        query = query.filter(Post.tipo == tipo)
    return query.order_by(Post.criado_em.desc()).offset(skip).limit(limit).all()


def delete_post(db: Session, post: Post) -> None:
    db.delete(post)
    db.commit()


def count_likes(db: Session, post_id: uuid.UUID) -> int:
    return db.query(PostLike).filter(PostLike.post_id == post_id).count()


def has_liked(db: Session, post_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    return (
        db.query(PostLike)
        .filter(PostLike.post_id == post_id, PostLike.utilizador_id == user_id)
        .first()
        is not None
    )


def toggle_like(db: Session, post_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    """Alterna o "like" de um utilizador numa publicação.

    Devolve True se o like foi adicionado, False se foi removido.
    """
    existing = (
        db.query(PostLike)
        .filter(PostLike.post_id == post_id, PostLike.utilizador_id == user_id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
        return False

    db.add(PostLike(post_id=post_id, utilizador_id=user_id))
    db.commit()
    return True


def count_comments(db: Session, post_id: uuid.UUID) -> int:
    return db.query(PostComment).filter(PostComment.post_id == post_id).count()


def list_comments(db: Session, post_id: uuid.UUID) -> list[PostComment]:
    return (
        db.query(PostComment)
        .options(joinedload(PostComment.autor))
        .filter(PostComment.post_id == post_id)
        .order_by(PostComment.criado_em.asc())
        .all()
    )


def create_comment(db: Session, post_id: uuid.UUID, conteudo: str, autor_id: uuid.UUID) -> PostComment:
    db_comment = PostComment(post_id=post_id, conteudo=conteudo, autor_id=autor_id)
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment


def likes_counts_for_posts(db: Session, post_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
    if not post_ids:
        return {}
    rows = (
        db.query(PostLike.post_id, func.count(PostLike.id))
        .filter(PostLike.post_id.in_(post_ids))
        .group_by(PostLike.post_id)
        .all()
    )
    return {row[0]: row[1] for row in rows}


def comments_counts_for_posts(db: Session, post_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
    if not post_ids:
        return {}
    rows = (
        db.query(PostComment.post_id, func.count(PostComment.id))
        .filter(PostComment.post_id.in_(post_ids))
        .group_by(PostComment.post_id)
        .all()
    )
    return {row[0]: row[1] for row in rows}


def liked_post_ids(db: Session, post_ids: list[uuid.UUID], user_id: uuid.UUID) -> set[uuid.UUID]:
    if not post_ids:
        return set()
    rows = (
        db.query(PostLike.post_id)
        .filter(PostLike.post_id.in_(post_ids), PostLike.utilizador_id == user_id)
        .all()
    )
    return {row[0] for row in rows}
