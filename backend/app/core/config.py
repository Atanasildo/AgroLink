from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AgroLink API"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Banco de dados
    DATABASE_URL: str = "postgresql://agrolink:agrolink@db:5432/agrolink"

    # JWT
    SECRET_KEY: str = "troque-esta-chave-por-uma-chave-secreta-forte"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS - origens permitidas separadas por vírgula
    ALLOWED_ORIGINS: str = "http://localhost:3000,https://agro-link-eight.vercel.app"

    # Comissões
    TRANSPORT_COMMISSION_PERCENT: float = 5.0
    MACHINE_RENTAL_COMMISSION_PERCENT: float = 10.0

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
