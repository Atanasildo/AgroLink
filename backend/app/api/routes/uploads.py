"""
Rotas para upload de imagens.

POST /uploads/{entity_type} — faz upload de imagem
DELETE /uploads/{url} — remove imagem

entity_type: "products", "machines", "vehicles", "social", "profile"
"""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.deps import get_current_user
from app.models.user import User
from app.utils.storage import delete_image, upload_image

router = APIRouter(prefix="/uploads", tags=["Armazenamento"])

_ALLOWED_ENTITY_TYPES = {"products", "machines", "vehicles", "social", "profile"}


@router.post("/{entity_type}", status_code=status.HTTP_201_CREATED)
async def upload_image_endpoint(
    entity_type: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> dict:
    if entity_type not in _ALLOWED_ENTITY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"entity_type deve ser um de: {', '.join(sorted(_ALLOWED_ENTITY_TYPES))}",
        )
    url = await upload_image(file, entity_type)
    return {"url": url}


@router.delete("", status_code=status.HTTP_200_OK)
async def delete_image_endpoint(
    url: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    if not url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="URL é obrigatória.")
    success = await delete_image(url)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Falha ao apagar imagem.")
    return {"detail": "Imagem removida com sucesso."}
