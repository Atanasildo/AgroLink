from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import (
    admin,
    auth,
    chat,
    machines,
    map as map_routes,
    payments,
    prices,
    products,
    ratings,
    social,
    transport,
    users,
)
from app.api.routes import (
    admin_moderation,
    payments_gateway,
    prices_trends,
    social_shares,
    uploads,
    verification,
)
from app.core.config import settings
from app.core.database import Base, engine

# Cria as tabelas automaticamente se não existirem
Base.metadata.create_all(bind=engine)


def _safe_migrate():
    import logging
    logger = logging.getLogger(__name__)
    from sqlalchemy import text
    migrations = [
        # vehicles
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS disponivel BOOLEAN NOT NULL DEFAULT TRUE",
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS provincia VARCHAR(100)",
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS municipio VARCHAR(100)",
        # transport_routes
        "ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8)",
        "ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8)",
        # transport_requests
        "ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS hora_prevista_chegada TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITH TIME ZONE",
        # imagens (galeria de fotos)
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS imagens VARCHAR[]",
        "ALTER TABLE machines ADD COLUMN IF NOT EXISTS imagens VARCHAR[]",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS imagens VARCHAR[]",
        # fcm_token para notificacoes push
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(512)",
        # Tabela de denuncias
        """CREATE TABLE IF NOT EXISTS reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            denunciante_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            denunciado_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            motivo VARCHAR(50) NOT NULL,
            descricao VARCHAR(1000),
            criado_em TIMESTAMPTZ DEFAULT now()
        )""",
        # Rating: adicionar critérios (confiança, qualidade, pontualidade, atendimento)
        "ALTER TABLE ratings ADD COLUMN IF NOT EXISTS criterio_confianca INTEGER",
        "ALTER TABLE ratings ADD COLUMN IF NOT EXISTS criterio_qualidade INTEGER",
        "ALTER TABLE ratings ADD COLUMN IF NOT EXISTS criterio_pontualidade INTEGER",
        "ALTER TABLE ratings ADD COLUMN IF NOT EXISTS criterio_atendimento INTEGER",
        # Social: adicionar campo vídeos, aprovação e flagging
        "ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS videos VARCHAR[]",
        "ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS aprovado BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS flag_reason VARCHAR(500)",
        # Product: adicionar aprovação e flagging
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS aprovado BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS flag_reason VARCHAR(500)",
        # Payment: adicionar campos de gateway e comissão
        "ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_ref VARCHAR(200)",
        "ALTER TABLE payments ADD COLUMN IF NOT EXISTS comissao_percent NUMERIC(5, 2)",
        "ALTER TABLE payments ADD COLUMN IF NOT EXISTS comissao_valor NUMERIC(14, 2)",
        "ALTER TABLE payments ADD COLUMN IF NOT EXISTS valor_liquido NUMERIC(14, 2)",
        "ALTER TABLE payments ADD COLUMN IF NOT EXISTS saldo_prestador_atualizado VARCHAR(1) DEFAULT '0'",
        "ALTER TABLE payments ADD COLUMN IF NOT EXISTS pago_em TIMESTAMP WITH TIME ZONE",
        # Criar tabela de códigos de verificação (OTP)
        """CREATE TABLE IF NOT EXISTS verification_codes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            utilizador_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            canal VARCHAR(20) NOT NULL,
            destino VARCHAR(255) NOT NULL,
            codigo_hash VARCHAR(128) NOT NULL,
            tentativas INTEGER NOT NULL DEFAULT 0,
            usado INTEGER NOT NULL DEFAULT 0,
            expira_em TIMESTAMP WITH TIME ZONE NOT NULL,
            criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
        )""",
        # Criar tabela de compartilhamentos (PostShare)
        """CREATE TABLE IF NOT EXISTS social_post_shares (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
            utilizador_id UUID NOT NULL REFERENCES users(id),
            comentario VARCHAR(500),
            criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
            UNIQUE(post_id, utilizador_id)
        )""",
    ]
    with engine.begin() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                logger.info(f"Migration OK: {sql[:60]}")
            except Exception as e:
                logger.warning(f"Migration skip: {e}")

    # ALTER TYPE ADD VALUE must run outside a transaction block
    enum_values = ["soja", "hortalicas"]
    for val in enum_values:
        try:
            with engine.connect() as conn:
                conn.execution_options(isolation_level="AUTOCOMMIT")
                conn.execute(text(f"ALTER TYPE commoditytype ADD VALUE IF NOT EXISTS '{val}'"))
                logger.info(f"Enum value added: {val}")
        except Exception as e:
            logger.warning(f"Enum migration skip ({val}): {e}")


_safe_migrate()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "API do AgroLink - plataforma AgriTech e LogTech que conecta agricultores, "
        "compradores, transportadores, proprietários de máquinas agrícolas e "
        "cooperativas. O módulo de Transporte Rural é a prioridade máxima da plataforma."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_prefix = settings.API_V1_PREFIX

app.include_router(admin.router, prefix=api_prefix)
app.include_router(auth.router, prefix=api_prefix)
app.include_router(verification.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)
app.include_router(products.router, prefix=api_prefix)
app.include_router(transport.router, prefix=api_prefix)
app.include_router(machines.router, prefix=api_prefix)
app.include_router(ratings.router, prefix=api_prefix)
app.include_router(chat.router, prefix=api_prefix)
app.include_router(prices.router, prefix=api_prefix)
app.include_router(prices_trends.router, prefix=api_prefix)
app.include_router(map_routes.router, prefix=api_prefix)
app.include_router(social.router, prefix=api_prefix)
app.include_router(social_shares.router, prefix=api_prefix)
app.include_router(payments.router, prefix=api_prefix)
app.include_router(payments_gateway.router, prefix=api_prefix)
app.include_router(uploads.router, prefix=api_prefix)
app.include_router(admin_moderation.router, prefix=api_prefix)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Garante que respostas 500 passem pelo CORSMiddleware com logging."""
    import logging
    logger = logging.getLogger(__name__)
    logger.error(f"Erro 500 não tratado: {type(exc).__name__}: {str(exc)}", exc_info=exc)

    response = JSONResponse(
        status_code=500,
        content={"detail": "Erro interno no servidor. Tente novamente mais tarde."},
    )
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response


@app.get("/", tags=["Status"])
def root():
    return {
        "app": settings.PROJECT_NAME,
        "status": "online",
        "version": "1.0.0",
    }


@app.get("/health", tags=["Status"])
def health_check():
    return {"status": "ok"}


import logging as _logging
_logging.basicConfig(level=_logging.INFO)
_logging.getLogger(__name__).info("AgroLink API iniciada")