"""Envio de SMS (Africa's Talking ou log em dev)."""
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_verification_sms(telefone: str, codigo: str) -> bool:
    """Envia SMS com código OTP. Em dev (sem API key), apenas regista no log."""
    if not settings.SMS_API_KEY:
        logger.info("[DEV] SMS OTP para %s: %s", telefone, codigo)
        return True
    try:
        import httpx
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                "https://api.africastalking.com/version1/messaging",
                headers={"apiKey": settings.SMS_API_KEY, "Accept": "application/json"},
                data={
                    "username": "agrolink",
                    "to": telefone,
                    "message": f"AgroLink: o seu código é {codigo}. Expira em {settings.VERIFICATION_CODE_EXPIRE_MINUTES} min.",
                    "from": settings.SMS_SENDER_ID,
                },
            )
        return response.status_code == 201
    except Exception as exc:
        logger.error("Erro ao enviar SMS: %s", exc)
        return False
