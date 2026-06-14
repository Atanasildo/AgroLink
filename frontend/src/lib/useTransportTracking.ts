/**
 * frontend/src/lib/useTransportTracking.ts
 *
 * Hook React para rastreamento de transporte em tempo real via WebSocket.
 *
 * Funcionalidades:
 * - Conecta ao WebSocket /transport/ws/{requestId}
 * - Recebe eventos de localização GPS em tempo real
 * - Recebe eventos de mudança de status
 * - Reconexão automática com backoff exponencial
 * - Ping/pong para manter conexão viva
 *
 * Uso:
 *   const { location, status, eta, connected } = useTransportTracking(requestId, token);
 */

import { useCallback, useEffect, useRef, useState } from "react";

const WS_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? "https://agrolink-api-67zk.onrender.com/api/v1")
    .replace(/^https?/, (p) => (p === "https" ? "wss" : "ws"));

export interface GPSLocation {
  latitude: number;
  longitude: number;
  timestamp: Date;
}

export type TrackingStatus =
  | "pendente"
  | "aceite"
  | "em_andamento"
  | "concluido"
  | "cancelado"
  | null;

export interface TrackingState {
  connected: boolean;
  location: GPSLocation | null;
  status: TrackingStatus;
  eta: Date | null;
  role: "agricultor" | "transportador" | null;
  error: string | null;
}

const PING_INTERVAL_MS = 25_000;        // Envia ping a cada 25s para manter WS vivo
const MAX_RECONNECT_ATTEMPTS = 8;
const BASE_RECONNECT_DELAY_MS = 2_000;  // Backoff: 2s, 4s, 8s… até 32s

export function useTransportTracking(
  requestId: string | null,
  token: string | null
): TrackingState {
  const [state, setState] = useState<TrackingState>({
    connected: false,
    location: null,
    status: null,
    eta: null,
    role: null,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  const clearPing = () => {
    if (pingRef.current) {
      clearInterval(pingRef.current);
      pingRef.current = null;
    }
  };

  const clearReconnect = () => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  };

  const connect = useCallback(() => {
    if (!requestId || !token || !isMounted.current) return;

    const url = `${WS_BASE}/transport/ws/${requestId}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted.current) return;
      reconnectAttempts.current = 0;
      setState((prev) => ({ ...prev, connected: true, error: null }));

      // Ping periódico para manter a conexão viva em mobile/background
      clearPing();
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, PING_INTERVAL_MS);
    };

    ws.onmessage = (event) => {
      if (!isMounted.current) return;
      try {
        const msg = JSON.parse(event.data as string);

        if (msg.type === "pong") return; // Ignorar pongs

        switch (msg.event) {
          case "connected":
            setState((prev) => ({
              ...prev,
              status: msg.data.current_status ?? prev.status,
              role: msg.data.role ?? prev.role,
              location:
                msg.data.latitude != null && msg.data.longitude != null
                  ? {
                      latitude: msg.data.latitude,
                      longitude: msg.data.longitude,
                      timestamp: new Date(),
                    }
                  : prev.location,
              eta: msg.data.hora_prevista_chegada
                ? new Date(msg.data.hora_prevista_chegada)
                : prev.eta,
            }));
            break;

          case "location_update":
            setState((prev) => ({
              ...prev,
              location: {
                latitude: msg.data.latitude,
                longitude: msg.data.longitude,
                timestamp: new Date(),
              },
              eta: msg.data.hora_prevista_chegada
                ? new Date(msg.data.hora_prevista_chegada)
                : prev.eta,
            }));
            break;

          case "status_changed":
            setState((prev) => ({
              ...prev,
              status: msg.data.status,
            }));
            break;
        }
      } catch {
        // JSON inválido — ignorar
      }
    };

    ws.onerror = () => {
      // onclose é sempre chamado após onerror, aí trata a reconexão
    };

    ws.onclose = (event) => {
      clearPing();
      if (!isMounted.current) return;
      setState((prev) => ({ ...prev, connected: false }));

      // Não reconectar se foi intencional (1000) ou política (1008)
      if (event.code === 1000 || event.code === 1008) return;

      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        const delay =
          Math.min(BASE_RECONNECT_DELAY_MS * 2 ** reconnectAttempts.current, 32_000);
        reconnectAttempts.current += 1;
        setState((prev) => ({
          ...prev,
          error: `A reconectar… (tentativa ${reconnectAttempts.current})`,
        }));
        reconnectTimer.current = setTimeout(connect, delay);
      } else {
        setState((prev) => ({
          ...prev,
          error: "Não foi possível manter a ligação ao rastreamento. Recarregue a página.",
        }));
      }
    };
  }, [requestId, token]);

  useEffect(() => {
    isMounted.current = true;
    connect();

    return () => {
      isMounted.current = false;
      clearPing();
      clearReconnect();
      if (wsRef.current) {
        wsRef.current.close(1000, "Componente desmontado");
        wsRef.current = null;
      }
    };
  }, [connect]);

  return state;
}