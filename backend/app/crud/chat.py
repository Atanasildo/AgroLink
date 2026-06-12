import uuid

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.models.chat import ChatMessage
from app.schemas.chat import ChatMessageCreate


def create_message(db: Session, message_in: ChatMessageCreate, remetente_id: uuid.UUID) -> ChatMessage:
    db_message = ChatMessage(**message_in.model_dump(), remetente_id=remetente_id)
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message


def get_conversation(
    db: Session, user_id: uuid.UUID, other_user_id: uuid.UUID, skip: int = 0, limit: int = 50
) -> list[ChatMessage]:
    """Histórico de mensagens entre dois utilizadores, mais recentes primeiro."""
    return (
        db.query(ChatMessage)
        .filter(
            or_(
                and_(ChatMessage.remetente_id == user_id, ChatMessage.destinatario_id == other_user_id),
                and_(ChatMessage.remetente_id == other_user_id, ChatMessage.destinatario_id == user_id),
            )
        )
        .order_by(ChatMessage.criado_em.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def list_conversation_partners(db: Session, user_id: uuid.UUID) -> list[uuid.UUID]:
    """Lista os IDs de utilizadores com quem o utilizador já trocou mensagens."""
    sent = db.query(ChatMessage.destinatario_id).filter(ChatMessage.remetente_id == user_id)
    received = db.query(ChatMessage.remetente_id).filter(ChatMessage.destinatario_id == user_id)
    ids = {row[0] for row in sent.union(received).all()}
    return list(ids)


def count_unread(db: Session, user_id: uuid.UUID, other_user_id: uuid.UUID) -> int:
    return (
        db.query(ChatMessage)
        .filter(
            ChatMessage.remetente_id == other_user_id,
            ChatMessage.destinatario_id == user_id,
            ChatMessage.lida.is_(False),
        )
        .count()
    )


def mark_conversation_as_read(db: Session, user_id: uuid.UUID, other_user_id: uuid.UUID) -> int:
    updated = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.remetente_id == other_user_id,
            ChatMessage.destinatario_id == user_id,
            ChatMessage.lida.is_(False),
        )
        .update({ChatMessage.lida: True})
    )
    db.commit()
    return updated
