from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, chat, machines, map as map_routes, payments, prices, products, ratings, transport, users
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "API do AgroLink - plataforma AgriTech e LogTech que conecta agricultores, "
        "compradores, transportadores, proprietários de máquinas agrícolas e "
        "cooperativas. O módulo de Transporte Rural é a prioridade máxima da plataforma."
    ),
    version="0.1.0",
)

# CORS - ajustar origens permitidas em produção
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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
