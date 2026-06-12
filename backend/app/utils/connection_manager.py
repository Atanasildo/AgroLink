import uuid

from fastapi import WebSocket


class ConnectionManager:
    """Mantém o registo de conexões WebSocket ativas por utilizador,
    permitindo entrega de mensagens em tempo real entre dois utilizadores."""

    def __init__(self) -> None:
        self._connections: dict[uuid.UUID, set[WebSocket]] = {}

    async def connect(self, user_id: uuid.UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.setdefault(user_id, set()).add(websocket)

    def disconnect(self, user_id: uuid.UUID, websocket: WebSocket) -> None:
        connections = self._connections.get(user_id)
        if connections:
            connections.discard(websocket)
            if not connections:
                self._connections.pop(user_id, None)

    async def send_to_user(self, user_id: uuid.UUID, payload: dict) -> None:
        connections = self._connections.get(user_id, set())
        for websocket in list(connections):
            try:
                await websocket.send_json(payload)
            except Exception:
                self.disconnect(user_id, websocket)


manager = ConnectionManager()
