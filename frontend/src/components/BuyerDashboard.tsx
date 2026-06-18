"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  ShoppingCart, Package, Truck, Clock, CheckCircle, XCircle,
  Loader, MapPin, Weight, ChevronDown, ChevronUp, Send, Search,
} from "lucide-react";
import {
  TransportRequestItem, TransportRoute,
  myBuyerTransportRequests, cancelTransportRequest,
  listProducts, Product, searchRoutes, createTransportRequest,
  ApiError,
} from "@/lib/api";
import { TransportTrackingMap } from "@/components/Transport/TransportTrackingMap";

const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pendente:     { label: "Pendente",     icon: Clock,        color: "text-amber-600 bg-amber-50 border-amber-200" },
  aceite:       { label: "Aceite",       icon: CheckCircle,  color: "text-green-700 bg-green-50 border-green-200" },
  em_andamento: { label: "Em andamento", icon: Loader,       color: "text-blue-700 bg-blue-50 border-blue-200" },
  concluido:    { label: "Concluído",    icon: CheckCircle,  color: "text-field bg-field/10 border-field/20" },
  cancelado:    { label: "Cancelado",    icon: XCircle,      color: "text-red-700 bg-red-50 border-red-200" },
};

function formatKz(v?: string | number | null) {
  if (!v) return "—";
  return new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(Number(v)) + " Kz";
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-AO", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Solicitar transporte inline ──────────────────────────────────────────────
function NovoTransporteForm({ token, onDone }: { token: string; onDone: () => void }) {
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<TransportRoute | null>(null);
  const [produto, setProduto] = useState("");
  const [peso, setPeso] = useState("");
  const [data, setData] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    searchRoutes({}).then(setRoutes).catch(() => setRoutes([])).finally(() => setLoadingRoutes(false));
  }, []);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    setLoadingRoutes(true);
    searchRoutes({ origem: origem || undefined, destino: destino || undefined })
      .then(setRoutes).catch(() => setRoutes([])).finally(() => setLoadingRoutes(false));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedRoute) return;
    setError(null); setLoading(true);
    const capacidade = parseFloat(selectedRoute.capacidade_disponivel_toneladas || selectedRoute.capacidade_total_toneladas);
    if (capacidade > 0 && parseFloat(peso) > capacidade) {
      setError(`Peso máximo disponível nesta rota: ${capacidade} toneladas.`);
      setLoading(false);
      return;
    }
    try {
      await createTransportRequest(token, {
        produto, peso_toneladas: parseFloat(peso),
        origem: selectedRoute.origem, destino: selectedRoute.destino,
        data, rota_id: selectedRoute.id,
        observacoes: observacoes || undefined,
      });
      setDone(true);
      setTimeout(onDone, 1500);
    } catch (e) {
      setError(e instanceof ApiError ? String(e.detail) : "Erro ao criar pedido.");
    } finally { setLoading(false); }
  }

  if (done) return (
    <div className="text-center py-8">
      <CheckCircle size={32} className="text-green-600 mx-auto mb-2" />
      <p className="font-display text-xl text-field">Pedido enviado!</p>
      <p className="font-body text-sm text-ink/50 mt-1">O transportador será notificado.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Pesquisa de rotas */}
      <div>
        <p className="label-eyebrow mb-3">1. Pesquisar rotas disponíveis</p>
        <form onSubmit={handleSearch} className="flex gap-2 flex-wrap">
          <input value={origem} onChange={e => setOrigem(e.target.value)}
            placeholder="Origem (ex: Malanje)" className="field-input rounded-sm flex-1 min-w-[140px] text-sm" />
          <input value={destino} onChange={e => setDestino(e.target.value)}
            placeholder="Destino (ex: Luanda)" className="field-input rounded-sm flex-1 min-w-[140px] text-sm" />
          <button type="submit" className="btn-secondary rounded-sm text-xs px-4">
            <Search size={13} /> Pesquisar
          </button>
        </form>
      </div>

      {/* Lista de rotas */}
      <div>
        <p className="label-eyebrow mb-3">2. Escolher uma rota</p>
        {loadingRoutes ? (
          <p className="font-body text-sm text-ink/40 py-4 text-center">A carregar rotas...</p>
        ) : routes.length === 0 ? (
          <div className="field-card rounded-sm text-center py-6">
            <p className="font-body text-sm text-ink/50">Sem rotas disponíveis. Tenta outra pesquisa.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {routes.map(r => (
              <button key={r.id} type="button"
                onClick={() => setSelectedRoute(r)}
                className={`w-full text-left p-3 rounded-sm border-2 transition-all ${
                  selectedRoute?.id === r.id
                    ? "border-harvest bg-harvest/5"
                    : "border-field/15 hover:border-field/30 bg-white"
                }`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin size={12} className="text-harvest flex-shrink-0" />
                    <span className="font-body text-sm text-field truncate">
                      {r.origem} → {r.destino}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-mono text-xs text-harvest font-bold">{formatKz(r.preco_por_tonelada)}/t</span>
                    <p className="font-mono text-xs text-ink/40">{r.capacidade_disponivel_toneladas}t disp.</p>
                  </div>
                </div>
                {selectedRoute?.id === r.id && (
                  <p className="font-mono text-xs text-green-700 mt-1 flex items-center gap-1">
                    <CheckCircle size={10} /> Rota seleccionada
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Formulário do pedido */}
      {selectedRoute && (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-field/10">
          <p className="label-eyebrow mb-3">3. Detalhes do pedido</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 flex flex-col gap-1.5">
              <span className="font-mono text-xs uppercase text-ink/50">Produto / Carga *</span>
              <input required value={produto} onChange={e => setProduto(e.target.value)}
                placeholder="Ex: Milho branco, Mandioca..." className="field-input rounded-sm text-sm" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-xs uppercase text-ink/50">Peso (ton) *</span>
              <input required type="number" min="0.1" step="0.1"
                /* max validado no submit */
                value={peso} onChange={e => setPeso(e.target.value)}
                placeholder="0.0" className="field-input rounded-sm text-sm" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-xs uppercase text-ink/50">Data *</span>
              <input required type="date" value={data} onChange={e => setData(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="field-input rounded-sm text-sm" />
            </label>
            <label className="col-span-2 flex flex-col gap-1.5">
              <span className="font-mono text-xs uppercase text-ink/50">Observações</span>
              <textarea rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)}
                placeholder="Instruções especiais para o transportador..."
                className="field-input rounded-sm text-sm resize-none" />
            </label>
          </div>

          {/* Estimativa de preço */}
          {peso && selectedRoute.preco_por_tonelada && (
            <div className="bg-harvest/5 border border-harvest/20 rounded-sm p-3">
              <div className="flex justify-between text-sm font-body">
                <span className="text-ink/60">Estimativa ({peso}t × {formatKz(selectedRoute.preco_por_tonelada)})</span>
                <span className="text-field font-medium">
                  {formatKz(parseFloat(peso) * parseFloat(selectedRoute.preco_por_tonelada))}
                </span>
              </div>
              <div className="flex justify-between text-xs font-body text-ink/40 mt-1">
                <span>Comissão plataforma (5%)</span>
                <span>{formatKz(parseFloat(peso) * parseFloat(selectedRoute.preco_por_tonelada) * 0.05)}</span>
              </div>
            </div>
          )}

          {error && <p className="text-red-600 font-body text-sm">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full btn-primary rounded-sm py-3 disabled:opacity-50">
            <Send size={14} />
            {loading ? "A enviar pedido..." : "Confirmar pedido de transporte"}
          </button>
        </form>
      )}
    </div>
  );
}

// ── Request Card ──────────────────────────────────────────────────────────────
function RequestCard({ req, token, onCancelled }: { req: TransportRequestItem; token: string; onCancelled: () => void }) {
  const [open, setOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const cfg = statusConfig[req.status] ?? statusConfig.pendente;
  const Icon = cfg.icon;

  async function handleCancel() {
    if (!confirm("Cancelar este pedido?")) return;
    setCancelling(true);
    try { await cancelTransportRequest(token, req.id); onCancelled(); }
    catch { /* silent */ } finally { setCancelling(false); }
  }

  return (
    <div className="field-card rounded-sm">
      <div className="flex items-center justify-between gap-3 cursor-pointer" onClick={() => setOpen(v => !v)}>
        <div className="flex items-center gap-3 min-w-0">
          <Truck size={15} className="text-field/40 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-body text-sm text-field font-medium truncate">{req.origem} → {req.destino}</p>
            <p className="font-mono text-xs text-ink/40">{req.produto} · {req.peso_toneladas}t</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full border ${cfg.color}`}>
            <Icon size={10} />{cfg.label}
          </span>
          {open ? <ChevronUp size={14} className="text-ink/40" /> : <ChevronDown size={14} className="text-ink/40" />}
        </div>
      </div>

      {open && (
        <div className="mt-4 pt-4 border-t border-field/10 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Data pedido", fmtDate(req.criado_em)],
              ["Data transporte", fmtDate(req.data)],
              ["Peso", `${req.peso_toneladas} toneladas`],
              ["Valor total", formatKz(req.valor_total)],
            ].map(([l, v]) => (
              <div key={l}>
                <p className="font-mono text-xs text-ink/40 uppercase mb-0.5">{l}</p>
                <p className="font-body text-field">{v}</p>
              </div>
            ))}
          </div>
          {req.observacoes && (
            <p className="font-body text-xs text-ink/50 italic">{req.observacoes}</p>
          )}
          {req.status === "pendente" && (
            <button onClick={handleCancel} disabled={cancelling}
              className="text-xs font-mono text-red-600 hover:underline disabled:opacity-50">
              {cancelling ? "A cancelar..." : "✕ Cancelar pedido"}
            </button>
          )}
          {["aceite", "em_andamento", "concluido"].includes(req.status) && (
            <TransportTrackingMap
              requestId={req.id}
              token={token}
              origem={req.origem}
              destino={req.destino}
              produto={req.produto}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductMiniCard({ p }: { p: Product }) {
  return (
    <a href={`/marketplace`}
      className="field-card rounded-sm flex items-center gap-3 hover:border-harvest/40 transition-colors">
      {p.imagens?.[0]
        ? <img src={p.imagens[0]} alt={p.nome} className="w-11 h-11 object-cover rounded-sm flex-shrink-0" />
        : <div className="w-11 h-11 bg-field/10 rounded-sm flex items-center justify-center flex-shrink-0">
            <Package size={16} className="text-field/30" />
          </div>
      }
      <div className="min-w-0 flex-1">
        <p className="font-body text-sm text-field font-medium truncate">{p.nome}</p>
        <p className="font-mono text-xs text-ink/40">{p.categoria}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-body text-sm text-harvest font-medium">{formatKz(p.preco)}<span className="text-ink/40 text-xs">/{p.unidade}</span></p>
        <p className="font-mono text-xs text-ink/40">{p.quantidade} disp.</p>
      </div>
    </a>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export function BuyerDashboard({ token }: { token: string }) {
  const [requests, setRequests] = useState<TransportRequestItem[]>([]);
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [reqs, prods] = await Promise.all([
        myBuyerTransportRequests(token),
        listProducts({ limit: "6" }),
      ]);
      setRequests(reqs);
      setProducts(prods);
    } catch { /* silent */ } finally { setLoading(false); }
  }

  useEffect(() => { loadAll(); }, [token]);

  if (loading) return (
    <div className="text-center py-12">
      <ShoppingCart size={24} className="text-field/30 mx-auto mb-2 animate-pulse" />
      <p className="font-mono text-sm text-ink/40">A carregar o seu painel...</p>
    </div>
  );

  const active  = requests.filter(r => ["pendente","aceite","em_andamento"].includes(r.status));
  const history = requests.filter(r => ["concluido","cancelado"].includes(r.status));

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="border-b border-field/15 pb-5">
        <p className="label-eyebrow mb-1">Painel do Comprador</p>
        <h2 className="text-2xl text-field">A sua actividade</h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Activos", value: active.length, icon: Truck, color: "text-blue-600" },
          { label: "Concluídos", value: requests.filter(r => r.status === "concluido").length, icon: CheckCircle, color: "text-green-700" },
          { label: "Total", value: requests.length, icon: ShoppingCart, color: "text-field" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="field-card rounded-sm text-center py-3">
            <Icon size={18} className={`${color} mx-auto mb-1`} />
            <p className="font-display text-2xl text-field">{value}</p>
            <p className="font-mono text-xs text-ink/40">{label}</p>
          </div>
        ))}
      </div>

      {/* Pedidos activos + formulário novo */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg text-field flex items-center gap-2">
            <Truck size={16} className="text-harvest" /> Pedidos activos ({active.length})
          </h3>
          <button
            onClick={() => setShowForm(v => !v)}
            className="btn-primary rounded-sm text-xs">
            {showForm ? "✕ Fechar" : "+ Novo pedido"}
          </button>
        </div>

        {/* Formulário inline */}
        {showForm && (
          <div className="field-card rounded-sm mb-4 border-harvest/30">
            <p className="font-display text-lg text-field mb-4">Solicitar transporte</p>
            <NovoTransporteForm token={token} onDone={() => { setShowForm(false); loadAll(); }} />
          </div>
        )}

        {active.length === 0 && !showForm ? (
          <div className="field-card rounded-sm text-center py-8">
            <Truck size={24} className="text-field/20 mx-auto mb-2" />
            <p className="font-body text-sm text-ink/50 mb-3">Sem pedidos activos de momento.</p>
            <button onClick={() => setShowForm(true)} className="btn-primary rounded-sm text-sm">
              + Solicitar transporte
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map(r => <RequestCard key={r.id} req={r} token={token} onCancelled={loadAll} />)}
          </div>
        )}
      </section>

      {/* Produtos no mercado */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg text-field flex items-center gap-2">
            <Package size={16} className="text-harvest" /> Produtos no mercado
          </h3>
          <a href="/marketplace" className="font-mono text-xs text-harvest hover:underline">Ver todos →</a>
        </div>
        {products.length === 0 ? (
          <p className="font-body text-sm text-ink/40 text-center py-4">Sem produtos disponíveis.</p>
        ) : (
          <div className="space-y-2">{products.map(p => <ProductMiniCard key={p.id} p={p} />)}</div>
        )}
      </section>

      {/* Histórico */}
      {history.length > 0 && (
        <section>
          <h3 className="text-lg text-field flex items-center gap-2 mb-4">
            <Clock size={16} className="text-harvest" /> Histórico ({history.length})
          </h3>
          <div className="space-y-2">
            {history.map(r => <RequestCard key={r.id} req={r} token={token} onCancelled={loadAll} />)}
          </div>
        </section>
      )}
    </div>
  );
}
