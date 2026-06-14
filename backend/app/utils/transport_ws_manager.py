"""
backend/app/utils/transport_ws_manager.py

Gestor de WebSockets dedicado ao rastreamento de transportes em tempo real.
Mantém "salas" por request_id — agricultor e transportador entram na mesma sala
e recebem eventos de localização GPS e mudanças de status instantaneamente.

Diferença do ConnectionManager de chat:
- chat: sala por user_id (mensagens entre dois utilizadores)
- TransportWSManager: sala por request_id (rastreamento de uma viagem específica)
"""

import uuid
from enum import Enum

from fastapi import WebSocket


class TransportEvent(str, Enum):
    LOCATION_UPDATE = "location_update"
    STATUS_CHANGED = "status_changed"
    ETA_UPDATE = "eta_update"
    CONNECTED = "connected"
    ERROR = "error"


class TransportWSManager:
    """Mantém conexões WebSocket agrupadas por transport_request_id."""

    def __init__(self) -> None:
        # request_id -> set de WebSockets (agricultor + transportador)
        self._rooms: dict[uuid.UUID, set[WebSocket]] = {}

    async def connect(self, request_id: uuid.UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        self._rooms.setdefault(request_id, set()).add(websocket)

    def disconnect(self, request_id: uuid.UUID, websocket: WebSocket) -> None:
        room = self._rooms.get(request_id)
        if room:
            room.discard(websocket)
            if not room:
                self._rooms.pop(request_id, None)

    async def broadcast_to_room(self, request_id: uuid.UUID, payload: dict) -> None:
        """Envia um evento a todos os participantes da sala (agricultor + transportador)."""
        room = self._rooms.get(request_id, set())
        dead: list[WebSocket] = []
        for ws in list(room):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(request_id, ws)

    async def send_location_update(
        self,
        request_id: uuid.UUID,
        latitude: float,
        longitude: float,
        hora_prevista_chegada: str | None = None,
    ) -> None:
        await self.broadcast_to_room(
            request_id,
            {
                "event": TransportEvent.LOCATION_UPDATE,
                "request_id": str(request_id),
                "data": {
                    "latitude": latitude,
                    "longitude": longitude,
                    "hora_prevista_chegada": hora_prevista_chegada,
                },
            },
        )

    async def send_status_changed(
        self,
        request_id: uuid.UUID,
        status: str,
        updated_at: str | None = None,
    ) -> None:
        await self.broadcast_to_room(
            request_id,
            {
                "event": TransportEvent.STATUS_CHANGED,
                "request_id": str(request_id),
                "data": {
                    "status": status,
                    "updated_at": updated_at,
                },
            },
        )

    def room_size(self, request_id: uuid.UUID) -> int:
        return len(self._rooms.get(request_id, set()))


# Instância global — partilhada por toda a aplicação FastAPI
transport_ws_manager = TransportWSManager()