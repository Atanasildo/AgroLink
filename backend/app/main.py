from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import auth, chat, machines, map as map_routes, payments, prices, products, ratings, seed, test, transport, users
from app.core.config import settings
from app.core.database import Base, engine

# Cria as tabelas automaticamente se não existirem
Base.metadata.create_all(bind=engine)

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
app.include_router(payments.router, prefix=api_prefix)
app.include_router(seed.router, prefix=api_prefix)
app.include_router(test.router, prefix=api_prefix)
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
