"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  Truck, Plus, Trash2, CheckCircle, XCircle, Clock, Loader,
  MapPin, Weight, Package, ChevronDown, ChevronUp, ToggleLeft, ToggleRight,
} from "lucide-react";
import {
  Vehicle, TransportRoute, TransportRequestItem,
  myVehicles, createVehicle, deleteVehicle, updateVehicle,
  myRoutes, createRoute,
  incomingTransportRequests, acceptTransportRequest, updateRequestStatus,
  ApiError,
} from "@/lib/api";
import { ImageUpload } from "./ImageUpload";

// ---- Constants ----
const provincias = ["Bengo","Benguela","Bié","Cabinda","Cuando Cubango","Cuanza Norte","Cuanza Sul","Cunene","Huambo","Huíla","Luanda","Lunda Norte","Lunda Sul","Malanje","Moxico","Namibe","Uíge","Zaire"];
const municipios: Record<string, string[]> = {
  "Luanda": ["Luanda", "Cacuaco", "Viana"],
  "Huambo": ["Huambo", "Caála", "Catchiungo"],
  "Bié": ["Kuito", "Camacupa", "Chinguar"],
  "Malanje": ["Malanje", "Calandula"],
  "Uíge": ["Uíge", "Negage"],
  "Benguela": ["Benguela", "Lobito"],
  "Cuanza Sul": ["Sumbe", "Amboim"],
};

const tipoVeiculoLabels: Record<string, string> = {
  caminhao: "🚛 Caminhão",
  carrinha: "🚐 Carrinha",
  trator_carga: "🚜 Trator de carga",
  reboque: "🔩 Reboque",
};

const statusConfig: Record<string, { label: string; icon: typeof Clock; cls: string }> = {
  pendente:     { label: "Pendente",     icon: Clock,        cls: "pending" },
  aceite:       { label: "Aceite",       icon: CheckCircle,  cls: "active" },
  em_andamento: { label: "Em andamento", icon: Loader,       cls: "active" },
  concluido:    { label: "Concluído",    icon: CheckCircle,  cls: "done" },
  cancelado:    { label: "Cancelado",    icon: XCircle,      cls: "done" },
};

function formatKz(value?: string | null) {
  if (!value) return "—";
  return new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(parseFloat(value)) + " Kz";
}

