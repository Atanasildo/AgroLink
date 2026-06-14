"use client";

/**
 * frontend/src/components/Transport/TransportTrackingMap.tsx
 *
 * Mapa de rastreamento em tempo real de um transporte específico.
 * Usa Leaflet (já instalado via @types/leaflet + leaflet no package.json).
 * Liga-se via WebSocket usando o hook useTransportTracking.
 *
 * Props:
 *   requestId  — UUID da solicitação de transporte
 *   token      — JWT do utilizador autenticado
 *   origem     — nome da origem (ex: "Caála")
 *   destino    — nome do destino (ex: "Huambo")
 *   produto    — nome do produto (ex: "Milho")
 *
 * Uso na página /transporte:
 *   <TransportTrackingMap
 *     requestId={request.id}
 *     token={token}
 *     origem={request.origem}
 *     destino={request.destino}
 *     produto={request.produto}
 *   />
 */

import { useEffect, useRef } from "react";
import { Clock, MapPin, Navigation, Signal, SignalZero, Truck, Wifi, WifiOff } from "lucide-react";
import { useTransportTracking } from "@/lib/useTransportTracking";

// Labels de status
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pendente:     { label: "Pendente",     color: "text-ink/50" },
  aceite:       { label: "Aceite",       color: "text-harvest" },
  em_andamento: { label: "Em andamento", color: "text-field" },
  concluido:    { label: "Concluído",    color: "text-field" },
  cancelado:    { label: "Cancelado",    color: "text-earth" },
};

interface Props {
  requestId: string;
  token: string;
  origem: string;
  destino: string;
  produto: string;
}

export function TransportTrackingMap({ requestId, token, origem, destino, produto }: Props) {
  const { connected, location, status, eta, role, error } = useTransportTracking(requestId, token);
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);  // instância do mapa Leaflet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);   // marcador do caminhão

  // Inicializa o mapa Leaflet uma única vez (client-side only)
  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current || leafletRef.current) return;

    // Leaflet está disponível via CDN ou package
    import("leaflet").then((L) => {
      // Fix para ícones Leaflet em Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Centro inicial: Angola
      const map = L.map(mapRef.current!, {
        center: [-11.8, 17.8],
        zoom: 6,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      // Ícone personalizado do caminhão
      const truckIcon = L.divIcon({
        html: `<div style="
          background:#1a7a3c;
          border:2px solid white;
          border-radius:50%;
          width:32px;
          height:32px;
          display:flex;
          align-items:center;
          justify-content:center;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
          font-size:16px;
        ">🚛</div>`,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([-11.8, 17.8], { icon: truckIcon }).addTo(map);
      marker.bindPopup(`<b>🚛 ${produto}</b><br>${origem} → ${destino}`);

      leafletRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
        markerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualiza o marcador quando chega nova localização GPS
  useEffect(() => {
    if (!location || !leafletRef.current || !markerRef.current) return;
    const latlng = [location.latitude, location.longitude] as [number, number];
    markerRef.current.setLatLng(latlng);
    leafletRef.current.setView(latlng, Math.max(leafletRef.current.getZoom(), 12), {
      animate: true,
      duration: 1,
    });
    markerRef.current.setPopupContent(
      `<b>🚛 ${produto}</b><br>${origem} → ${destino}<br>` +
      `<small>Atualizado: ${location.timestamp.toLocaleTimeString("pt-AO")}</small>`
    );
  }, [location, produto, origem, destino]);

  const statusInfo = STATUS_LABELS[status ?? "pendente"] ?? STATUS_LABELS.pendente;
  const hasLocation = location !== null;

  return (
    <div className="field-card rounded-sm overflow-hidden">
      {/* Cabeçalho */}
      <div className="p-4 border-b border-field/10 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Navigation size={16} className="text-field" />
          <span className="font-mono text-sm font-bold text-field">
            Rastreamento em Tempo Real
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Indicador de conexão WS */}
          <span className={`flex items-center gap-1 font-mono text-xs ${connected ? "text-field" : "text-ink/40"}`}>
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {connected ? "Conectado" : "Desconectado"}
          </span>
          {/* Status do transporte */}
          <span className={`font-mono text-xs font-bold uppercase tracking-wider ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Rota */}
      <div className="px-4 py-3 bg-field/5 border-b border-field/10 flex items-center gap-2 flex-wrap">
        <MapPin size={13} className="text-harvest flex-shrink-0" />
        <span className="font-body text-sm text-ink/70">
          <span className="font-bold text-field">{origem}</span>
          <span className="mx-1 text-ink/30">→</span>
          <span className="font-bold text-field">{destino}</span>
        </span>
        <span className="ml-1 font-body text-xs text-ink/40">· {produto}</span>
        {eta && (
          <span className="ml-auto flex items-center gap-1 font-mono text-xs text-harvest">
            <Clock size={11} />
            Chegada prevista: {eta.toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {/* Mapa */}
      <div className="relative">
        {/* Aviso quando não há localização GPS ainda */}
        {!hasLocation && status === "em_andamento" && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="text-center">
              <Signal size={24} className="text-field/30 mx-auto mb-2 animate-pulse" />
              <p className="font-mono text-xs text-ink/50">À espera de sinal GPS...</p>
            </div>
          </div>
        )}
        {status === "pendente" && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center bg-white/90 backdrop-blur-sm">
            <div className="text-center px-6">
              <Truck size={28} className="text-field/30 mx-auto mb-2" />
              <p className="font-mono text-sm text-ink/50 mb-1">Aguardando aceitação</p>
              <p className="font-body text-xs text-ink/35">
                O mapa ficará ativo quando o transportador aceitar o pedido.
              </p>
            </div>
          </div>
        )}
        {status === "concluido" && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center bg-field/5 backdrop-blur-sm">
            <div className="text-center px-6">
              <div className="text-4xl mb-2">✅</div>
              <p className="font-mono text-sm text-field font-bold mb-1">Transporte concluído!</p>
              <p className="font-body text-xs text-ink/50">A carga chegou ao destino.</p>
            </div>
          </div>
        )}

        {/* Mapa Leaflet */}
        <div
          ref={mapRef}
          style={{ height: "380px", width: "100%" }}
          className="z-0"
        />
      </div>

      {/* Rodapé com última atualização */}
      {error && (
        <div className="px-4 py-2 bg-earth/5 border-t border-earth/20">
          <p className="font-mono text-xs text-earth flex items-center gap-1">
            <SignalZero size={11} /> {error}
          </p>
        </div>
      )}
      {hasLocation && !error && (
        <div className="px-4 py-2 border-t border-field/10 flex items-center gap-2">
          <Signal size={11} className="text-field" />
          <p className="font-mono text-xs text-ink/50">
            GPS atualizado às {location!.timestamp.toLocaleTimeString("pt-AO")}
            {role === "agricultor" && " · O transportador está a enviar a localização em tempo real"}
          </p>
        </div>
      )}
    </div>
  );
}