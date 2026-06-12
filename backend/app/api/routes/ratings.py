import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.crud.rating import create_rating, get_rating_summary, list_ratings_for_user
from app.models.user import User
from app.schemas.rating import RatingCreate, RatingRead, UserRatingSummary

router = APIRouter(prefix="/ratings", tags=["Avaliações"])


@router.post("/", response_model=RatingRead, status_code=status.HTTP_201_CREATED)
def submit_rating(
    rating_in: RatingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Avaliar um utilizador (1 a 5 estrelas) com critérios de confiança,
    qualidade, pontualidade e atendimento."""
    return create_rating(db, rating_in, avaliador_id=current_user.id)


@router.get("/users/{user_id}", response_model=list[RatingRead])
def read_user_ratings(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """Listar todas as avaliações recebidas por um utilizador."""
    return list_ratings_for_user(db, user_id)


@router.get("/users/{user_id}/summary", response_model=UserRatingSummary)
def read_user_rating_summary(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """Obter a média geral e o total de avaliações recebidas por um utilizador."""
    media, total = get_rating_summary(db, user_id)
    return UserRatingSummary(media_geral=media, total_avaliacoes=total)