// ---- Main Component ----
export function TransporterDashboard({ token }: { token: string }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [requests, setRequests] = useState<TransportRequestItem[]>([]);
  const [loadingAll, setLoadingAll] = useState(true);

  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showRouteForm, setShowRouteForm] = useState(false);

  async function loadAll() {
    setLoadingAll(true);
    try {
      const [v, r, req] = await Promise.all([
        myVehicles(token),
        myRoutes(token),
        incomingTransportRequests(token),
      ]);
      setVehicles(v);
      setRoutes(r);
      setRequests(req);
    } catch {
      // silent
    } finally {
      setLoadingAll(false);
    }
  }

  useEffect(() => { loadAll(); }, [token]);

  if (loadingAll) {
    return (
      <div className="text-center py-16">
        <Truck size={28} className="text-field/30 mx-auto mb-2 animate-pulse" />
        <p className="font-mono text-sm text-ink/40">A carregar o seu painel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="border-b border-field/15 pb-6">
        <p className="label-eyebrow mb-1">Painel do Transportador</p>
        <h2 className="text-3xl text-field">A sua operação</h2>
        <p className="font-body text-ink/50 mt-1">
          Gira a sua frota, publique rotas e responda às solicitações recebidas.
        </p>
      </div>

      {/* ---- Minha Frota ---- */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl text-field flex items-center gap-2">
            <Truck size={18} className="text-harvest" />
            Minha Frota ({vehicles.length})
          </h3>
          <button
            onClick={() => setShowVehicleForm(v => !v)}
            className="btn-primary rounded-sm text-xs"
          >
            <Plus size={14} />
            {showVehicleForm ? "Cancelar" : "Adicionar veículo"}
          </button>
        </div>

        {showVehicleForm && (
          <VehicleForm
            token={token}
            onSuccess={() => { setShowVehicleForm(false); loadAll(); }}
          />
        )}

        {vehicles.length === 0 && !showVehicleForm ? (
          <div className="field-card text-center py-10 rounded-sm">
            <Truck size={28} className="text-field/25 mx-auto mb-3" />
            <p className="font-display text-xl text-field mb-1">Sem veículos registados</p>
            <p className="font-body text-ink/45 text-sm">Adicione o seu primeiro veículo para começar a publicar rotas.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {vehicles.map(v => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                token={token}
                onDeleted={loadAll}
                onToggled={loadAll}
              />
            ))}
          </div>
        )}
      </section>

      {/* ---- Publicar Rota ---- */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl text-field flex items-center gap-2">
            <MapPin size={18} className="text-harvest" />
            Rotas Publicadas ({routes.length})
          </h3>
          {vehicles.length > 0 && (
            <button
              onClick={() => setShowRouteForm(v => !v)}
              className="btn-primary rounded-sm text-xs"
            >
              <Plus size={14} />
              {showRouteForm ? "Cancelar" : "Nova rota"}
            </button>
          )}
        </div>

        {showRouteForm && vehicles.length > 0 && (
          <RouteForm
            token={token}
            vehicles={vehicles}
            onSuccess={() => { setShowRouteForm(false); loadAll(); }}
          />
        )}

        {vehicles.length === 0 && (
          <p className="font-body text-ink/45 text-sm">Registe um veículo primeiro para poder publicar rotas.</p>
        )}

        {routes.length === 0 && vehicles.length > 0 && !showRouteForm ? (
          <div className="field-card text-center py-10 rounded-sm">
            <MapPin size={28} className="text-field/25 mx-auto mb-3" />
            <p className="font-display text-xl text-field mb-1">Sem rotas publicadas</p>
            <p className="font-body text-ink/45 text-sm">Publique uma rota para receber pedidos de transporte.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {routes.map(route => (
              <div key={route.id} className="field-card rounded-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin size={14} className="text-harvest" />
                      <p className="font-display text-base text-field">{route.origem} → {route.destino}</p>
                    </div>
                    <div className="flex flex-wrap gap-4 font-mono text-xs text-ink/50 mt-2">
                      <span>📅 {new Date(route.data).toLocaleDateString("pt-AO")}</span>
                      <span>⚖️ {route.capacidade_disponivel_toneladas}t disponíveis de {route.capacidade_total_toneladas}t</span>
                      <span className="text-harvest font-bold">{formatKz(route.preco_por_tonelada)}/t</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---- Solicitações Recebidas ---- */}
      <section>
        <h3 className="text-xl text-field flex items-center gap-2 mb-4">
          <Package size={18} className="text-harvest" />
          Solicitações Recebidas ({requests.length})
        </h3>

        {requests.length === 0 ? (
          <div className="field-card text-center py-10 rounded-sm">
            <Package size={28} className="text-field/25 mx-auto mb-3" />
            <p className="font-display text-xl text-field mb-1">Sem solicitações ainda</p>
            <p className="font-body text-ink/45 text-sm">As solicitações de agricultores aparecerão aqui quando as suas rotas forem encontradas.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(req => (
              <RequestCard
                key={req.id}
                request={req}
                token={token}
                onUpdated={loadAll}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ---- Vehicle Form ----
function VehicleForm({ token, onSuccess }: { token: string; onSuccess: () => void }) {
  const [tipo, setTipo] = useState("caminhao");
  const [capacidade, setCapacidade] = useState("");
  const [matricula, setMatricula] = useState("");
  const [provincia, setProvincia] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [imagens, setImagens] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createVehicle(token, {
        tipo,
        capacidade_toneladas: parseFloat(capacidade),
        matricula,
        provincia,
        municipio,
        imagens: imagens.length > 0 ? imagens : undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Erro ao registar veículo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="field-card rounded-sm mb-4">
      <p className="label-eyebrow mb-4">Registar novo veículo</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Tipo de veículo</span>
          <select value={tipo} onChange={e => setTipo(e.target.value)} className="field-input rounded-sm">
            {Object.entries(tipoVeiculoLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Capacidade (toneladas)</span>
          <input
            required type="number" min="0.1" step="0.1"
            value={capacidade} onChange={e => setCapacidade(e.target.value)}
            placeholder="Ex: 5.0"
            className="field-input rounded-sm"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Matrícula</span>
          <input
            required value={matricula} onChange={e => setMatricula(e.target.value)}
            placeholder="Ex: LD-12-34-AB"
            className="field-input rounded-sm"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Província</span>
          <select
            required value={provincia}
            onChange={e => { setProvincia(e.target.value); setMunicipio(""); }}
            className="field-input rounded-sm"
          >
            <option value="">Selecionar...</option>
            {provincias.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Município</span>
          <select
            required value={municipio} onChange={e => setMunicipio(e.target.value)}
            className="field-input rounded-sm" disabled={!provincia}
          >
            <option value="">Selecionar...</option>
            {provincia && municipios[provincia]?.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <div className="sm:col-span-2">
          <ImageUpload images={imagens} onChange={setImagens} maxImages={4} label="Fotos do veículo" />
        </div>
      </div>
      {error && <p className="text-earth font-body text-sm mt-3">{error}</p>}
      <div className="mt-4">
        <button type="submit" disabled={loading} className="btn-harvest rounded-sm disabled:opacity-50">
          <Plus size={14} />
          {loading ? "A registar..." : "Registar veículo"}
        </button>
      </div>
    </form>
  );
}

// ---- Vehicle Card ----
function VehicleCard({
  vehicle, token, onDeleted, onToggled,
}: {
  vehicle: Vehicle;
  token: string;
  onDeleted: () => void;
  onToggled: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleDelete() {
    if (!confirm("Tem a certeza que quer remover este veículo?")) return;
    setDeleting(true);
    try {
      await deleteVehicle(token, vehicle.id);
      onDeleted();
    } catch { setDeleting(false); }
  }

  async function handleToggle() {
    setToggling(true);
    try {
      await updateVehicle(token, vehicle.id, { disponivel: !vehicle.disponivel });
      onToggled();
    } catch { setToggling(false); }
  }

  return (
    <div className="field-card rounded-sm">
      {/* Galeria de fotos (se existir) */}
      {vehicle.imagens && vehicle.imagens.length > 0 && (
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-0.5">
          {vehicle.imagens.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`Foto ${i + 1}`}
              className="w-20 h-16 object-cover rounded-sm flex-shrink-0 border border-field/15"
            />
          ))}
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-display text-base text-field mb-0.5">
            {tipoVeiculoLabels[vehicle.tipo] ?? vehicle.tipo}
          </p>
          <p className="font-mono text-xs text-ink/50 mb-2">{vehicle.matricula}</p>
          <div className="flex flex-wrap gap-3 font-mono text-xs text-ink/50">
            <span className="flex items-center gap-1">
              <Weight size={11} /> {vehicle.capacidade_toneladas}t
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={11} /> {vehicle.municipio}, {vehicle.provincia}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={handleToggle}
            disabled={toggling}
            title={vehicle.disponivel ? "Marcar como indisponível" : "Marcar como disponível"}
            className={`flex items-center gap-1 font-mono text-xs rounded-sm px-2 py-1 border transition-colors ${
              vehicle.disponivel
                ? "border-green-500/30 text-green-600 bg-green-50"
                : "border-field/20 text-ink/40 bg-field/5"
            }`}
          >
            {vehicle.disponivel
              ? <><ToggleRight size={14} /> Disponível</>
              : <><ToggleLeft size={14} /> Indisponível</>
            }
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-earth/60 hover:text-earth transition-colors disabled:opacity-40"
            title="Remover veículo"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Route Form ----
function RouteForm({
  token, vehicles, onSuccess,
}: {
  token: string;
  vehicles: Vehicle[];
  onSuccess: () => void;
}) {
  const [veiculoId, setVeiculoId] = useState(vehicles[0]?.id ?? "");
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [data, setData] = useState("");
  const [capacidade, setCapacidade] = useState("");
  const [preco, setPreco] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createRoute(token, {
        veiculo_id: veiculoId,
        origem,
        destino,
        data,
        capacidade_total_toneladas: parseFloat(capacidade),
        preco_por_tonelada: parseFloat(preco),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Erro ao publicar rota.");
    } finally {
      setLoading(false);
    }
  }

  const selectedVehicle = vehicles.find(v => v.id === veiculoId);

  return (
    <form onSubmit={handleSubmit} className="field-card rounded-sm mb-4">
      <p className="label-eyebrow mb-4">Publicar nova rota</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Veículo</span>
          <select value={veiculoId} onChange={e => setVeiculoId(e.target.value)} className="field-input rounded-sm">
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {tipoVeiculoLabels[v.tipo] ?? v.tipo} · {v.matricula} · {v.capacidade_toneladas}t
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Origem</span>
          <input required value={origem} onChange={e => setOrigem(e.target.value)}
            placeholder="Ex: Huambo" className="field-input rounded-sm" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Destino</span>
          <input required value={destino} onChange={e => setDestino(e.target.value)}
            placeholder="Ex: Luanda" className="field-input rounded-sm" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Data da viagem</span>
          <input required type="date" value={data} onChange={e => setData(e.target.value)}
            className="field-input rounded-sm" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">
            Capacidade disponível (t)
            {selectedVehicle && (
              <span className="ml-1 text-ink/35">máx. {selectedVehicle.capacidade_toneladas}t</span>
            )}
          </span>
          <input
            required type="number" min="0.1" step="0.1"
            max={selectedVehicle?.capacidade_toneladas}
            value={capacidade} onChange={e => setCapacidade(e.target.value)}
            placeholder="Ex: 3.5"
            className="field-input rounded-sm"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Preço por tonelada (Kz)</span>
          <input required type="number" min="1" step="100"
            value={preco} onChange={e => setPreco(e.target.value)}
            placeholder="Ex: 15000"
            className="field-input rounded-sm" />
        </label>
      </div>
      {error && <p className="text-earth font-body text-sm mt-3">{error}</p>}
      <div className="mt-4">
        <button type="submit" disabled={loading} className="btn-harvest rounded-sm disabled:opacity-50">
          <MapPin size={14} />
          {loading ? "A publicar..." : "Publicar rota"}
        </button>
      </div>
    </form>
  );
}

// ---- Request Card ----
function RequestCard({
  request, token, onUpdated,
}: {
  request: TransportRequestItem;
  token: string;
  onUpdated: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sc = statusConfig[request.status] ?? statusConfig.pendente;

  async function handleAccept() {
    setLoading(true);
    setError(null);
    try {
      await acceptTransportRequest(token, request.id);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Erro ao aceitar solicitação.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatus(newStatus: string) {
    setLoading(true);
    setError(null);
    try {
      await updateRequestStatus(token, request.id, newStatus);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Erro ao atualizar estado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="field-card rounded-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={14} className="text-harvest flex-shrink-0" />
            <p className="font-display text-base text-field truncate">
              {request.origem} → {request.destino}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 font-mono text-xs text-ink/50">
            <span className="flex items-center gap-1">
              <Package size={11} /> {request.produto}
            </span>
            <span className="flex items-center gap-1">
              <Weight size={11} /> {request.peso_toneladas}t
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} /> {new Date(request.data).toLocaleDateString("pt-AO")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`status-badge ${sc.cls}`}>
            <sc.icon size={11} /> {sc.label}
          </span>
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-ink/40 hover:text-field transition-colors"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-field/15 space-y-4">
          {request.valor_total && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-field/5 border border-field/15 p-4 rounded-sm font-mono text-sm">
              <div>
                <p className="text-xs text-ink/40 uppercase tracking-wider mb-0.5">Total</p>
                <p className="text-field font-bold">{formatKz(request.valor_total)}</p>
              </div>
              <div>
                <p className="text-xs text-ink/40 uppercase tracking-wider mb-0.5">Comissão (5%)</p>
                <p className="text-harvest">{formatKz(request.valor_comissao)}</p>
              </div>
              <div>
                <p className="text-xs text-ink/40 uppercase tracking-wider mb-0.5">Recebe</p>
                <p className="text-earth font-bold">{formatKz(request.valor_liquido_transportador)}</p>
              </div>
            </div>
          )}

          {error && <p className="text-earth font-body text-sm">{error}</p>}

          <div className="flex flex-wrap gap-2">
            {request.status === "pendente" && (
              <button
                onClick={handleAccept}
                disabled={loading}
                className="btn-harvest rounded-sm text-xs disabled:opacity-50"
              >
                <CheckCircle size={13} />
                {loading ? "A aceitar..." : "Aceitar pedido"}
              </button>
            )}
            {request.status === "aceite" && (
              <button
                onClick={() => handleStatus("em_andamento")}
                disabled={loading}
                className="btn-primary rounded-sm text-xs disabled:opacity-50"
              >
                <Truck size={13} />
                {loading ? "..." : "Iniciar transporte"}
              </button>
            )}
            {request.status === "em_andamento" && (
              <button
                onClick={() => handleStatus("concluido")}
                disabled={loading}
                className="btn-primary rounded-sm text-xs disabled:opacity-50"
              >
                <CheckCircle size={13} />
                {loading ? "..." : "Marcar como concluído"}
              </button>
            )}
            {["pendente", "aceite"].includes(request.status) && (
              <button
                onClick={() => handleStatus("cancelado")}
                disabled={loading}
                className="text-xs rounded-sm px-3 py-1.5 border border-earth/30 text-earth hover:bg-earth/5 transition-colors disabled:opacity-50"
              >
                <XCircle size={13} />
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
