import uuid

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.rating import Rating
from app.schemas.rating import RatingCreate


def create_rating(db: Session, rating_in: RatingCreate, avaliador_id: uuid.UUID) -> Rating:
    if rating_in.avaliado_id == avaliador_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Não é possível avaliar a si mesmo")

    data = rating_in.model_dump()
    # Schema usa nota; coluna na BD é pontuacao
    data["pontuacao"] = data.pop("nota")

    db_rating = Rating(**data, avaliador_id=avaliador_id)
    db.add(db_rating)
    db.commit()
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
