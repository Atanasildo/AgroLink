import uuid

from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


def get_user_by_id(db: Session, user_id: uuid.UUID) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, user_in: UserCreate) -> User:
    db_user = User(
        nome=user_in.nome,
        email=user_in.email,
        telefone=user_in.telefone,
        role=user_in.role,
        provincia=user_in.provincia,
        municipio=user_in.municipio,
        hashed_password=hash_password(user_in.senha),
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, email: str, senha: str) -> User | None:
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(senha, user.hashed_password):
        return None
    return user


def update_user(db: Session, db_user: User, user_in: UserUpdate) -> User:
    update_data = user_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_user, field, value)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def search_users(
    db: Session,
    q: str | None = None,
    role: str | None = None,
    exclude_id: uuid.UUID | None = None,
    limit: int = 20,
) -> list[User]:
    query = db.query(User)
    if q:
        query = query.filter(User.nome.ilike(f"%{q}%"))
    if role:
        query = query.filter(User.role == role)
    if exclude_id:
        query = query.filter(User.id != exclude_id)
    return query.order_by(User.nome).limit(limit).all()
