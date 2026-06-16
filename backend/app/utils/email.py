"""Envio de emails (SMTP ou log em dev)."""
import logging
import smtplib
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_verification_email(email: str, codigo: str) -> bool:
    """Envia email com código OTP. Em dev (sem SMTP), apenas regista no log."""
    if not settings.SMTP_HOST:
        logger.info("[DEV] Código OTP para %s: %s", email, codigo)
        return True
    try:
        msg = MIMEText(
            f"O seu código de verificação AgroLink é: {codigo}\n\nExpira em {settings.VERIFICATION_CODE_EXPIRE_MINUTES} minutos.",
            "plain", "utf-8"
        )
        msg["Subject"] = "AgroLink - Código de Verificação"
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = email
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as s:
            s.starttls()
            s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            s.sendmail(settings.EMAIL_FROM, [email], msg.as_string())
        return True
    except Exception as exc:
        logger.error("Erro ao enviar email: %s", exc)
        return False
