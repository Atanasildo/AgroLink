"use client";

import { useEffect } from "react";

export function PWAInit() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(reg => {
          // Verificar actualizações a cada 60s
          setInterval(() => reg.update(), 60_000);
        })
        .catch(err => console.warn("SW registration failed:", err));
    }
  }, []);

  return null;
}
