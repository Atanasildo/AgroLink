"use client";

import { useEffect, useRef } from "react";

const API_BASE = "https://agrolink-api-67zk.onrender.com";

/**
 * Quando uma página falha ao carregar (cold start), este hook
 * fica a monitorar o /health e chama `onOnline` quando o servidor
 * estiver disponível — disparando um reload automático dos dados.
 */
export function useAutoRetry(failed: boolean, onOnline: () => void) {
  const onlineRef = useRef(onOnline);
  onlineRef.current = onOnline;

  useEffect(() => {
    if (!failed) return;
    let cancelled = false;
    let attempts = 0;

    const check = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`${API_BASE}/health`, {
          cache: "no-store",
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          if (!cancelled) onlineRef.current();
          return;
        }
      } catch { /* still offline */ }
      attempts++;
      if (attempts < 20 && !cancelled) setTimeout(check, 5000);
    };

    setTimeout(check, 3000);
    return () => { cancelled = true; };
  }, [failed]);
}
