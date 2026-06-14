"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Map, Filter, Loader2, LocateFixed, Plus, X, Navigation,
  Layers, ChevronDown, ChevronUp, MapPin, AlertCircle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  MapEntityType, MapLocation,
  listMapLocations, createMapLocation,
} from "@/lib/api";

const TIPOS: { value: MapEntityType | ""; label: string; emoji: string; color: string }[] = [
  { value: "",              label: "Todos",           emoji: "🗺️", color: "#4a7c4e" },
  { value: "fazenda",       label: "Fazendas",        emoji: "🚜", color: "#4a7c4e" },
  { value: "produto",       label: "Produtos",        emoji: "🛒", color: "#c8832a" },
  { value: "maquina",       label: "Máquinas",        emoji: "⚙️",  color: "#6b7c8a" },
  { value: "transportador", label: "Transportadores", emoji: "🚛", color: "#2a5ea8" },
  { value: "cooperativa",   label: "Cooperativas",    emoji: "🤝", color: "#8a3fa0" },
];

const provincias = [
  "Luanda","Huambo","Benguela","Bié","Malanje","Uíge","Cuanza Norte",
  "Cuanza Sul","Moxico","Cuando Cubango","Cunene","Huíla","Namibe",
  "Zaire","Cabinda","Lunda Norte","Lunda Sul","Bengo",
];

function colorForTipo(tipo: MapEntityType) {
  return TIPOS.find(t => t.value === tipo)?.color ?? "#4a7c4e";
}
function emojiForTipo(tipo: MapEntityType) {
  return TIPOS.find(t => t.value === tipo)?.emoji ?? "📍";
}

// Angola bounding box
const ANGOLA_BOUNDS = { minLat: -18.1, maxLat: -4.3, minLng: 11.4, maxLng: 24.1 };
const ANGOLA_CENTER: [number, number] = [-11.2, 17.9];

