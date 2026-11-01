import uuid

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.rating import Rating
from app.schemas.rating import RatingCreate


def create_rating(db: Session, rating_in: RatingCreate, avaliador_id: uuid.UUID) -> Rating:
    if rating_in.avaliado_id == avaliador_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível avaliar a si mesmo",
        )

    # Verificar se já existe avaliação deste par (defesa em camada de aplicação,
    # antes de chegar ao UniqueConstraint da BD)
    existing = (
        db.query(Rating)
        .filter(
            Rating.avaliador_id == avaliador_id,
            Rating.avaliado_id == rating_in.avaliado_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já avaliaste este utilizador. Só é permitida uma avaliação por utilizador.",
        )

    data = rating_in.model_dump()
    # Schema usa nota; coluna na BD é pontuacao
    data["pontuacao"] = data.pop("nota")

    db_rating = Rating(**data, avaliador_id=avaliador_id)
    db.add(db_rating)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já avaliaste este utilizador. Só é permitida uma avaliação por utilizador.",
        )
    db.refresh(db_rating)
    return db_rating


def list_ratings_for_user(db: Session, avaliado_id: uuid.UUID) -> list[Rating]:
    return (
        db.query(Rating)
        .filter(Rating.avaliado_id == avaliado_id)
        .order_by(Rating.criado_em.desc())
        .all()
    )


def get_rating_summary(db: Session, avaliado_id: uuid.UUID) -> tuple[float, int]:
    result = (
        db.query(func.avg(Rating.pontuacao), func.count(Rating.id))
        .filter(Rating.avaliado_id == avaliado_id)
        .first()
    )
    media, total = result
    return (round(float(media), 2) if media is not None else 0.0, total or 0)
