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
  const [showFilters, setShowFilters] = useState(false);

  // Refs to track state inside Leaflet event handlers (closures don't update)
  const showAddPanelRef = useRef(false);
  useEffect(() => { showAddPanelRef.current = showAddPanel; }, [showAddPanel]);

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

      // Click on map to place a pin — always fires, setPinPos only acts when add panel open
      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        if (showAddPanelRef.current) {
          setPinPos({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
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

  // GPS — locate user with watchPosition for real GPS accuracy
  const watchIdRef = useRef<number | null>(null);
  const [gpsBadAccuracy, setGpsBadAccuracy] = useState(false);

  function handleLocateMe() {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      return;
    }

    // Clear previous watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setGpsStatus("loading");
    setGpsBadAccuracy(false);

    // Use watchPosition so it keeps improving accuracy (network → GPS chip)
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setUserPos({ lat, lng });
        setGpsAccuracy(Math.round(accuracy));
        setGpsStatus("active");

        // Warn if accuracy is worse than 5km (probably IP-based, not real GPS)
        setGpsBadAccuracy(accuracy > 5000);

        import("leaflet").then((L) => {
          if (!leafletMapRef.current) return;
          const map = leafletMapRef.current;

          if (userMarkerRef.current) { userMarkerRef.current.remove(); }

          // Show orange warning dot when accuracy is bad, blue when good
          const dotColor = accuracy > 5000 ? "#f59e0b" : "#2563eb";
          const ringColor = accuracy > 5000 ? "rgba(245,158,11,0.15)" : "rgba(37,99,235,0.12)";

          const icon = L.divIcon({
            html: `<div style="position:relative;width:18px;height:18px;">
              <div style="
                width:18px;height:18px;background:${dotColor};border-radius:50%;
                border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);
                position:absolute;top:0;left:0;
              "></div>
            </div>`,
            className: "",
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          });

          userMarkerRef.current = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(map);
          userMarkerRef.current.bindPopup(
            accuracy > 5000
              ? `<b>⚠️ Posição imprecisa</b><br/>Precisão: ±${Math.round(accuracy / 1000)}km<br/><small>GPS do dispositivo indisponível.<br/>Ver Google Maps para posição real.</small>`
              : `<b>✅ A tua posição</b><br/>Precisão: ±${Math.round(accuracy)}m`
          ).openPopup();

          // Only fly to location on first fix
          if (gpsStatus !== "active") {
            map.setView([lat, lng], accuracy > 5000 ? 10 : 14, { animate: true });
          }
        });

        // Stop watching once we get good accuracy (under 500m)
        if (accuracy <= 500 && watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      },
      (err) => {
        console.error(err);
        setGpsStatus("error");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
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
              gpsStatus === "active" && !gpsBadAccuracy
                ? "border-blue-400 text-blue-600 bg-blue-50"
                : gpsStatus === "active" && gpsBadAccuracy
                ? "border-amber-400 text-amber-600 bg-amber-50"
                : gpsStatus === "error"
                ? "border-red-300 text-red-500 bg-red-50"
                : "border-field/30 text-ink/60 hover:border-field/60"
            }`}
          >
            {gpsStatus === "loading"
              ? <Loader2 size={12} className="animate-spin"/>
              : <LocateFixed size={12}/>
            }
            {gpsStatus === "active"
              ? (gpsBadAccuracy ? `⚠️ ±${(gpsAccuracy!/1000).toFixed(0)}km` : `GPS ±${gpsAccuracy}m`)
              : gpsStatus === "error" ? "GPS negado" : "GPS"
            }
          </button>

          {/* Google Maps fallback when GPS accuracy is bad */}
          {gpsStatus === "active" && gpsBadAccuracy && userPos && (
            <a
              href={`https://www.google.com/maps?q=${userPos.lat},${userPos.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              title="GPS impreciso — abrir Google Maps para posição real"
              className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1.5 border border-amber-400 rounded-sm text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
            >
              <Navigation size={12}/> Google Maps
            </a>
          )}

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

      {/* Add location instruction banner — pointer-events-none so map stays clickable */}
      {showAddPanel && (
        <div className="pointer-events-none bg-harvest/10 border-b border-harvest/25 px-4 py-2 flex items-center gap-2 shrink-0 z-10">
          <Navigation size={13} className="text-harvest flex-shrink-0" />
          <p className="font-mono text-[11px] text-harvest/80 uppercase tracking-wide">
            {pinPos
              ? `📍 ${pinPos.lat.toFixed(5)}, ${pinPos.lng.toFixed(5)} — preenche o formulário abaixo`
              : "Clica no mapa para seleccionar o ponto exacto da localização"
            }
          </p>
        </div>
      )}

      {/* Bad GPS accuracy warning */}
      {gpsStatus === "active" && gpsBadAccuracy && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 shrink-0 z-10">
          <AlertCircle size={13} className="text-amber-600 flex-shrink-0" />
          <p className="font-mono text-[11px] text-amber-700 flex-1">
            GPS impreciso (±{gpsAccuracy && gpsAccuracy > 1000 ? `${Math.round(gpsAccuracy/1000)}km` : `${gpsAccuracy}m`}) — o browser usou a rede em vez do chip GPS.
            Para a posição real, usa o{" "}
            <a
              href={`https://www.google.com/maps?q=${userPos?.lat},${userPos?.lng}`}
              target="_blank" rel="noopener noreferrer"
              className="underline font-bold"
            >Google Maps</a>{" "}ou ativa o GPS do dispositivo e tenta novamente.
          </p>
        </div>
      )}

      {/* ── MAP + PANELS ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Map */}
        <div
          ref={mapRef}
          className="flex-1"
          style={{ cursor: showAddPanel ? "crosshair" : "grab" }}
        />

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

      </div>
      {/* Add location form — bottom sheet fixed */}
      {showAddPanel && (
        <div className="fixed bottom-0 left-0 right-0 bg-cream border-t-2 border-harvest/40 shadow-2xl z-[9999] max-h-[52vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-cream border-b border-harvest/20 px-4 py-2.5 flex items-center justify-between">
            <div>
              <p className="font-display text-sm uppercase tracking-widest text-harvest">Nova Localização</p>
              <p className="font-mono text-[10px] text-ink/40 mt-0.5">
                {pinPos
                  ? `📍 ${pinPos.lat.toFixed(5)}, ${pinPos.lng.toFixed(5)} ✓`
                  : "↑ Clica no mapa acima para definir o ponto exacto"
                }
              </p>
            </div>
            <button
              onClick={() => { setShowAddPanel(false); setPinPos(null); setAddError(null); }}
              className="text-ink/40 hover:text-ink transition-colors p-1 ml-4 flex-shrink-0"
            >
              <X size={18}/>
            </button>
          </div>

          {/* Form grid */}
          <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {pinPos && (
              <div className="col-span-2 sm:col-span-4 bg-field/8 border border-field/20 rounded-sm px-3 py-1.5">
                <p className="font-mono text-[9px] text-ink/40 uppercase tracking-wider">Coordenadas GPS</p>
                <p className="font-mono text-xs text-field select-all">{pinPos.lat.toFixed(6)}, {pinPos.lng.toFixed(6)}</p>
              </div>
            )}

            <label className="flex flex-col gap-1 col-span-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-ink/50">Nome *</span>
              <input
                value={addForm.nome}
                onChange={e => setAddForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Fazenda São João"
                className="field-input rounded-sm text-sm py-1.5"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-mono text-[9px] uppercase tracking-wider text-ink/50">Tipo *</span>
              <select
                value={addForm.tipo}
                onChange={e => setAddForm(f => ({ ...f, tipo: e.target.value as MapEntityType }))}
                className="field-input rounded-sm text-sm py-1.5"
              >
                {TIPOS.filter(t => t.value !== "").map(t => (
                  <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-mono text-[9px] uppercase tracking-wider text-ink/50">Província</span>
              <select
                value={addForm.provincia}
                onChange={e => setAddForm(f => ({ ...f, provincia: e.target.value }))}
                className="field-input rounded-sm text-sm py-1.5"
              >
                <option value="">Selecionar…</option>
                {provincias.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-mono text-[9px] uppercase tracking-wider text-ink/50">Município</span>
              <input
                value={addForm.municipio}
                onChange={e => setAddForm(f => ({ ...f, municipio: e.target.value }))}
                placeholder="Ex: Caála"
                className="field-input rounded-sm text-sm py-1.5"
              />
            </label>

            <label className="flex flex-col gap-1 col-span-2 sm:col-span-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-ink/50">Descrição (opcional)</span>
              <input
                value={addForm.descricao}
                onChange={e => setAddForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Culturas, capacidade, contacto…"
                className="field-input rounded-sm text-sm py-1.5"
              />
            </label>

            <div className="flex flex-col justify-end col-span-2 sm:col-span-1">
              <button
                onClick={handleAddLocation}
                disabled={addLoading || !pinPos || !addForm.nome.trim()}
                className="btn-harvest rounded-sm disabled:opacity-40 justify-center"
                style={{ height: "38px" }}
              >
                <MapPin size={13}/>
                {addLoading ? "A guardar…" : "Guardar no mapa"}
              </button>
            </div>

            {addError && (
              <div className="col-span-2 sm:col-span-4 flex items-start gap-2 bg-earth/8 border border-earth/25 rounded-sm p-2">
                <AlertCircle size={12} className="text-earth mt-0.5 flex-shrink-0"/>
                <p className="font-body text-earth text-xs">{addError}</p>
              </div>
            )}

            {!pinPos && (
              <p className="col-span-2 sm:col-span-4 font-mono text-[10px] text-harvest/60 text-center py-0.5">
                ↑ Clica em qualquer sítio do mapa acima para colocar o pin
              </p>
            )}
          </div>
        </div>
      )}

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
