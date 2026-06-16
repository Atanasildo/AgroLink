"""
Rotas para verificação de email/telefone por código OTP.

POST /auth/verify/email/request — gera e envia código
POST /auth/verify/email/confirm — valida código
POST /auth/verify/phone/request — gera e envia código  
POST /auth/verify/phone/confirm — valida código
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.crud.user import get_user_by_id
from app.crud.verification import generate_and_store_code, verify_code
from app.models.user import User
from app.models.verification import VerificationChannel
from app.utils.email import send_verification_email
from app.utils.sms import send_verification_sms

router = APIRouter(prefix="/auth", tags=["Autenticação"])


class VerifyEmailRequest(BaseModel):
    email: EmailStr


class VerifyPhoneRequest(BaseModel):
    telefone: str


class VerifyCodeRequest(BaseModel):
    codigo: str


@router.post("/verify/email/request", status_code=status.HTTP_200_OK)
async def request_email_verification(
    payload: VerifyEmailRequest, db: Session = Depends(get_db)
):
    """Gera um código de 6 dígitos e envia por email."""
    user = get_user_by_email(db, payload.email)
    if not user:
        # Não revelar se o email existe por segurança
        return {"detail": "Se o email existir, receberá instruções em breve."}

    codigo = generate_and_store_code(db, user.id, VerificationChannel.EMAIL, payload.email)

    # Enviar por email (ou simular em dev)
    success = send_verification_email(payload.email, codigo)
    if not success and "SMTP_HOST" in str(settings):
        # Em produção, SMTP deve estar configurado
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha ao enviar email. Tente novamente.",
        )

    return {"detail": "Código enviado com sucesso."}


@router.post("/verify/email/confirm", status_code=status.HTTP_200_OK)
def confirm_email_verification(
    payload: VerifyCodeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Confirma o código e marca email como verificado."""
    verify_code(db, current_user.id, VerificationChannel.EMAIL, payload.codigo)

    # Atualizar utilizador
    current_user.email_verificado = True
    db.add(current_user)
    db.commit()

    return {"detail": "Email verificado com sucesso!"}


@router.post("/verify/phone/request", status_code=status.HTTP_200_OK)
async def request_phone_verification(
    payload: VerifyPhoneRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Gera um código de 6 dígitos e envia por SMS."""
    if not payload.telefone or len(payload.telefone) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Telefone inválido.",
        )

    codigo = generate_and_store_code(db, current_user.id, VerificationChannel.TELEFONE, payload.telefone)

    # Enviar por SMS (ou simular em dev)
    success = await send_verification_sms(payload.telefone, codigo)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha ao enviar SMS. Tente novamente.",
        )

    return {"detail": "Código enviado com sucesso."}


@router.post("/verify/phone/confirm", status_code=status.HTTP_200_OK)
def confirm_phone_verification(
    payload: VerifyCodeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Confirma o código e marca telefone como verificado."""
    verify_code(db, current_user.id, VerificationChannel.TELEFONE, payload.codigo)

    # Atualizar utilizador
    current_user.telefone_verificado = True
    db.add(current_user)
    db.commit()

    return {"detail": "Telefone verificado com sucesso!"}


# Imports necessários
from app.core.config import settings
from app.crud.user import get_user_by_email