/**
 * frontend/src/lib/useLocationBroadcaster.ts
 *
 * Hook React usado do lado do TRANSPORTADOR: captura a localização GPS do
 * dispositivo (navigator.geolocation.watchPosition) e envia-a em tempo real
 * através do mesmo WebSocket de rastreamento (/transport/ws/{requestId}),
 * usando o canal já suportado pelo backend para mensagens { type: "location" }.
 *
 * Complementa o useTransportTracking (que é só de LEITURA, usado do lado do
 * agricultor). Este hook é de ESCRITA: só ativo quando `active` é true
 * (tipicamente quando o status da solicitação é "em_andamento").
 *
 * Uso:
 *   const { broadcasting, lastSentAt, error } =
 *     useLocationBroadcaster(requestId, token, status === "em_andamento");
 */

import { useEffect, useRef, useState } from "react";

const WS_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? "https://agrolink-api-67zk.onrender.com/api/v1")
    .replace(/^https?/, (p) => (p === "https" ? "wss" : "ws"));

export interface BroadcasterState {
  broadcasting: boolean;
  lastSentAt: Date | null;
  error: string | null;
}

// Não enviar atualizações com mais frequência que isto, para não inundar o
// WebSocket nem gastar bateria/dados do transportador.
const SEND_MIN_INTERVAL_MS = 5_000;

export function useLocationBroadcaster(
  requestId: string | null,
  token: string | null,
  active: boolean
): BroadcasterState {
  const [state, setState] = useState<BroadcasterState>({
    broadcasting: false,
    lastSentAt: null,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);

  useEffect(() => {
    if (!active || !requestId || !token) {
      setState((s) => (s.broadcasting || s.error ? { broadcasting: false, lastSentAt: s.lastSentAt, error: null } : s));
      return;
    }

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState((s) => ({ ...s, error: "Este dispositivo/navegador não suporta partilha de GPS." }));
      return;
    }

    let cancelled = false;

    const url = `${WS_BASE}/transport/ws/${requestId}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (cancelled) return;
      setState((s) => ({ ...s, error: null }));
    };

    ws.onerror = () => {
      if (cancelled) return;
      setState((s) => ({ ...s, error: "Falha na ligação ao servidor de rastreamento." }));
    };

    ws.onclose = () => {
      if (cancelled) return;
      setState((s) => ({ ...s, broadcasting: false }));
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (cancelled) return;
        const now = Date.now();
        if (now - lastSentRef.current < SEND_MIN_INTERVAL_MS) return;

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          lastSentRef.current = now;
          wsRef.current.send(
            JSON.stringify({
              type: "location",
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            })
          );
          setState((s) => ({ ...s, broadcasting: true, lastSentAt: new Date(), error: null }));
        }
      },
      (err) => {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          error:
            err.code === err.PERMISSION_DENIED
              ? "Permissão de localização negada. Ative o GPS para partilhar a sua posição."
              : `Não foi possível obter a localização (${err.message}).`,
        }));
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 }
    );
    watchIdRef.current = watchId;

    return () => {
      cancelled = true;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "Broadcaster parado");
        wsRef.current = null;
      }
    };
  }, [active, requestId, token]);

  return state;
}
