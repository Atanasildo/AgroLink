"""Envio de emails (SMTP ou log em dev)."""
import logging
import smtplib
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_verification_email(
    email: str,
    codigo: str,
    subject: str = "AgroLink - Código de Verificação",
    message_template: str | None = None,
) -> bool:
    """Envia email com código OTP ou senha temporária.

    Args:
        email: destinatário
        codigo: código OTP ou senha temporária (NUNCA devolver ao cliente HTTP)
        subject: assunto do email
        message_template: template opcional; usa {code} como placeholder.
            Se None, usa o template padrão de verificação OTP.
    """
    if message_template is None:
        body = (
            f"O seu código de verificação AgroLink é: {codigo}\n\n"
            f"Expira em {settings.VERIFICATION_CODE_EXPIRE_MINUTES} minutos."
        )
    else:
        body = message_template.format(code=codigo)

    if not settings.SMTP_HOST:
        # Em dev: nunca registar senhas no log de forma visível
        if "senha" in subject.lower() or "password" in subject.lower():
            logger.info("[DEV] Email de reset enviado para %s (conteúdo omitido por segurança)", email)
        else:
            logger.info("[DEV] Código OTP para %s: %s", email, codigo)
        return True
    try:
        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = subject
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
