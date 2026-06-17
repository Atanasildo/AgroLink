"""
Gateway de pagamento SIMULADO (sandbox interno) — estilo ProxyPay RPS v2.

Contexto: o acesso real à ProxyPay (mesmo o ambiente de sandbox) exige
contrato comercial com a TimeBoxed/banco parceiro e não está disponível de
forma imediata. Este módulo simula o mesmo comportamento — gera uma
referência Multicaixa (entidade + referência + validade) e permite "marcar
como paga" manualmente — para que todo o fluxo de pagamento (geração de
referência, ecrã do agricultor, confirmação, libertação de saldo) possa ser
construído e testado já.

Quando o acesso real à ProxyPay (RPS ou OPG) estiver disponível, troca-se
apenas a chamada a `gerar_referencia_simulada` por uma chamada real ao
cliente em `app/utils/payment_gateway.py` — o resto do código (modelo
Payment, rotas, frontend) não precisa de mudar.

⚠️ Nunca usar em produção real: `settings.PAYMENT_SANDBOX_MODE` deve estar
   a False em produção, e as rotas de simulação bloqueiam-se nesse caso.
"""

import random
import string
from datetime import date, timedelta
from decimal import Decimal

# Entidade fictícia de sandbox (entidades reais Multicaixa têm 5 dígitos;
# usamos uma gama que claramente não corresponde a nenhuma entidade real).
SANDBOX_ENTIDADE = "90000"

REFERENCIA_VALIDADE_DIAS = 3


def gerar_referencia_simulada(valor: Decimal) -> dict:
    """Gera uma referência de pagamento Multicaixa simulada (formato RPS).

    Args:
        valor: valor em Kz a ser pago.

    Returns:
        dict com entidade, referencia, valor e validade — no mesmo formato
        que seria devolvido por uma integração real, pronto para mostrar ao
        agricultor no ecrã de pagamento.
    """
    referencia = "".join(random.choices(string.digits, k=9))
    validade = date.today() + timedelta(days=REFERENCIA_VALIDADE_DIAS)
    return {
        "entidade": SANDBOX_ENTIDADE,
        "referencia": referencia,
        "valor": valor,
        "validade": validade,
    }
