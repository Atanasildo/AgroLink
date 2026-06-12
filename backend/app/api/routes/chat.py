import uuid

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import SessionLocal, get_db
from app.core.security import decode_token
from app.crud.chat import (
    count_unread,
    create_message,
    get_conversation,
    list_conversation_partners,
    mark_conversation_as_read,
)
from app.crud.user import get_user_by_id
from app.models.user import User
from app.schemas.chat import ChatMessageCreate, ChatMessageRead, ConversationSummary
from app.utils.connection_manager import manager

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.get("/conversations", response_model=list[ConversationSummary])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Listar conversas (utilizadores com quem já houve troca de mensagens)
    com contagem de mensagens não lidas."""
    summaries: list[ConversationSummary] = []
    for other_id in list_conversation_partners(db, current_user.id):
        last_messages = get_conversation(db, current_user.id, other_id, skip=0, limit=1)
        unread = count_unread(db, current_user.id, other_id)
        summaries.append(
            ConversationSummary(
                outro_utilizador_id=other_id,
                ultima_mensagem=last_messages[0] if last_messages else None,
                mensagens_nao_lidas=unread,
            )
        )
    return summaries


@router.get("/conversations/{other_user_id}", response_model=list[ChatMessageRead])
def read_conversation(
    other_user_id: uuid.UUID,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Histórico de mensagens com outro utilizador (mais recentes primeiro)."""
    messages = get_conversation(db, current_user.id, other_user_id, skip=skip, limit=limit)
    mark_conversation_as_read(db, current_user.id, other_user_id)
    return messages


@router.post("/messages", response_model=ChatMessageRead, status_code=status.HTTP_201_CREATED)
async def send_message(
    message_in: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Enviar uma mensagem (texto, imagem ou localização) via REST.

    A mensagem também é entregue em tempo real ao destinatário, se este
    estiver conectado via WebSocket.
    """
    db_message = create_message(db, message_in, remetente_id=current_user.id)
    await manager.send_to_user(
        message_in.destinatario_id,
        {"event": "new_message", "data": ChatMessageRead.model_validate(db_message).model_dump(mode="json")},
    )
    return db_message


@router.websocket("/ws")
async def chat_websocket(websocket: WebSocket, token: str = Query(...)):
    """Conexão WebSocket para mensagens em tempo real.

    Autenticação via query param `token` (JWT access token), pois clientes
    WebSocket (web/mobile) frequentemente não suportam cabeçalhos customizados
    no handshake.

    Envie mensagens JSON no formato:
    {"destinatario_id": "<uuid>", "tipo": "texto", "conteudo": "..."}
    """
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = uuid.UUID(payload["sub"])

    db = SessionLocal()
    try:
        user = get_user_by_id(db, user_id)
        if user is None or not user.ativo:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        await manager.connect(user_id, websocket)
        try:
            while True:
                data = await websocket.receive_json()
                message_in = ChatMessageCreate(**data)
                db_message = create_message(db, message_in, remetente_id=user_id)
                payload_out = {
                    "event": "new_message",
                    "data": ChatMessageRead.model_validate(db_message).model_dump(mode="json"),
                }
                # Confirmação para o remetente
                await websocket.send_json(payload_out)
                # Entrega ao destinatário, se conectado
                await manager.send_to_user(message_in.destinatario_id, payload_out)
        except WebSocketDisconnect:
            manager.disconnect(user_id, websocket)
    finally:
        db.close()
