import { MapPin, Truck, Weight } from "lucide-react";

interface RouteDiagramProps {
  origem: string;
  destino: string;
  capacidadeTotal: number;
  capacidadeDisponivel: number;
}

export function RouteDiagram({ origem, destino, capacidadeTotal, capacidadeDisponivel }: RouteDiagramProps) {
  const usada = capacidadeTotal - capacidadeDisponivel;
  const pct = Math.round((usada / capacidadeTotal) * 100);

  return (
    <div className="space-y-4">
      {/* Linha de rota */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center gap-1">
          <MapPin size={18} className="text-harvest flex-shrink-0" />
          <p className="font-display text-sm text-current leading-none">{origem}</p>
        </div>

        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="route-line w-full" />
          <Truck size={14} className="text-current opacity-60" />
        </div>

        <div className="flex flex-col items-center gap-1">
          <MapPin size={18} className="text-field-muted flex-shrink-0" />
          <p className="font-display text-sm text-current leading-none">{destino}</p>
        </div>
      </div>

      {/* Barra de capacidade */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider opacity-60">
            <Weight size={11} /> Capacidade
          </span>
          <span className="font-mono text-xs opacity-60">
            {usada}t / {capacidadeTotal}t ({pct}% ocupado)
          </span>
        </div>
        <div className="h-2.5 bg-current/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-harvest rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="font-mono text-xs opacity-60">
          {capacidadeDisponivel} toneladas disponíveis
        </p>
      </div>
    </div>
  );
}
