"""
Firebase Cloud Messaging (FCM) HTTP v1 API.

Migração da API legacy (deprecated em julho 2024) para HTTP v1 com OAuth2.

Configuração necessária:
1. Criar conta de serviço em Firebase Console
2. Descarregar JSON da chave privada
3. Configurar variáveis de ambiente:
   - FCM_PROJECT_ID = ID do projeto Firebase
   - FCM_SERVICE_ACCOUNT_JSON = conteúdo completo do JSON em uma linha
"""

import json
import logging
from datetime import datetime, timedelta, timezone

import google.auth
import google.auth.transport.requests
import httpx
from google.oauth2 import service_account

from app.core.config import settings

logger = logging.getLogger(__name__)

_FCM_ACCESS_TOKEN = None
_FCM_TOKEN_EXPIRES_AT = None


async def _get_fcm_access_token() -> str | None:
    """Obtém token OAuth2 para FCM HTTP v1.
    
    Caching local com renovação automática se expirado.
    """
    global _FCM_ACCESS_TOKEN, _FCM_TOKEN_EXPIRES_AT

    if not settings.FCM_SERVICE_ACCOUNT_JSON or not settings.FCM_PROJECT_ID:
        logger.debug("FCM não configurado (SERVICE_ACCOUNT_JSON ou PROJECT_ID ausentes)")
        return None

    # Verificar cache
    if _FCM_ACCESS_TOKEN and _FCM_TOKEN_EXPIRES_AT:
        if datetime.now(timezone.utc) < _FCM_TOKEN_EXPIRES_AT:
            return _FCM_ACCESS_TOKEN

    try:
        # Fazer parse do JSON da conta de serviço
        creds_dict = json.loads(settings.FCM_SERVICE_ACCOUNT_JSON)
        creds = service_account.Credentials.from_service_account_info(
            creds_dict, scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )

        # Renovar token
        auth_request = google.auth.transport.requests.Request()
        creds.refresh(auth_request)

        _FCM_ACCESS_TOKEN = creds.token
        # Token OAuth2 expira tipicamente em 1 hora — renovar com margem
        _FCM_TOKEN_EXPIRES_AT = datetime.now(timezone.utc) + timedelta(minutes=55)
        return _FCM_ACCESS_TOKEN
    except Exception as exc:
        logger.error("Erro ao obter token FCM: %s", exc)
        return None


async def send_push_notification(
    token: str, title: str, body: str, data: dict | None = None
) -> bool:
    """Envia notificação push via FCM HTTP v1 para um dispositivo específico.
    
    Args:
        token: FCM token do dispositivo
        title: Título da notificação
        body: Corpo da notificação
        data: Dados adicionais (pares chave-valor)
        
    Returns:
        True se enviada com sucesso
    """
    access_token = await _get_fcm_access_token()
    if not access_token:
        logger.warning("Não foi possível obter token FCM, notificação não será enviada")
        return False

    try:
        message = {
            "message": {
                "token": token,
                "notification": {"title": title, "body": body},
            }
        }
        if data:
            message["message"]["data"] = {k: str(v) for k, v in data.items()}

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"https://fcm.googleapis.com/v1/projects/{settings.FCM_PROJECT_ID}/messages:send",
                json=message,
                headers={"Authorization": f"Bearer {access_token}"},
            )

            if response.status_code == 200:
                logger.info("Notificação push enviada com sucesso para %s", token[:20])
                return True
            else:
                logger.error("Erro FCM %s: %s", response.status_code, response.text[:200])
                return False
    except Exception as exc:
        logger.error("Erro ao enviar notificação push: %s", exc)
        return False


async def send_multicast_notification(
    tokens: list[str], title: str, body: str, data: dict | None = None
) -> int:
    """Envia notificação para vários tokens em paralelo.
    
    Returns:
        Número de tokens para os quais a notificação foi enviada com sucesso
    """
    if not tokens:
        return 0

    access_token = await _get_fcm_access_token()
    if not access_token:
        return 0

    try:
        message = {
            "message": {
                "notification": {"title": title, "body": body},
            }
        }
        if data:
            message["message"]["data"] = {k: str(v) for k, v in data.items()}

        success_count = 0
        async with httpx.AsyncClient(timeout=10) as client:
            for token in tokens:
                message["message"]["token"] = token
                try:
                    response = await client.post(
                        f"https://fcm.googleapis.com/v1/projects/{settings.FCM_PROJECT_ID}/messages:send",
                        json=message,
                        headers={"Authorization": f"Bearer {access_token}"},
                    )
                    if response.status_code == 200:
                        success_count += 1
                except Exception as exc:
                    logger.debug("Erro ao enviar para token %s: %s", token[:20], exc)

        logger.info("Notificações multicast: %d/%d enviadas com sucesso", success_count, len(tokens))
        return success_count
    except Exception as exc:
        logger.error("Erro em multicast notification: %s", exc)
        return 0