"""
backend/app/utils/notifications.py

Serviço de notificações push via Firebase Cloud Messaging (FCM).
Usado para alertar agricultores e transportadores sobre eventos de transporte
mesmo quando a app está em segundo plano ou fechada.

Configuração necessária no .env:
  FCM_SERVER_KEY=AAAA...  (Firebase Cloud Messaging Server Key — Console Firebase > Project Settings > Cloud Messaging)

Modelo de utilizador deve ter o campo fcm_token (VARCHAR) para guardar
o token do dispositivo registado pelo cliente Flutter/web.

Adicionar ao modelo User:
  fcm_token = Column(String, nullable=True)

E à migration Alembic:
  op.add_column('users', sa.Column('fcm_token', sa.String(), nullable=True))
"""

import logging
from enum import Enum

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

FCM_ENDPOINT = "https://fcm.googleapis.com/fcm/send"


class TransportNotificationType(str, Enum):
    REQUEST_RECEIVED = "request_received"      # Transportador: nova solicitação
    REQUEST_ACCEPTED = "request_accepted"      # Agricultor: pedido aceite
    TRIP_STARTED = "trip_started"              # Agricultor: viagem iniciada
    TRIP_COMPLETED = "trip_completed"          # Agricultor: viagem concluída
    REQUEST_CANCELLED = "request_cancelled"    # Ambos: cancelado


_STATUS_MESSAGES: dict[str, tuple[str, str]] = {
    # status -> (título, corpo) para notificação ao agricultor
    "aceite": (
        "✅ Transporte aceite!",
        "O transportador aceitou o seu pedido. Pode acompanhar a carga em tempo real.",
    ),
    "em_andamento": (
        "🚛 Viagem iniciada",
        "O seu transporte está em andamento. Acompanhe a localização no mapa.",
    ),
    "concluido": (
        "🎉 Transporte concluído",
        "A sua carga chegou ao destino. Não se esqueça de avaliar o transportador.",
    ),
    "cancelado": (
        "❌ Transporte cancelado",
        "O seu pedido de transporte foi cancelado.",
    ),
}

_TRANSPORTER_STATUS_MESSAGES: dict[str, tuple[str, str]] = {
    "pendente": (
        "📦 Nova solicitação de transporte",
        "Um agricultor quer transportar carga na sua rota. Aceite o pedido.",
    ),
    "cancelado": (
        "❌ Solicitação cancelada",
        "Uma solicitação de transporte foi cancelada pelo agricultor.",
    ),
}


async def _send_fcm(token: str, title: str, body: str, data: dict | None = None) -> bool:
    """Envia uma notificação push FCM para um token de dispositivo.

    Retorna True se enviado com sucesso, False caso contrário.
    Não lança exceção para não bloquear o fluxo principal da API.
    """
    if not getattr(settings, "FCM_SERVER_KEY", None):
        logger.debug("FCM_SERVER_KEY não configurado — push ignorado.")
        return False

    payload = {
        "to": token,
        "notification": {
            "title": title,
            "body": body,
            "sound": "default",
            "android_channel_id": "agrolink_transport",
        },
        "data": {
            "type": "transport",
            **(data or {}),
        },
        "priority": "high",
    }

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.post(
                FCM_ENDPOINT,
                json=payload,
                headers={
                    "Authorization": f"key={settings.FCM_SERVER_KEY}",
                    "Content-Type": "application/json",
                },
            )
            if response.status_code == 200:
                result = response.json()
                if result.get("failure", 0) > 0:
                    logger.warning("FCM reportou falha: %s", result)
                    return False
                logger.info("Push enviado para token ...%s", token[-8:])
                return True
            else:
                logger.warning("FCM HTTP %s: %s", response.status_code, response.text[:200])
                return False
    except Exception as exc:
        logger.error("Erro ao enviar push FCM: %s", exc)
        return False


async def notify_status_change(
    *,
    agricultor_fcm_token: str | None,
    transportador_fcm_token: str | None,
    request_id: str,
    new_status: str,
    produto: str,
    origem: str,
    destino: str,
) -> None:
    """Envia notificações push ao agricultor e/ou transportador quando o status muda."""

    shared_data = {
        "request_id": request_id,
        "status": new_status,
        "produto": produto,
        "origem": origem,
        "destino": destino,
        "screen": "transport_tracking",
    }

    # Notificação para o agricultor
    if agricultor_fcm_token and new_status in _STATUS_MESSAGES:
        title, body = _STATUS_MESSAGES[new_status]
        await _send_fcm(agricultor_fcm_token, title, body, shared_data)

    # Notificação para o transportador (quando nova solicitação chega)
    if transportador_fcm_token and new_status in _TRANSPORTER_STATUS_MESSAGES:
        title, body = _TRANSPORTER_STATUS_MESSAGES[new_status]
        await _send_fcm(transportador_fcm_token, title, body, shared_data)


async def notify_new_request(
    *,
    transportador_fcm_token: str | None,
    request_id: str,
    produto: str,
    peso: str,
    origem: str,
    destino: str,
) -> None:
    """Notifica o transportador quando um agricultor cria uma nova solicitação na sua rota."""
    if not transportador_fcm_token:
        return

    title = "📦 Nova solicitação de transporte"
    body = f"{peso}t de {produto} • {origem} → {destino}"
    await _send_fcm(
        transportador_fcm_token,
        title,
        body,
        {
            "request_id": request_id,
            "status": "pendente",
            "screen": "transport_requests",
        },
    )