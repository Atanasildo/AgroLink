"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const API_BASE = "https://agrolink-api-67zk.onrender.com";

type Status = "checking" | "waking" | "online" | "offline";

export function WakingBanner() {
  const [status, setStatus] = useState<Status>("checking");
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval>;

    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`, {
          cache: "no-store",
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          if (!cancelled) { setStatus("online"); clearInterval(timer); }
          return true;
        }
      } catch { /* still waking */ }
      return false;
    };

    const run = async () => {
      const ok = await check();
      if (ok || cancelled) return;
      setStatus("waking");
      // contador de segundos
      timer = setInterval(() => {
        if (!cancelled) setSeconds((s) => s + 1);
      }, 1000);
      // pings a cada 5s
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        const ok = await check();
        if (ok || attempts > 20) {
          clearInterval(interval);
          if (!ok && !cancelled) setStatus("offline");
        }
      }, 5000);
    };

    run();
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  if (status === "online" || status === "checking") return null;

  if (status === "offline") {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-earth text-cream text-sm font-mono px-4 py-3 rounded-sm shadow-lg border border-earth/40">
        ⚠️ Servidor indisponível. Tente recarregar a página.
      </div>
    );
  }

  // status === "waking"
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-field text-cream text-sm font-mono px-4 py-3 rounded-sm shadow-lg border border-harvest/30">
      <div className="flex items-center gap-2 mb-1">
        <Loader2 size={14} className="animate-spin text-harvest" />
        <span className="text-harvest uppercase tracking-wider text-xs">Servidor a acordar</span>
      </div>
      <p className="text-cream/70 text-xs leading-relaxed">
        O servidor está a iniciar.<br />
        Aguarde uns momentos — a página vai carregar automaticamente.
      </p>
      <div className="mt-2 h-1 bg-cream/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-harvest/70 transition-all duration-1000"
          style={{ width: `${Math.min((seconds / 60) * 100, 95)}%` }}
        />
      </div>
      <p className="text-cream/40 text-[10px] mt-1">{seconds}s</p>
    </div>
  );
}
