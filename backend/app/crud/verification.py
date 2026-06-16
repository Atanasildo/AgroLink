"""
Lógica de negócio para código OTP (verificação de email/telefone).

Padrão: código de 6 dígitos, expiração e limite de tentativas.
"""

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.verification import VerificationChannel, VerificationCode


def _hash_code(codigo: str) -> str:
    """Hash SHA-256 do código (suficiente para 6 dígitos com expiração curta)."""
    return hashlib.sha256(codigo.encode("utf-8")).hexdigest()


def generate_and_store_code(
    db: Session, utilizador_id: uuid.UUID, canal: VerificationChannel, destino: str
) -> str:
    """Gera um código de 6 dígitos, guarda o hash, devolve o código em claro.
    
    Levanta HTTPException 429 se houver pedido recente (rate limit).
    """
    # Rate limit: evita reenvio em rajada
    recent_cutoff = datetime.now(timezone.utc) - timedelta(
        seconds=settings.VERIFICATION_CODE_RESEND_SECONDS
    )
    last = (
        db.query(VerificationCode)
        .filter(
            VerificationCode.utilizador_id == utilizador_id,
            VerificationCode.canal == canal,
            VerificationCode.criado_em >= recent_cutoff,
        )
        .order_by(desc(VerificationCode.criado_em))
        .first()
    )
    if last is not None:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Aguarde {settings.VERIFICATION_CODE_RESEND_SECONDS}s antes de pedir um novo código.",
        )

    codigo = f"{secrets.randbelow(1_000_000):06d}"
    expira_em = datetime.now(timezone.utc) + timedelta(
        minutes=settings.VERIFICATION_CODE_EXPIRE_MINUTES
    )

    db_code = VerificationCode(
        utilizador_id=utilizador_id,
        canal=canal,
        destino=destino,
        codigo_hash=_hash_code(codigo),
        expira_em=expira_em,
    )
    db.add(db_code)
    db.commit()
    return codigo


def verify_code(
    db: Session, utilizador_id: uuid.UUID, canal: VerificationChannel, codigo: str
) -> bool:
    """Verifica o código mais recente ainda não usado para este utilizador/canal.
    
    Retorna True se válido. Levanta HTTPException apropriado se inválido.
    """
    db_code = (
        db.query(VerificationCode)
        .filter(
            VerificationCode.utilizador_id == utilizador_id,
            VerificationCode.canal == canal,
            VerificationCode.usado == 0,
        )
        .order_by(desc(VerificationCode.criado_em))
        .first()
    )

    if db_code is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum código pendente. Solicite um novo.",
        )

    now = datetime.now(timezone.utc)
    expira_em = db_code.expira_em
    if expira_em.tzinfo is None:
        expira_em = expira_em.replace(tzinfo=timezone.utc)

    if expira_em < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Código expirado. Solicite um novo."
        )

    if db_code.tentativas >= settings.VERIFICATION_CODE_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Demasiadas tentativas. Solicite um novo código.",
        )

    if _hash_code(codigo) != db_code.codigo_hash:
        db_code.tentativas += 1
        db.add(db_code)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código incorreto.")

    db_code.usado = 1
    db.add(db_code)
    db.commit()
    return True