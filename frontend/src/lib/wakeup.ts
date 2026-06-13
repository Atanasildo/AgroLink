/**
 * Acorda o backend Render (free tier) assim que a app carrega.
 * Faz ping silencioso ao /health — se o servidor estiver adormecido,
 * o primeiro ping inicia o cold start ANTES do utilizador clicar em algo.
 */
const API_BASE = "https://agrolink-api-67zk.onrender.com";

let woken = false;

export function wakeupServer(): void {
  if (woken || typeof window === "undefined") return;
  woken = true;

  // Faz pings repetidos até o servidor responder (máx 90s)
  let attempts = 0;
  const maxAttempts = 18; // 18 × 5s = 90s

  const ping = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) return; // servidor acordado ✓
    } catch {
      // ainda a acordar
    }
    attempts++;
    if (attempts < maxAttempts) {
      setTimeout(ping, 5000);
    }
  };

  // Primeiro ping imediato, depois de 2s para dar tempo ao hydration
  setTimeout(ping, 2000);
}
