from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.crud.user import authenticate_user, create_user, get_user_by_email, get_user_by_id
from app.models.user import User
from app.schemas.token import Token, TokenRefreshRequest
from app.schemas.user import UserCreate, UserLogin, UserRead

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Cadastro de novo utilizador (agricultor, comprador, transportador,
    proprietário de máquinas ou administrador)."""
    existing = get_user_by_email(db, user_in.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email já registado")
    return create_user(db, user_in)


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login por email e senha. Retorna access token e refresh token (JWT)."""
    user = authenticate_user(db, credentials.email, credentials.senha)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
        )
    access_token = create_access_token(subject=str(user.id), extra_claims={"role": user.role.value})
    refresh_token = create_refresh_token(subject=str(user.id))
    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=Token)
def refresh_token(payload: TokenRefreshRequest, db: Session = Depends(get_db)):
    """Gera um novo access token a partir de um refresh token válido."""
    data = decode_token(payload.refresh_token)
    if data is None or data.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido")

    import uuid as _uuid

    try:
        user = get_user_by_id(db, _uuid.UUID(data["sub"]))
    except (ValueError, KeyError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido")
    if user is None or not user.ativo:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilizador inválido")

    access_token = create_access_token(subject=str(user.id), extra_claims={"role": user.role.value})
    new_refresh_token = create_refresh_token(subject=str(user.id))
    return Token(access_token=access_token, refresh_token=new_refresh_token)


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)):
    """Retorna os dados do utilizador autenticado."""
    return current_user


@router.post("/reset-password")
def reset_password(payload: dict, db: Session = Depends(get_db)):
    """Gerar uma senha temporária para o utilizador.
    MVP: devolve a senha temporária na resposta (sem SMTP configurado).
    Em produção com SMTP configurado, enviar por email e não devolver na resposta.
    """
    import secrets
    import string

    email = payload.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email é obrigatório.")

    user = get_user_by_email(db, email)
    if not user:
        # Resposta genérica por segurança (não revelar se o email existe)
        return {"detail": "Se o email existir, receberás instruções em breve."}

    # Gerar senha temporária segura: 10 caracteres alfanuméricos
    alphabet = string.ascii_letters + string.digits
    temp_password = "".join(secrets.choice(alphabet) for _ in range(10))

    from app.core.security import hash_password
    user.hashed_password = hash_password(temp_password)
    db.commit()

    # MVP: devolver a senha na resposta (substituir por email quando SMTP estiver configurado)
    return {
        "detail": "Senha temporária gerada com sucesso.",
        "temp_password": temp_password,
    }
