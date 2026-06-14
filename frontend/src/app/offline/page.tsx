"use client";

import { Wifi } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-6">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-field/10 flex items-center justify-center mx-auto mb-6">
          <Wifi size={36} className="text-field/30" strokeWidth={1.5} />
        </div>
        <p className="font-mono text-xs uppercase tracking-wider text-harvest mb-3">Sem ligação</p>
        <h1 className="font-display text-3xl text-field mb-3">Está offline</h1>
        <p className="font-body text-ink/60 mb-6 leading-relaxed">
          Não foi possível ligar à internet. Os dados que já visitou continuam disponíveis em cache.
        </p>
        <div className="space-y-2">
          <a
            href="/marketplace"
            className="flex items-center justify-center gap-2 w-full bg-field text-white font-mono text-sm uppercase tracking-wider px-6 py-3 rounded-sm hover:bg-field/90 transition-colors"
          >
            Ver produtos em cache
          </a>
          <button
            onClick={() => window.location.reload()}
            className="w-full border border-field/30 text-field font-mono text-sm uppercase tracking-wider px-6 py-3 rounded-sm hover:bg-field/5 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
        <p className="font-mono text-xs text-ink/30 mt-6">
          AgroLink funciona offline em zonas rurais com má cobertura
        </p>
      </div>
    </div>
  );
}
