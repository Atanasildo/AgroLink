"""
Integração com Multicaixa Express via ProxyPay (Gateway de Pagamentos Online - EMIS GPO).

ProxyPay é um integrador certificado pela EMIS que simplifica o processo de certificação.

Fluxo:
1. Cliente inicia pagamento → criar transaction no ProxyPay
2. Cliente paga (banco, operadora, etc) → PaymentProvider gera callback
3. Webhook em POST /payments/webhook/multicaixa → atualizar status da transaction
4. Cálculo automático de comissão e saldo para prestador

Documentação: https://developer.proxypay.co.ao/opg/v1/
"""

import hashlib
import hmac
import json
import logging
import uuid
from decimal import Decimal
from enum import Enum

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class TransactionStatus(str, Enum):
    """Estados da transação no ProxyPay/EMIS GPO."""

    CREATED = "created"
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class ProxyPayClient:
    """Cliente para ProxyPay/EMIS GPO."""

    def __init__(self):
        self.base_url = settings.PROXYPAY_BASE_URL
        self.bearer_token = settings.PROXYPAY_BEARER_TOKEN
        self.pos_id = settings.PROXYPAY_POS_ID

    async def create_transaction(
        self,
        payment_id: uuid.UUID,
        amount: Decimal,
        phone: str,
        description: str = "AgroLink - Transação",
    ) -> dict | None:
        """Cria uma transação de pagamento no ProxyPay.

        Args:
            payment_id: UUID interno da transação
            amount: valor em Kz
            phone: número de telefone do cliente (operadora Unitel/Movicel)
            description: descrição da transação

        Returns:
            Resposta ProxyPay com transaction_id ou None se erro
        """
        if not self.bearer_token or not self.pos_id:
            logger.warning("ProxyPay não configurado (BEARER_TOKEN ou POS_ID ausentes)")
            return None

        try:
            payload = {
                "type": "payment",
                "pos_id": self.pos_id,
                "mobile": phone,
                "amount": float(amount),
                "callback_url": settings.PROXYPAY_CALLBACK_URL,
                "external_id": str(payment_id),
                "description": description,
            }

            headers = {
                "Authorization": f"Bearer {self.bearer_token}",
                "Content-Type": "application/json",
                "Idempotency-Key": str(payment_id),
            }

            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.post(
                    f"{self.base_url}/opg/v1/transactions",
                    json=payload,
                    headers=headers,
                )

                if response.status_code in (200, 201):
                    data = response.json()
                    logger.info("Transação criada no ProxyPay: %s", data.get("transaction_id"))
                    return data
                else:
                    logger.error("Erro ProxyPay %s: %s", response.status_code, response.text[:200])
                    return None
        except Exception as exc:
            logger.error("Erro ao criar transação ProxyPay: %s", exc)
            return None

    async def verify_transaction(self, transaction_id: str) -> dict | None:
        """Consulta o status de uma transação."""
        if not self.bearer_token:
            return None

        try:
            headers = {"Authorization": f"Bearer {self.bearer_token}"}

            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.get(
                    f"{self.base_url}/opg/v1/transactions/{transaction_id}",
                    headers=headers,
                )

                if response.status_code == 200:
                    return response.json()
                else:
                    logger.warning("Transação não encontrada: %s", transaction_id)
                    return None
        except Exception as exc:
            logger.error("Erro ao verificar transação: %s", exc)
            return None


def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verifica a autenticidade do webhook (HMAC-SHA256).

    ProxyPay inclui um header X-Signature com HMAC da payload.
    """
    expected = hmac.new(
        secret.encode() if isinstance(secret, str) else secret,
        payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(signature, expected)


async def handle_payment_webhook(
    payload: dict, db_payment_update_func
) -> dict:
    """Processa callback de pagamento do ProxyPay.

    Args:
        payload: Dados do webhook {"transaction_id", "status", "status_reason", ...}
        db_payment_update_func: Função para atualizar Payment na BD

    Returns:
        Resumo da ação (status, mensagem)
    """
    try:
        transaction_id = payload.get("transaction_id")
        status = payload.get("status")  # accepted, rejected, pending
        external_id = payload.get("external_id")  # nosso payment_id interno

        if status == "accepted":
            await db_payment_update_func(external_id, "pago", gateway_ref=transaction_id)
            logger.info("Pagamento %s confirmado via webhook", external_id)
            return {"status": "ok", "message": "Pagamento confirmado"}
        elif status == "rejected":
            reason = payload.get("status_reason", "Motivo não especificado")
            await db_payment_update_func(external_id, "falhado", gateway_ref=transaction_id)
            logger.warning("Pagamento %s rejeitado: %s", external_id, reason)
            return {"status": "ok", "message": f"Pagamento rejeitado: {reason}"}
        else:
            logger.info("Status pendente para pagamento %s", external_id)
            return {"status": "ok", "message": "Status atualizado para pendente"}
    except Exception as exc:
        logger.error("Erro ao processar webhook: %s", exc)
        return {"status": "error", "message": str(exc)}


# Instância global do cliente
proxypay_client = ProxyPayClient()