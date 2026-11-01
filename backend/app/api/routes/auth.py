import time
from collections import defaultdict
from threading import Lock

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

# ── Rate limiting simples em memória ─────────────────────────────────────────
# Para produção com múltiplos workers, substituir por slowapi + Redis.
_rate_store: dict[str, list[float]] = defaultdict(list)
_rate_lock = Lock()


def _check_rate_limit(key: str, max_requests: int = 5, window_seconds: int = 300) -> None:
    """Levanta 429 se `key` exceder `max_requests` em `window_seconds`."""
    now = time.monotonic()
    with _rate_lock:
        timestamps = _rate_store[key]
        # Remover entradas fora da janela
        _rate_store[key] = [t for t in timestamps if now - t < window_seconds]
        if len(_rate_store[key]) >= max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Demasiadas tentativas. Aguarda alguns minutos antes de tentar novamente.",
                headers={"Retry-After": str(window_seconds)},
            )
        _rate_store[key].append(now)

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.crud.user import authenticate_user, create_user, get_user_by_email, get_user_by_id
from app.models.user import User
from app.schemas.token import Token, TokenRefreshRequest
from app.schemas.user import UserCreate, UserLogin, UserRead, ChangePasswordRequest

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(request: Request, user_in: UserCreate, db: Session = Depends(get_db)):
    """Cadastro de novo utilizador (agricultor, comprador, transportador,
    proprietário de máquinas ou administrador)."""
    _check_rate_limit(f"register:{request.client.host}", max_requests=10, window_seconds=3600)
    existing = get_user_by_email(db, user_in.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email já registado")
    return create_user(db, user_in)


@router.post("/login", response_model=Token)
def login(request: Request, credentials: UserLogin, db: Session = Depends(get_db)):
    """Login por email e senha. Retorna access token e refresh token (JWT)."""
    # Rate limit por IP (5 tentativas / 5 min) e por email (10 tentativas / 15 min)
    _check_rate_limit(f"login:ip:{request.client.host}", max_requests=5, window_seconds=300)
    _check_rate_limit(f"login:email:{credentials.email.lower()}", max_requests=10, window_seconds=900)
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


class ResetPasswordRequest(BaseModel):
    email: str


@router.post("/reset-password")
def reset_password(request: Request, payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Envia um código OTP por email para redefinir a senha.

    A resposta é sempre genérica — não revela se o email existe.
    A senha temporária NUNCA é devolvida na resposta HTTP.
    """
    import secrets
    import string

    from app.core.config import settings as _cfg
    from app.core.security import hash_password
    from app.utils.email import send_verification_email

    # Rate limit: 3 pedidos por email por hora
    email = payload.email.strip().lower()
    _check_rate_limit(f"reset:{email}", max_requests=3, window_seconds=3600)
    _check_rate_limit(f"reset:ip:{request.client.host}", max_requests=5, window_seconds=3600)

    if not email:
        raise HTTPException(status_code=400, detail="Email é obrigatório.")

    user = get_user_by_email(db, email)

    # Resposta genérica independentemente de o utilizador existir
    generic_response = {"detail": "Se o email existir, receberás instruções em breve."}

    if not user:
        return generic_response

    # Gerar senha temporária segura (12 chars: letras + dígitos)
    alphabet = string.ascii_letters + string.digits
    temp_password = "".join(secrets.choice(alphabet) for _ in range(12))

    user.hashed_password = hash_password(temp_password)
    db.commit()

    # Enviar por email — NÃO devolver na resposta
    try:
        send_verification_email(
            email,
            temp_password,
            subject="AgroLink — Senha Temporária",
            message_template=(
                "A sua senha temporária é: {code}\n\n"
                "Use-a para iniciar sessão e altere-a imediatamente em Definições > Segurança.\n"
                "Esta senha expira em 24 horas."
            ),
        )
    except Exception:
        # Falha silenciosa no envio de email não deve revelar info ao cliente
        import logging as _log
        _log.getLogger(__name__).error("Falha ao enviar email de reset para %s", email)

    return generic_response


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mudar a senha do utilizador autenticado (a partir de senha atual ou temporária)."""
    from app.core.security import hash_password, verify_password
    
    # Verificar que a senha atual está correta
    if not verify_password(payload.senha_atual, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Senha atual incorreta"
        )
    
    # Garantir que a nova senha é diferente da antiga
    if payload.senha_atual == payload.senha_nova:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha deve ser diferente da senha atual"
        )
    
    # Atualizar a senha
    current_user.hashed_password = hash_password(payload.senha_nova)
    db.add(current_user)
    db.commit()
    
    return {"detail": "Senha alterada com sucesso."}
