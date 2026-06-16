from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AgroLink API"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Banco de dados
    DATABASE_URL: str = "postgresql://agrolink:agrolink@db:5432/agrolink"

    @field_validator("DATABASE_URL")
    @classmethod
    def _normalize_database_url(cls, value: str) -> str:
        if value.startswith("postgres://"):
            return "postgresql://" + value[len("postgres://"):]
        return value

    # JWT
    SECRET_KEY: str = "troque-esta-chave-por-uma-chave-secreta-forte"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,https://agro-link-eight.vercel.app"

    # Comissões
    TRANSPORT_COMMISSION_PERCENT: float = 5.0
    MACHINE_RENTAL_COMMISSION_PERCENT: float = 10.0

    # Admin
    ADMIN_SETUP_KEY: str = "troque-esta-chave-admin-no-env"

    # Verificação OTP
    VERIFICATION_CODE_EXPIRE_MINUTES: int = 10
    VERIFICATION_CODE_MAX_ATTEMPTS: int = 5
    VERIFICATION_CODE_RESEND_SECONDS: int = 60

    # Email (SMTP)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@agrolink.ao"

    # SMS (Africa's Talking ou similar)
    SMS_API_KEY: str = ""
    SMS_SENDER_ID: str = "AgroLink"

    # S3 / MinIO (armazenamento de imagens)
    S3_BUCKET: str = ""
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_REGION: str = "af-south-1"
    S3_ENDPOINT_URL: str = ""       # Para MinIO: http://minio:9000
    S3_PUBLIC_URL_BASE: str = ""    # URL pública base das imagens
    MAX_UPLOAD_SIZE_MB: int = 10

    # Upload local (fallback dev)
    LOCAL_UPLOAD_DIR: str = "/tmp/agrolink_uploads"
    LOCAL_UPLOAD_PUBLIC_BASE: str = "/uploads"

    # Firebase FCM v1
    FCM_PROJECT_ID: str = ""
    FCM_SERVICE_ACCOUNT_JSON: str = ""  # JSON completo da service account

    # ProxyPay / Multicaixa EMIS GPO
    PROXYPAY_BASE_URL: str = "https://api.proxypay.co.ao"
    PROXYPAY_BEARER_TOKEN: str = ""
    PROXYPAY_POS_ID: str = ""
    PROXYPAY_CALLBACK_URL: str = "https://api.agrolink.ao/api/v1/payments/webhook/multicaixa"
    PROXYPAY_WEBHOOK_SECRET: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
