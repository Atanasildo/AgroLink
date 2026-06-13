from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import auth, chat, diagnostic, machines, map as map_routes, payments, prices, products, ratings, seed, social, test, transport, users
from app.core.config import settings
from app.core.database import Base, engine

# Cria as tabelas automaticamente se não existirem
Base.metadata.create_all(bind=engine)

# Adiciona colunas novas de forma segura (idempotente)
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
        # transport_requests
        "ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS hora_prevista_chegada TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITH TIME ZONE",
    ]
    with engine.begin() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                logger.info(f"Migration OK: {sql[:60]}")
            except Exception as e:
                logger.warning(f"Migration skip: {e}")

    # ALTER TYPE ADD VALUE must run outside a transaction block (each in its own connection)
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
    version="0.1.0",
)

# CORS - aceita todos os domínios (ajustar em produção enterprise)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_prefix = settings.API_V1_PREFIX

app.include_router(auth.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)
app.include_router(products.router, prefix=api_prefix)
app.include_router(transport.router, prefix=api_prefix)
app.include_router(machines.router, prefix=api_prefix)
app.include_router(ratings.router, prefix=api_prefix)
app.include_router(chat.router, prefix=api_prefix)
app.include_router(prices.router, prefix=api_prefix)
app.include_router(map_routes.router, prefix=api_prefix)
app.include_router(social.router, prefix=api_prefix)
app.include_router(payments.router, prefix=api_prefix)
app.include_router(seed.router, prefix=api_prefix)
app.include_router(test.router, prefix=api_prefix)
app.include_router(diagnostic.router, prefix=api_prefix)
# TODO: Adicionar rota de diagnóstico (temporariamente desabilitada)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Garante que respostas 500 passem pelo CORSMiddleware e com logging.

    Sem este handler, exceções não tratadas propagam até o
    ServerErrorMiddleware (fora do CORSMiddleware) e o navegador
    reporta "bloqueado por CORS", escondendo o erro real (500).
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.error(f"Erro 500 não tratado: {type(exc).__name__}: {str(exc)}", exc_info=exc)
    
    # Retorna com headers CORS explícitos
    response = JSONResponse(
        status_code=500,
        content={"detail": "Erro interno no servidor. Tente novamente mais tarde.", "error": str(exc)[:100]},
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
        "docs": "/docs",
    }


@app.get("/health", tags=["Status"])
def health_check():
    return {"status": "ok"}

# Startup confirmation log
import logging as _logging
_logging.basicConfig(level=_logging.INFO)
_logging.getLogger(__name__).info("AgroLink API iniciada - migracoes aplicadas")
