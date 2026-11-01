"""
Rotas para verificação de email/telefone por código OTP.

POST /verify/email/request — gera e envia código (usa sessão autenticada)
POST /verify/email/confirm — valida código
POST /verify/phone/request — gera e envia código (usa sessão autenticada)
POST /verify/phone/confirm — valida código
"""

import time
from collections import defaultdict
from threading import Lock

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

# Rate limiting local (para produção com múltiplos workers usar slowapi + Redis)
_rate_store: dict[str, list[float]] = defaultdict(list)
_rate_lock = Lock()


def _check_rate_limit(key: str, max_requests: int = 5, window_seconds: int = 3600) -> None:
    now = time.monotonic()
    with _rate_lock:
        _rate_store[key] = [t for t in _rate_store[key] if now - t < window_seconds]
        if len(_rate_store[key]) >= max_requests:
            raise HTTPException(
                status_code=429,
                detail="Demasiados pedidos. Aguarda antes de tentar novamente.",
                headers={"Retry-After": str(window_seconds)},
            )
        _rate_store[key].append(now)


from app.api.deps import get_current_user
from app.core.database import get_db
from app.crud.verification import generate_and_store_code, verify_code
from app.models.user import User
from app.models.verification import VerificationChannel
from app.utils.email import send_verification_email
from app.utils.sms import send_verification_sms

router = APIRouter(prefix="/verify", tags=["Verificação"])


class VerifyCodeRequest(BaseModel):
    code: str


@router.post("/email/request", status_code=status.HTTP_200_OK)
async def request_email_verification(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Gera um código de 6 dígitos e envia por email para o utilizador autenticado."""
    if current_user.email_verificado:
        return {"detail": "Email já verificado."}

    # Rate limiting: 3 pedidos por hora por utilizador
    _check_rate_limit(f"verify_email:user:{current_user.id}", max_requests=3, window_seconds=3600)
    _check_rate_limit(f"verify_email:ip:{request.client.host}", max_requests=5, window_seconds=3600)

    codigo = generate_and_store_code(db, current_user.id, VerificationChannel.EMAIL, current_user.email)

    success = send_verification_email(current_user.email, codigo)
    if not success:
        from app.core.config import settings
        if getattr(settings, "SMTP_HOST", None):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Falha ao enviar email. Tente novamente.",
            )

    return {"detail": "Código enviado com sucesso."}


@router.post("/email/confirm", status_code=status.HTTP_200_OK)
def confirm_email_verification(
    payload: VerifyCodeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Confirma o código e marca email como verificado."""
    verify_code(db, current_user.id, VerificationChannel.EMAIL, payload.code)

    current_user.email_verificado = True
    db.add(current_user)
    db.commit()

    return {"detail": "Email verificado com sucesso!"}


@router.post("/phone/request", status_code=status.HTTP_200_OK)
async def request_phone_verification(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Gera um código de 6 dígitos e envia por SMS para o utilizador autenticado."""
    if not current_user.telefone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Adiciona um número de telefone ao teu perfil primeiro.",
        )

    if current_user.telefone_verificado:
        return {"detail": "Telefone já verificado."}

    _check_rate_limit(f"verify_phone:user:{current_user.id}", max_requests=3, window_seconds=3600)
    _check_rate_limit(f"verify_phone:ip:{request.client.host}", max_requests=5, window_seconds=3600)

    codigo = generate_and_store_code(db, current_user.id, VerificationChannel.TELEFONE, current_user.telefone)

    success = await send_verification_sms(current_user.telefone, codigo)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha ao enviar SMS. Tente novamente.",
        )

    return {"detail": "Código enviado com sucesso."}


@router.post("/phone/confirm", status_code=status.HTTP_200_OK)
def confirm_phone_verification(
    payload: VerifyCodeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Confirma o código e marca telefone como verificado."""
    verify_code(db, current_user.id, VerificationChannel.TELEFONE, payload.code)

    current_user.telefone_verificado = True
    db.add(current_user)
    db.commit()

    return {"detail": "Telefone verificado com sucesso!"}
