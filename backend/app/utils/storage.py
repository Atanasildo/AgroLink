"""
Armazenamento de imagens: S3/MinIO ou disco local (desenvolvimento).

Desenhado para ser flexível: se S3 não estiver configurado, usa disco local.
"""

import logging
import os
import secrets
from pathlib import Path
from typing import Optional

import boto3
from botocore.exceptions import ClientError
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

logger = logging.getLogger(__name__)


def _get_s3_client():
    """Cria cliente S3/MinIO se configurado."""
    if not all([settings.S3_BUCKET, settings.S3_ACCESS_KEY, settings.S3_SECRET_KEY]):
        return None

    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT_URL,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION,
    )


# Magic bytes das imagens permitidas
_IMAGE_MAGIC: dict[bytes, str] = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"RIFF": "image/webp",  # webp: RIFF....WEBP
}
_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def _validate_image_magic(data: bytes) -> str:
    """Verifica magic bytes e devolve o content-type real."""
    for magic, mime in _IMAGE_MAGIC.items():
        if data[:len(magic)] == magic:
            # WebP extra check: bytes 8-11 devem ser "WEBP"
            if mime == "image/webp" and data[8:12] != b"WEBP":
                continue
            return mime
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Ficheiro não reconhecido como imagem válida (JPEG, PNG ou WebP).",
    )


async def _validate_image(file: UploadFile) -> bytes:
    """Valida tipo MIME declarado, magic bytes e tamanho. Devolve os bytes lidos."""
    # 1. Validar extensão do nome
    if file.filename:
        ext = Path(file.filename).suffix.lower()
        if ext not in _ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Extensão de ficheiro não permitida. Use JPEG, PNG ou WebP.",
            )

    # 2. Ler conteúdo (necessário para validar magic bytes)
    data = await file.read()
    await file.seek(0)  # reset para leituras posteriores

    # 3. Validar tamanho
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Imagem maior que {settings.MAX_UPLOAD_SIZE_MB}MB.",
        )

    # 4. Validar magic bytes (não confiar só no Content-Type do cliente)
    _validate_image_magic(data)

    return data


async def upload_image(file: UploadFile, entity_type: str) -> str:
    """Faz upload de imagem e devolve URL pública.

    Args:
        file: ficheiro upload do FastAPI
        entity_type: "products", "machines", "vehicles", "social" — para organizar chaves S3

    Returns:
        URL pública da imagem
    """
    data = await _validate_image(file)

    # Gerar chave única — não usar o nome original do ficheiro (path traversal)
    ext = Path(file.filename).suffix.lower() if file.filename else ".jpg"
    if ext not in _ALLOWED_EXTENSIONS:
        ext = ".jpg"
    unique_name = f"{secrets.token_hex(16)}{ext}"
    key = f"{entity_type}/{unique_name}"

    s3_client = _get_s3_client()

    if s3_client:
        # Upload para S3/MinIO
        try:
            s3_client.put_object(
                Bucket=settings.S3_BUCKET,
                Key=key,
                Body=data,
                ContentType=file.content_type,
                ACL="public-read",
            )
            # URL pública
            if settings.S3_PUBLIC_URL_BASE:
                return f"{settings.S3_PUBLIC_URL_BASE}/{key}"
            elif settings.S3_ENDPOINT_URL:
                return f"{settings.S3_ENDPOINT_URL}/{settings.S3_BUCKET}/{key}"
            else:
                # AWS S3 padrão
                return f"https://{settings.S3_BUCKET}.s3.{settings.S3_REGION}.amazonaws.com/{key}"
        except ClientError as exc:
            logger.error("Erro S3 ao fazer upload: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Falha ao armazenar imagem.",
            ) from exc
    else:
        # Fallback: disco local
        upload_dir = Path(settings.LOCAL_UPLOAD_DIR) / entity_type
        upload_dir.mkdir(parents=True, exist_ok=True)

        file_path = upload_dir / unique_name
        # `data` já foi lido na validação
        file_path.write_bytes(data)

        return f"{settings.LOCAL_UPLOAD_PUBLIC_BASE}/{entity_type}/{unique_name}"


async def delete_image(url: str) -> bool:
    """Remove imagem do armazenamento."""
    if not url:
        return False

    s3_client = _get_s3_client()

    if s3_client:
        # Extrair chave da URL
        try:
            key = url.split(f"{settings.S3_BUCKET}/")[-1]
            s3_client.delete_object(Bucket=settings.S3_BUCKET, Key=key)
            return True
        except Exception as exc:
            logger.error("Erro ao apagar imagem S3: %s", exc)
            return False
    else:
        # Ficheiro local
        try:
            file_path = Path(settings.LOCAL_UPLOAD_DIR) / url.split("/uploads/")[-1]
            file_path.unlink(missing_ok=True)
            return True
        except Exception as exc:
            logger.error("Erro ao apagar imagem local: %s", exc)
            return False