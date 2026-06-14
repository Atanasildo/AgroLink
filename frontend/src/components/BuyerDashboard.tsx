"use client";

import { useEffect, useState } from "react";
import {
  ShoppingCart, Package, Truck, Clock, CheckCircle, XCircle,
  Loader, MapPin, Weight, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  TransportRequestItem,
  myBuyerTransportRequests,
  cancelTransportRequest,
  listProducts,
  Product,
  ApiError,
} from "@/lib/api";

const statusConfig: Record<string, { label: string; icon: typeof Clock; cls: string; color: string }> = {
  pendente:     { label: "Pendente",     icon: Clock,        cls: "pending", color: "text-amber-600 bg-amber-50 border-amber-200" },
  aceite:       { label: "Aceite",       icon: CheckCircle,  cls: "active",  color: "text-green-700 bg-green-50 border-green-200" },
  em_andamento: { label: "Em andamento", icon: Loader,       cls: "active",  color: "text-blue-700 bg-blue-50 border-blue-200" },
  concluido:    { label: "Concluído",    icon: CheckCircle,  cls: "done",    color: "text-field bg-field/10 border-field/20" },
  cancelado:    { label: "Cancelado",    icon: XCircle,      cls: "done",    color: "text-earth bg-earth/10 border-earth/20" },
};

function formatKz(value?: string | number | null) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(Number(value)) + " Kz";
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-AO", { day: "2-digit", month: "short", year: "numeric" });
}

