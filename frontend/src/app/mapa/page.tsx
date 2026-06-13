"use client";

import { useEffect, useRef, useState } from "react";
import { Map, Filter, Loader2 } from "lucide-react";
import { MapEntityType, MapLocation, listMapLocations } from "@/lib/api";

const TIPOS: { value: MapEntityType | ""; label: string; emoji: string; color: string }[] = [
  { value: "",              label: "Todos",          emoji: "🗺️", color: "#4a7c4e" },
  { value: "fazenda",       label: "Fazendas",       emoji: "🚜", color: "#4a7c4e" },
  { value: "produto",       label: "Produtos",       emoji: "🛒", color: "#c8832a" },
  { value: "maquina",       label: "Máquinas",       emoji: "⚙️", color: "#6b7c8a" },
  { value: "transportador", label: "Transportadores",emoji: "🚛", color: "#2a5ea8" },
  { value: "cooperativa",   label: "Cooperativas",   emoji: "🤝", color: "#8a3fa0" },
];

function colorForTipo(tipo: MapEntityType) {
  return TIPOS.find((t) => t.value === tipo)?.color ?? "#4a7c4e";
}
function emojiForTipo(tipo: MapEntityType) {
  return TIPOS.find((t) => t.value === tipo)?.emoji ?? "📍";
}

export default function MapaPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<ReturnType<typeof import("leaflet")["map"]> | null>(null);
  const markersRef = useRef<unknown[]>([]);
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [filtro, setFiltro] = useState<MapEntityType | "">("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MapLocation | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Load locations
  useEffect(() => {
    setLoading(true);
    listMapLocations(filtro ? { tipo: filtro } : {})
      .then(setLocations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filtro]);

  // Init Leaflet map once
  useEffect(() => {
    if (typeof window === "undefined" || mapReady) return;

    import("leaflet").then((L) => {
      if (!mapRef.current || leafletMapRef.current) return;

      // Fix default icon path for Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [-11.2, 17.9], // Angola centre
        zoom: 6,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      leafletMapRef.current = map;
      setMapReady(true);
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers when locations change
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;

    import("leaflet").then((L) => {
      const map = leafletMapRef.current!;

      // Clear old markers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      markersRef.current.forEach((m: any) => m.remove());
      markersRef.current = [];

      locations.forEach((loc) => {
        const lat = Number(loc.latitude);
        const lng = Number(loc.longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        const color = colorForTipo(loc.tipo);
        const emoji = emojiForTipo(loc.tipo);

        const icon = L.divIcon({
          html: `<div style="
            background:${color};
            color:#fff;
            border-radius:50%;
            width:32px;height:32px;
            display:flex;align-items:center;justify-content:center;
            font-size:14px;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
            border:2px solid #fff;
          ">${emoji}</div>`,
          className: "",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([lat, lng], { icon }).addTo(map);
        marker.on("click", () => setSelected(loc));
        markersRef.current.push(marker);
      });
    });
  }, [locations, mapReady]);

  return (
    <main className="relative flex flex-col" style={{ height: "calc(100dvh - 57px)" }}>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />

      {/* Top bar */}
      <div className="border-b border-field/20 bg-cream/95 backdrop-blur px-4 py-3 flex items-center gap-4 flex-wrap shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-field/10 border border-field/20 rounded-sm p-1.5">
            <Map size={16} className="text-field" />
          </div>
          <span className="font-display text-sm uppercase tracking-widest text-ink">
            Mapa Agrícola
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Filter size={12} className="text-ink/40" />
          <div className="flex gap-1 flex-wrap">
            {TIPOS.map((t) => (
              <button
                key={t.value}
                onClick={() => setFiltro(t.value as MapEntityType | "")}
                className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 border transition-colors rounded-sm ${
                  filtro === t.value
                    ? "bg-field text-cream border-field"
                    : "border-field/30 text-ink/60 hover:border-field/50"
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="ml-auto flex items-center gap-1.5 font-mono text-xs text-ink/40 animate-pulse">
            <Loader2 size={12} className="animate-spin" />
            A carregar…
          </div>
        )}
        {!loading && (
          <span className="ml-auto font-mono text-[10px] text-ink/40 uppercase">
            {locations.length} locais
          </span>
        )}
      </div>

      {/* Map + sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div ref={mapRef} className="flex-1" />

        {/* Selected panel */}
        {selected && (
          <div className="w-72 border-l border-field/20 bg-cream overflow-y-auto shrink-0 p-4">
            <button
              onClick={() => setSelected(null)}
              className="font-mono text-[10px] uppercase tracking-wider text-ink/40 hover:text-ink mb-4"
            >
              ✕ Fechar
            </button>

            <div className="text-3xl mb-2">{emojiForTipo(selected.tipo)}</div>
            <h2 className="font-display text-lg uppercase tracking-widest text-ink mb-1">
              {selected.nome}
            </h2>
            <span
              className="inline-block font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm mb-3"
              style={{ background: colorForTipo(selected.tipo) + "20", color: colorForTipo(selected.tipo) }}
            >
              {TIPOS.find((t) => t.value === selected.tipo)?.label ?? selected.tipo}
            </span>

            {selected.descricao && (
              <p className="font-mono text-sm text-ink/60 mb-3 leading-relaxed">
                {selected.descricao}
              </p>
            )}

            <div className="space-y-1 border-t border-field/10 pt-3">
              {selected.provincia && (
                <p className="font-mono text-xs text-ink/50">
                  📍 {selected.provincia}{selected.municipio ? `, ${selected.municipio}` : ""}
                </p>
              )}
              <p className="font-mono text-[10px] text-ink/30">
                {Number(selected.latitude).toFixed(4)}, {Number(selected.longitude).toFixed(4)}
              </p>
              <p className="font-mono text-[10px] text-ink/30">
                {new Date(selected.criado_em).toLocaleDateString("pt-AO")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Empty overlay */}
      {!loading && locations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: "57px" }}>
          <div className="bg-cream/90 border border-field/20 px-6 py-4 text-center">
            <Map size={28} className="mx-auto text-field/30 mb-2" />
            <p className="font-mono text-sm text-ink/40 uppercase tracking-wider">
              Sem locais registados
            </p>
          </div>
        </div>
      )}
    </main>
  );
}