export default function MapaPage() {
  const { user, token } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pinMarkerRef = useRef<any>(null);

  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [filtro, setFiltro] = useState<MapEntityType | "">("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MapLocation | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // GPS state
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "active" | "error">("idle");
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  // Add location panel
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [pinPos, setPinPos] = useState<{ lat: number; lng: number } | null>(null);
  const [addForm, setAddForm] = useState({
    nome: "", tipo: "fazenda" as MapEntityType,
    descricao: "", provincia: "", municipio: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Filters panel toggle
  const [showFilters, setShowFilters] = useState(false);

  // Load locations
  const loadLocations = useCallback(() => {
    setLoading(true);
    listMapLocations(filtro ? { tipo: filtro } : {})
      .then(setLocations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filtro]);

  useEffect(() => { loadLocations(); }, [loadLocations]);

  // Init Leaflet map
  useEffect(() => {
    if (typeof window === "undefined" || mapReady) return;

    import("leaflet").then((L) => {
      if (!mapRef.current || leafletMapRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: ANGOLA_CENTER,
        zoom: 6,
        zoomControl: false, // custom position
      });

      // Satellite + Street toggle layers
      const street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      });

      const satellite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "© Esri", maxZoom: 19 }
      );

      street.addTo(map);
      L.control.layers({ "🗺️ Mapa": street, "🛰️ Satélite": satellite }, {}, { position: "topright" }).addTo(map);
      L.control.zoom({ position: "topright" }).addTo(map);

      // Scale bar
      L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);

      // Click on map to place a pin (when add panel is open)
      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        setPinPos({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

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

  // Update pin marker when user clicks map to add location
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;
    import("leaflet").then((L) => {
      if (pinMarkerRef.current) { pinMarkerRef.current.remove(); pinMarkerRef.current = null; }
      if (!pinPos || !showAddPanel) return;

      const icon = L.divIcon({
        html: `<div style="
          background:#c8832a;color:#fff;border-radius:50% 50% 50% 0;
          width:28px;height:28px;transform:rotate(-45deg);
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 8px rgba(0,0,0,0.4);border:2px solid #fff;
          font-size:13px;
        "><span style="transform:rotate(45deg)">📍</span></div>`,
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
      pinMarkerRef.current = L.marker([pinPos.lat, pinPos.lng], { icon })
        .addTo(leafletMapRef.current);
    });
  }, [pinPos, showAddPanel, mapReady]);

  // Update location markers
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;

    import("leaflet").then((L) => {
      const map = leafletMapRef.current!;
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
            background:${color};color:#fff;border-radius:50%;
            width:36px;height:36px;
            display:flex;align-items:center;justify-content:center;
            font-size:16px;
            box-shadow:0 3px 8px rgba(0,0,0,0.35);
            border:2.5px solid #fff;
            transition:transform 0.15s;
          ">${emoji}</div>`,
          className: "",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([lat, lng], { icon }).addTo(map);
        marker.on("click", () => {
          setSelected(loc);
          map.setView([lat, lng], Math.max(map.getZoom(), 12), { animate: true });
        });
        markersRef.current.push(marker);
      });
    });
  }, [locations, mapReady]);

  // GPS — locate user
  function handleLocateMe() {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      return;
    }
    setGpsStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setUserPos({ lat, lng });
        setGpsAccuracy(Math.round(accuracy));
        setGpsStatus("active");

        import("leaflet").then((L) => {
          if (!leafletMapRef.current) return;
          const map = leafletMapRef.current;

          if (userMarkerRef.current) { userMarkerRef.current.remove(); }

          const icon = L.divIcon({
            html: `<div style="position:relative;">
              <div style="
                width:18px;height:18px;background:#2563eb;border-radius:50%;
                border:3px solid #fff;box-shadow:0 2px 8px rgba(37,99,235,0.5);
              "></div>
              <div style="
                position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
                width:${Math.max(18, Math.min(80, accuracy / 5))}px;
                height:${Math.max(18, Math.min(80, accuracy / 5))}px;
                background:rgba(37,99,235,0.12);border-radius:50%;
                border:1.5px solid rgba(37,99,235,0.3);
              "></div>
            </div>`,
            className: "",
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          });

          userMarkerRef.current = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(map);
          userMarkerRef.current.bindPopup(
            `<b>A tua posição</b><br/>Precisão: ±${Math.round(accuracy)}m`
          ).openPopup();

          map.setView([lat, lng], 14, { animate: true });
        });
      },
      (err) => {
        console.error(err);
        setGpsStatus("error");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Add new location
  async function handleAddLocation() {
    if (!token || !pinPos) return;
    setAddLoading(true);
    setAddError(null);
    try {
      await createMapLocation(token, {
        nome: addForm.nome,
        tipo: addForm.tipo,
        descricao: addForm.descricao || undefined,
        provincia: addForm.provincia || undefined,
        municipio: addForm.municipio || undefined,
        latitude: String(pinPos.lat.toFixed(6)),
        longitude: String(pinPos.lng.toFixed(6)),
      });
      // Reset
      setShowAddPanel(false);
      setPinPos(null);
      setAddForm({ nome: "", tipo: "fazenda", descricao: "", provincia: "", municipio: "" });
      loadLocations();
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Erro ao guardar localização.");
    } finally {
      setAddLoading(false);
    }
  }

  return (
    <main className="relative flex flex-col" style={{ height: "calc(100dvh - 57px)" }}>
      {/* Leaflet CSS */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin="" />

      {/* ── TOP BAR ──────────────────────────────────────────── */}
      <div className="border-b border-field/20 bg-cream/95 backdrop-blur px-3 py-2 flex items-center gap-2 flex-wrap shrink-0 z-10">
        {/* Title */}
        <div className="flex items-center gap-2 mr-1">
          <div className="bg-field/10 border border-field/20 rounded-sm p-1.5">
            <Map size={15} className="text-field" />
          </div>
          <span className="font-display text-sm uppercase tracking-widest text-ink hidden sm:inline">
            Mapa GPS
          </span>
        </div>

        {/* Filters toggle (mobile) */}
        <button
          onClick={() => setShowFilters(v => !v)}
          className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider border border-field/30 px-2 py-1 rounded-sm text-ink/60 hover:border-field/60 sm:hidden"
        >
          <Filter size={11} /> Filtros {showFilters ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
        </button>

        {/* Filter chips */}
        <div className={`flex items-center gap-1 flex-wrap ${showFilters ? "flex" : "hidden sm:flex"} w-full sm:w-auto`}>
          {TIPOS.map(t => (
            <button
              key={t.value}
              onClick={() => setFiltro(t.value as MapEntityType | "")}
              className={`font-mono text-[10px] uppercase tracking-wider px-2 py-1 border transition-colors rounded-sm ${
                filtro === t.value
                  ? "bg-field text-cream border-field"
                  : "border-field/30 text-ink/60 hover:border-field/50"
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2">
          {/* Count */}
          {loading
            ? <div className="flex items-center gap-1 font-mono text-xs text-ink/40 animate-pulse"><Loader2 size={11} className="animate-spin"/>A carregar…</div>
            : <span className="font-mono text-[10px] text-ink/40 uppercase">{locations.length} locais</span>
          }

          {/* GPS button */}
          <button
            onClick={handleLocateMe}
            disabled={gpsStatus === "loading"}
            title="Localizar-me via GPS"
            className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1.5 border rounded-sm transition-colors ${
              gpsStatus === "active"
                ? "border-blue-400 text-blue-600 bg-blue-50"
                : gpsStatus === "error"
                ? "border-red-300 text-red-500 bg-red-50"
                : "border-field/30 text-ink/60 hover:border-field/60"
            }`}
          >
            {gpsStatus === "loading"
              ? <Loader2 size={12} className="animate-spin"/>
              : <LocateFixed size={12}/>
            }
            {gpsStatus === "active" ? `GPS ±${gpsAccuracy}m` : gpsStatus === "error" ? "GPS negado" : "GPS"}
          </button>

          {/* Add location (authenticated only) */}
          {token && (
            <button
              onClick={() => { setShowAddPanel(v => !v); setPinPos(null); setAddError(null); }}
              className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1.5 border rounded-sm transition-colors ${
                showAddPanel
                  ? "bg-harvest border-harvest text-white"
                  : "border-harvest/40 text-harvest hover:bg-harvest/10"
              }`}
            >
              {showAddPanel ? <X size={12}/> : <Plus size={12}/>}
              {showAddPanel ? "Cancelar" : "Adicionar"}
            </button>
          )}
        </div>
      </div>

      {/* Add location instruction banner */}
      {showAddPanel && (
        <div className="bg-harvest/10 border-b border-harvest/25 px-4 py-2 flex items-center gap-2 shrink-0 z-10">
          <Navigation size={13} className="text-harvest flex-shrink-0" />
          <p className="font-mono text-[11px] text-harvest/80 uppercase tracking-wide">
            {pinPos
              ? `📍 Ponto seleccionado: ${pinPos.lat.toFixed(5)}, ${pinPos.lng.toFixed(5)} — preenche o formulário abaixo`
              : "Clica no mapa para seleccionar o ponto exacto da localização"
            }
          </p>
        </div>
      )}

      {/* ── MAP + PANELS ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Map */}
        <div ref={mapRef} className="flex-1" />

        {/* Selected location panel */}
        {selected && !showAddPanel && (
          <div className="absolute right-0 top-0 bottom-0 w-72 border-l border-field/20 bg-cream/97 overflow-y-auto shadow-lg z-20 p-4 flex flex-col">
            <button
              onClick={() => setSelected(null)}
              className="font-mono text-[10px] uppercase tracking-wider text-ink/40 hover:text-ink mb-4 flex items-center gap-1 self-start"
            >
              <X size={11}/> Fechar
            </button>

            <div className="text-4xl mb-3">{emojiForTipo(selected.tipo)}</div>
            <h2 className="font-display text-lg uppercase tracking-widest text-ink mb-1 leading-tight">
              {selected.nome}
            </h2>
            <span
              className="inline-block font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm mb-3 self-start"
              style={{ background: colorForTipo(selected.tipo) + "20", color: colorForTipo(selected.tipo) }}
            >
              {TIPOS.find(t => t.value === selected.tipo)?.label ?? selected.tipo}
            </span>

            {selected.descricao && (
              <p className="font-body text-sm text-ink/60 mb-3 leading-relaxed">
                {selected.descricao}
              </p>
            )}

            <div className="space-y-2 border-t border-field/10 pt-3 mt-auto">
              {selected.provincia && (
                <p className="font-mono text-xs text-ink/50 flex items-center gap-1.5">
                  <MapPin size={11} />
                  {selected.provincia}{selected.municipio ? `, ${selected.municipio}` : ""}
                </p>
              )}
              <div className="bg-ink/5 border border-ink/10 rounded-sm px-3 py-2">
                <p className="font-mono text-[10px] text-ink/40 mb-0.5 uppercase tracking-wider">Coordenadas GPS</p>
                <p className="font-mono text-xs text-ink/70 select-all">
                  {Number(selected.latitude).toFixed(6)}, {Number(selected.longitude).toFixed(6)}
                </p>
              </div>
              <p className="font-mono text-[10px] text-ink/30">
                Registado em {new Date(selected.criado_em).toLocaleDateString("pt-AO")}
              </p>

              {/* Open in Google Maps */}
              <a
                href={`https://www.google.com/maps?q=${selected.latitude},${selected.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-field hover:text-field/70 transition-colors mt-1"
              >
                <Navigation size={12}/> Abrir no Google Maps
              </a>
            </div>
          </div>
        )}

        {/* Add location form panel */}
        {showAddPanel && (
          <div className="absolute right-0 top-0 bottom-0 w-80 border-l border-harvest/20 bg-cream/97 overflow-y-auto shadow-lg z-20 p-4 flex flex-col gap-4">
            <div>
              <p className="label-eyebrow mb-1">Nova Localização</p>
              <p className="font-mono text-[11px] text-ink/40">
                {pinPos ? "Coordenadas confirmadas ✓" : "Clica no mapa para escolher o ponto"}
              </p>
            </div>

            {pinPos && (
              <div className="bg-field/8 border border-field/20 rounded-sm px-3 py-2">
                <p className="font-mono text-[10px] text-ink/40 uppercase tracking-wider mb-0.5">GPS Seleccionado</p>
                <p className="font-mono text-xs text-field select-all">
                  {pinPos.lat.toFixed(6)}, {pinPos.lng.toFixed(6)}
                </p>
              </div>
            )}

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink/50">Nome *</span>
              <input
                required value={addForm.nome}
                onChange={e => setAddForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Fazenda São João"
                className="field-input rounded-sm text-sm"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink/50">Tipo *</span>
              <select
                value={addForm.tipo}
                onChange={e => setAddForm(f => ({ ...f, tipo: e.target.value as MapEntityType }))}
                className="field-input rounded-sm text-sm"
              >
                {TIPOS.filter(t => t.value !== "").map(t => (
                  <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink/50">Província</span>
              <select
                value={addForm.provincia}
                onChange={e => setAddForm(f => ({ ...f, provincia: e.target.value }))}
                className="field-input rounded-sm text-sm"
              >
                <option value="">Selecionar…</option>
                {provincias.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink/50">Município</span>
              <input
                value={addForm.municipio}
                onChange={e => setAddForm(f => ({ ...f, municipio: e.target.value }))}
                placeholder="Ex: Caála"
                className="field-input rounded-sm text-sm"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink/50">Descrição</span>
              <textarea
                value={addForm.descricao}
                onChange={e => setAddForm(f => ({ ...f, descricao: e.target.value }))}
                rows={2}
                placeholder="Opcional — culturas, capacidade, etc."
                className="field-input rounded-sm resize-none text-sm"
              />
            </label>

            {addError && (
              <div className="flex items-start gap-2 bg-earth/8 border border-earth/25 rounded-sm p-2.5">
                <AlertCircle size={13} className="text-earth mt-0.5 flex-shrink-0"/>
                <p className="font-body text-earth text-xs">{addError}</p>
              </div>
            )}

            <button
              onClick={handleAddLocation}
              disabled={addLoading || !pinPos || !addForm.nome.trim()}
              className="btn-harvest rounded-sm disabled:opacity-50 justify-center mt-auto"
            >
              <MapPin size={13}/>
              {addLoading ? "A guardar…" : "Guardar no mapa"}
            </button>

            {!pinPos && (
              <p className="font-mono text-[10px] text-ink/35 text-center">
                ← Clica no mapa para definir a posição exacta
              </p>
            )}
          </div>
        )}
      </div>

      {/* Empty state */}
      {!loading && locations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: "57px" }}>
          <div className="bg-cream/90 border border-field/20 px-6 py-4 text-center rounded-sm">
            <Map size={28} className="mx-auto text-field/30 mb-2"/>
            <p className="font-mono text-sm text-ink/40 uppercase tracking-wider">Sem locais registados</p>
            {token && (
              <p className="font-mono text-[10px] text-ink/30 mt-1">
                Clica em "+ Adicionar" para colocar o primeiro ponto
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
