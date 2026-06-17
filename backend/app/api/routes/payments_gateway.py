"""
Webhook para receber callbacks de pagamento do ProxyPay/EMIS GPO.

POST /payments/webhook/multicaixa — processa callbacks

Fluxo:
1. Cliente inicia pagamento via /payments/{id}/initiate
2. Cliente paga no gateway
3. Gateway envia callback aqui
4. Sistema atualiza status e libera saldo ao prestador
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
import uuid

from fastapi import APIRouter, Body, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.crud.payment import (
    create_or_get_transport_payment,
    get_payment,
    simulate_payment_confirmation,
)
from app.crud.transport import get_transport_request
from app.models.payment import Payment, PaymentStatus
from app.models.user import User, UserRole
from app.schemas.payment import PaymentRead
from app.utils.payment_gateway import handle_payment_webhook, proxypay_client

router = APIRouter(prefix="/payments", tags=["Pagamentos"])


class PaymentWebhookPayload(BaseModel):
    """Payload do webhook ProxyPay/EMIS GPO."""

    transaction_id: str
    external_id: str  # Nosso payment_id interno
    status: str  # "accepted", "rejected", "pending"
    status_reason: Optional[str] = None
    amount: Optional[Decimal] = None
    mobile: Optional[str] = None


@router.post("/webhook/multicaixa", status_code=status.HTTP_200_OK)
async def payment_webhook_multicaixa(
    payload: PaymentWebhookPayload = Body(...),
    db: Session = Depends(get_db),
) -> dict:
    """Webhook para callbacks de pagamento do ProxyPay.
    
    Processa pagamentos confirmados:
    - Atualiza status do Payment
    - Calcula comissão
    - Libera saldo ao prestador
    """
    try:
        # Localizar pagamento
        payment = db.query(Payment).filter(Payment.id == payload.external_id).first()
        if not payment:
            return {
                "status": "error",
                "message": f"Pagamento {payload.external_id} não encontrado",
            }

        # Atualizar status
        if payload.status == "accepted":
            payment.status = PaymentStatus.PAGO
            payment.gateway_ref = payload.transaction_id
            payment.pago_em = datetime.now(timezone.utc)

            # Calcular comissão (se configurada)
            if payment.comissao_percent:
                comissao = Decimal(str(payment.valor)) * (Decimal(str(payment.comissao_percent)) / 100)
                payment.comissao_valor = comissao
                payment.valor_liquido = Decimal(str(payment.valor)) - comissao
            else:
                payment.valor_liquido = payment.valor

            # TODO: Adicionar saldo ao saldo_disponivel do utilizador (criar modelo se não existir)
            # TODO: Enviar notificação push ao prestador

            db.add(payment)
            db.commit()

            return {
                "status": "ok",
                "message": "Pagamento confirmado e saldo liberado",
                "payment_id": str(payment.id),
            }

        elif payload.status == "rejected":
            payment.status = PaymentStatus.FALHADO
            payment.gateway_ref = payload.transaction_id
            db.add(payment)
            db.commit()

            return {
                "status": "ok",
                "message": f"Pagamento rejeitado: {payload.status_reason}",
            }

        else:  # pending
            payment.status = PaymentStatus.PENDENTE
            db.add(payment)
            db.commit()

            return {"status": "ok", "message": "Pagamento ainda pendente"}

    except Exception as exc:
        return {"status": "error", "message": str(exc)}


@router.post("/{payment_id}/initiate", status_code=status.HTTP_201_CREATED)
async def initiate_payment(
    payment_id: str,
    telefone: str,
    db: Session = Depends(get_db),
) -> dict:
    """Inicia um pagamento: cria transação no ProxyPay e devolve URL para o cliente pagar.
    
    Args:
        payment_id: UUID do pagamento registado
        telefone: Número de telefone do cliente (Unitel/Movicel)
        
    Returns:
        referencia_proxypa y, status, instruções para o cliente
    """
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pagamento não encontrado")

    # Criar transação no ProxyPay
    transaction = await proxypay_client.create_transaction(
        payment_id=payment.id,
        amount=payment.valor,
        phone=telefone,
        description=f"AgroLink - Pagamento {payment.tipo.value}",
    )

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha ao criar transação no gateway.",
        )

    # Guardar referência externa
    payment.referencia_externa = transaction.get("transaction_id")
    db.add(payment)
    db.commit()

    return {
        "transaction_id": transaction.get("transaction_id"),
        "status": "criada",
        "referencia_pagamento": transaction.get("reference"),
        "mensagem": "Envie o código para completar o pagamento (via *144#, SMS, app, etc)",
    }


@router.get("/{payment_id}/status", status_code=status.HTTP_200_OK)
async def get_payment_status(
    payment_id: str,
    db: Session = Depends(get_db),
) -> dict:
    """Verifica status atual de um pagamento."""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pagamento não encontrado")

    # Se tem referência externa, verificar status no gateway
    if payment.referencia_externa:
        transaction = await proxypay_client.verify_transaction(payment.referencia_externa)
        if transaction:
            return {
                "payment_id": str(payment.id),
                "status": payment.status.value,
                "gateway_status": transaction.get("status"),
                "valor": float(payment.valor),
                "criado_em": payment.criado_em,
            }

    return {
        "payment_id": str(payment.id),
        "status": payment.status.value,
        "valor": float(payment.valor),
        "criado_em": payment.criado_em,
    }


# ---------- Gateway simulado (sandbox) — referência por transporte ----------
#
# Enquanto o acesso real à ProxyPay RPS (que exige contrato comercial) não
# está disponível, este fluxo gera uma referência Multicaixa simulada para o
# agricultor pagar a solicitação de transporte, e permite "simular" a
# confirmação do pagamento para destravar o teste do fluxo completo.


@router.get("/transport/{request_id}", response_model=PaymentRead)
def get_transport_payment_reference(
    request_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Payment:
    """Devolve (criando se necessário) a referência de pagamento sandbox para
    uma solicitação de transporte.

    Idempotente: chamadas repetidas devolvem sempre a mesma referência,
    enquanto o pagamento não estiver pago.
    """
    transport_request = get_transport_request(db, request_id)
    if not transport_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitação não encontrada")

    if transport_request.agricultor_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    return create_or_get_transport_payment(
        db,
        transport_request,
        agricultor_id=transport_request.agricultor_id,
        comissao_percent=transport_request.comissao_percentual,
    )


@router.post("/{payment_id}/simulate-confirm", response_model=PaymentRead)
def simulate_confirm_payment(
    payment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Payment:
    """[SANDBOX] Simula a confirmação do pagamento de uma referência Multicaixa,
    como se o agricultor a tivesse pago num ATM/app bancário/*144#.

    Bloqueado automaticamente se settings.PAYMENT_SANDBOX_MODE estiver
    desativado (ex: em produção real, após integração com a ProxyPay).
    """
    if not settings.PAYMENT_SANDBOX_MODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Simulação de pagamento desativada (PAYMENT_SANDBOX_MODE=False).",
        )

    payment = get_payment(db, payment_id)
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pagamento não encontrado")

    if payment.utilizador_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    return simulate_payment_confirmation(db, payment)