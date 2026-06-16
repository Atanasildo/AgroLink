"""
Rotas para upload de imagens.

POST /uploads/{entity_type} — faz upload de imagem
DELETE /uploads/{url} — remove imagem

entity_type: "products", "machines", "vehicles", "social"
"""

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.utils.storage import delete_image, upload_image

router = APIRouter(prefix="/uploads", tags=["Armazenamento"])


@router.post("/{entity_type}", status_code=status.HTTP_201_CREATED)
async def upload_image_endpoint(
    entity_type: str,
    file: UploadFile = File(...),
    db: Session = None,
) -> dict:
    """Faz upload de imagem para S3/MinIO (ou disco local em dev).
    
    Args:
        entity_type: "products", "machines", "vehicles", "social"
        file: Ficheiro de imagem (JPEG, PNG, WebP)
        
    Returns:
        URL pública da imagem
    """
    if entity_type not in ["products", "machines", "vehicles", "social"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="entity_type deve ser um de: products, machines, vehicles, social",
        )

    url = await upload_image(file, entity_type)
    return {"url": url}


@router.delete("", status_code=status.HTTP_200_OK)
async def delete_image_endpoint(url: str) -> dict:
    """Remove imagem do armazenamento.
    
    Args:
        url: URL da imagem a remover (como query param: ?url=...)
    """
    if not url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL é obrigatória.",
        )

    success = await delete_image(url)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha ao apagar imagem.",
        )

    return {"detail": "Imagem removida com sucesso."}