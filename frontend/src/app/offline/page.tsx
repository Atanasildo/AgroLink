export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-6">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-field/10 flex items-center justify-center mx-auto mb-6">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-field/40">
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="font-mono text-xs uppercase tracking-wider text-harvest mb-3">Sem ligação</p>
        <h1 className="font-display text-3xl text-field mb-3">Está offline</h1>
        <p className="font-body text-ink/60 mb-6 leading-relaxed">
          Não foi possível ligar à internet. Os dados que já visitou continuam disponíveis em cache.
        </p>
        <div className="space-y-2">
          <a href="/marketplace" className="block w-full bg-field text-white font-mono text-sm uppercase tracking-wider px-6 py-3 rounded-sm hover:bg-field/90 transition-colors">
            Ver produtos em cache
          </a>
          <button
            onClick={() => window.location.reload()}
            className="block w-full border border-field/30 text-field font-mono text-sm uppercase tracking-wider px-6 py-3 rounded-sm hover:bg-field/5 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
        <p className="font-mono text-xs text-ink/30 mt-6">
          AgroLink funciona offline em zonas rurais
        </p>
      </div>
    </div>
  );
}