// ---- Transport Request Card ----
function RequestCard({ req, token, onCancelled }: {
  req: TransportRequestItem;
  token: string;
  onCancelled: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cfg = statusConfig[req.status] ?? statusConfig.pendente;
  const Icon = cfg.icon;

  async function handleCancel() {
    if (!confirm("Tens a certeza que queres cancelar este pedido?")) return;
    setCancelling(true);
    try {
      await cancelTransportRequest(token, req.id);
      onCancelled();
    } catch (e) {
      setError(e instanceof ApiError ? String(e.detail) : "Erro ao cancelar.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="field-card rounded-sm">
      <div
        className="flex items-center justify-between gap-3 cursor-pointer"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-field/10 flex items-center justify-center flex-shrink-0">
            <Truck size={16} className="text-field/60" />
          </div>
          <div className="min-w-0">
            <p className="font-body text-sm text-field font-medium truncate">
              {req.origem} → {req.destino}
            </p>
            <p className="font-mono text-xs text-ink/40">{formatDate(req.data_pedido)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full border ${cfg.color}`}>
            <Icon size={10} />
            {cfg.label}
          </span>
          {open ? <ChevronUp size={14} className="text-ink/40" /> : <ChevronDown size={14} className="text-ink/40" />}
        </div>
      </div>

      {open && (
        <div className="mt-4 pt-4 border-t border-field/10 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="font-mono text-xs text-ink/40 uppercase tracking-wider mb-1">Produto</p>
              <p className="font-body text-field flex items-center gap-1">
                <Package size={13} className="text-harvest" /> {req.produto_nome ?? "—"}
              </p>
            </div>
            <div>
              <p className="font-mono text-xs text-ink/40 uppercase tracking-wider mb-1">Peso</p>
              <p className="font-body text-field flex items-center gap-1">
                <Weight size={13} className="text-harvest" /> {req.peso_toneladas} ton
              </p>
            </div>
            <div>
              <p className="font-mono text-xs text-ink/40 uppercase tracking-wider mb-1">Origem</p>
              <p className="font-body text-field flex items-center gap-1">
                <MapPin size={13} className="text-harvest" /> {req.origem}
              </p>
            </div>
            <div>
              <p className="font-mono text-xs text-ink/40 uppercase tracking-wider mb-1">Destino</p>
              <p className="font-body text-field flex items-center gap-1">
                <MapPin size={13} className="text-harvest" /> {req.destino}
              </p>
            </div>
            {req.valor_total && (
              <div>
                <p className="font-mono text-xs text-ink/40 uppercase tracking-wider mb-1">Valor total</p>
                <p className="font-body text-field font-medium">{formatKz(req.valor_total)}</p>
              </div>
            )}
            {req.data_entrega_prevista && (
              <div>
                <p className="font-mono text-xs text-ink/40 uppercase tracking-wider mb-1">Entrega prevista</p>
                <p className="font-body text-field">{formatDate(req.data_entrega_prevista)}</p>
              </div>
            )}
          </div>
          {req.observacoes && (
            <div>
              <p className="font-mono text-xs text-ink/40 uppercase tracking-wider mb-1">Observações</p>
              <p className="font-body text-sm text-ink/60 italic">{req.observacoes}</p>
            </div>
          )}
          {error && <p className="text-earth font-body text-sm">{error}</p>}
          {req.status === "pendente" && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="btn-secondary rounded-sm text-xs text-earth border-earth/30 hover:bg-earth/5 disabled:opacity-50"
            >
              <XCircle size={13} />
              {cancelling ? "A cancelar..." : "Cancelar pedido"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Product Mini Card ----
function ProductMiniCard({ product }: { product: Product }) {
  return (
    <a
      href={`/marketplace?produto=${product.id}`}
      className="field-card rounded-sm flex items-center gap-3 hover:border-harvest/40 transition-colors"
    >
      {product.imagens?.[0] ? (
        <img
          src={product.imagens[0]}
          alt={product.nome}
          className="w-12 h-12 object-cover rounded-sm flex-shrink-0"
        />
      ) : (
        <div className="w-12 h-12 bg-field/10 rounded-sm flex items-center justify-center flex-shrink-0">
          <Package size={18} className="text-field/30" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-body text-sm text-field font-medium truncate">{product.nome}</p>
        <p className="font-mono text-xs text-ink/40 truncate">{product.categoria}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-body text-sm text-harvest font-medium">
          {formatKz(product.preco)}<span className="text-ink/40 font-normal">/{product.unidade}</span>
        </p>
        <p className="font-mono text-xs text-ink/40">{product.quantidade} disp.</p>
      </div>
    </a>
  );
}

// ---- Main Dashboard ----
export function BuyerDashboard({ token }: { token: string }) {
  const [requests, setRequests] = useState<TransportRequestItem[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [reqs, prods] = await Promise.all([
        myBuyerTransportRequests(token),
        listProducts({ limit: "6" }),
      ]);
      setRequests(reqs);
      setRecentProducts(prods);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [token]);

  if (loading) {
    return (
      <div className="text-center py-16">
        <ShoppingCart size={28} className="text-field/30 mx-auto mb-2 animate-pulse" />
        <p className="font-mono text-sm text-ink/40">A carregar o seu painel...</p>
      </div>
    );
  }

  const active = requests.filter(r => ["pendente", "aceite", "em_andamento"].includes(r.status));
  const history = requests.filter(r => ["concluido", "cancelado"].includes(r.status));

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="border-b border-field/15 pb-6">
        <p className="label-eyebrow mb-1">Painel do Comprador</p>
        <h2 className="text-3xl text-field">A sua actividade</h2>
        <p className="font-body text-ink/50 mt-1">
          Acompanhe os seus pedidos de transporte e explore o mercado agrícola.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pedidos activos", value: active.length, icon: Truck, color: "text-blue-600" },
          { label: "Concluídos", value: requests.filter(r => r.status === "concluido").length, icon: CheckCircle, color: "text-green-700" },
          { label: "Total de pedidos", value: requests.length, icon: ShoppingCart, color: "text-field" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="field-card rounded-sm text-center py-4">
            <Icon size={20} className={`${color} mx-auto mb-1`} />
            <p className="font-display text-2xl text-field">{value}</p>
            <p className="font-mono text-xs text-ink/40 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Pedidos activos */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl text-field flex items-center gap-2">
            <Truck size={18} className="text-harvest" />
            Pedidos activos ({active.length})
          </h3>
          <a href="/transporte" className="btn-primary rounded-sm text-xs">
            + Novo pedido
          </a>
        </div>
        {active.length === 0 ? (
          <div className="field-card rounded-sm text-center py-10">
            <Truck size={28} className="text-field/20 mx-auto mb-3" />
            <p className="font-display text-xl text-field mb-1">Sem pedidos activos</p>
            <p className="font-body text-ink/45 text-sm mb-4">
              Solicite transporte para os seus produtos agrícolas.
            </p>
            <a href="/transporte" className="btn-primary rounded-sm text-sm">
              Solicitar transporte
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map(r => (
              <RequestCard key={r.id} req={r} token={token} onCancelled={loadAll} />
            ))}
          </div>
        )}
      </section>

      {/* Produtos recentes no mercado */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl text-field flex items-center gap-2">
            <Package size={18} className="text-harvest" />
            Produtos no mercado
          </h3>
          <a href="/marketplace" className="font-mono text-xs text-harvest hover:underline">
            Ver todos →
          </a>
        </div>
        {recentProducts.length === 0 ? (
          <div className="field-card rounded-sm text-center py-8">
            <p className="font-body text-ink/45 text-sm">Sem produtos disponíveis de momento.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentProducts.map(p => <ProductMiniCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* Histórico */}
      {history.length > 0 && (
        <section>
          <h3 className="text-xl text-field flex items-center gap-2 mb-4">
            <Clock size={18} className="text-harvest" />
            Histórico ({history.length})
          </h3>
          <div className="space-y-3">
            {history.map(r => (
              <RequestCard key={r.id} req={r} token={token} onCancelled={loadAll} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
