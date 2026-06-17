"use client";

import { useEffect, useState, FormEvent } from "react";
import { Search, Send, Truck, Leaf, MapPin, Weight, Clock, CheckCircle, XCircle, Loader, ShoppingCart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  ApiError, TransportRequestItem, TransportRoute, PaymentReference,
  createTransportRequest, myTransportRequests, searchRoutes,
  getTransportPaymentReference, simulateConfirmPayment,
} from "@/lib/api";
import { RouteDiagram } from "@/components/RouteDiagram";
import { TransporterDashboard } from "@/components/TransporterDashboard";

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

function formatReferencia(value?: string | null) {
  if (!value) return "—";
  return value.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

export default function TransportePage() {
  const { user, token } = useAuth();
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [origemFilter, setOrigemFilter] = useState("");
  const [destinoFilter, setDestinoFilter] = useState("");
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [myRequests, setMyRequests] = useState<TransportRequestItem[]>([]);

  async function loadRoutes() {
    setLoadingRoutes(true);
    try {
      const data = await searchRoutes({
        origem: origemFilter || undefined,
        destino: destinoFilter || undefined,
      });
      setRoutes(data);
    } catch { setRoutes([]); }
    finally { setLoadingRoutes(false); }
  }

  async function loadMyRequests() {
    if (!token) return;
    try { setMyRequests(await myTransportRequests(token)); }
    catch { setMyRequests([]); }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadRoutes(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (user?.role === "agricultor" || user?.role === "comprador") loadMyRequests(); }, [user]);

  function handleSearch(e: FormEvent) { e.preventDefault(); loadRoutes(); }

  return (
    <div>
      <div className="border-b border-field/15 bg-sky-light">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
          <h1 className="text-4xl text-field">Transporte Rural</h1>
          <p className="font-body text-ink/55 mt-1">
            Partilhe carga e reduza os custos de transporte agrícola
          </p>
          {user?.role === "comprador" && (
            <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-sm px-4 py-2 text-sm font-body">
              <ShoppingCart size={14} />
              Como comprador, podes solicitar transporte para os produtos que adquiriste.
            </div>
          )}
        </div>
      </div>


      {/* GPS + Diferencial vs Uber */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-6">
        <div className="grid sm:grid-cols-3 gap-4 mb-2">
          <div className="field-card rounded-sm bg-gradient-to-br from-sky-50 to-blue-50 border-sky-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-sky-100 p-2 rounded-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-600"><path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
              </div>
              <p className="font-mono text-xs uppercase tracking-wider text-sky-700">GPS em Tempo Real</p>
            </div>
            <p className="font-body text-sm text-ink/65">Rastreie a sua carga no mapa em tempo real durante todo o percurso.</p>
          </div>
          <div className="field-card rounded-sm bg-gradient-to-br from-field/5 to-green-50 border-field/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-field/10 p-2 rounded-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-field"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <p className="font-mono text-xs uppercase tracking-wider text-field">Diferencial vs Uber Freight</p>
            </div>
            <p className="font-body text-sm text-ink/65">Partilha de carga, rotas rurais angolanas e preços em Kwanzas. Feito para Angola.</p>
          </div>
          <div className="field-card rounded-sm bg-gradient-to-br from-harvest/5 to-yellow-50 border-harvest/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-harvest/10 p-2 rounded-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-harvest"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              </div>
              <p className="font-mono text-xs uppercase tracking-wider text-harvest-dark">Pagamento Seguro</p>
            </div>
            <p className="font-body text-sm text-ink/65">Pague directamente na plataforma. Comissão de apenas 5% sobre o valor total.</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10 space-y-10">

        {/* Painel exclusivo para transportadores */}
        {user?.role === "transportador" && token && (
          <TransporterDashboard token={token} />
        )}

        <form onSubmit={handleSearch} className="field-card rounded-sm">
          <p className="label-eyebrow mb-4">Pesquisar rotas</p>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            <label className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Origem</span>
              <input value={origemFilter} onChange={e => setOrigemFilter(e.target.value)}
                placeholder="Ex: Caála" className="field-input rounded-sm" />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Destino</span>
              <input value={destinoFilter} onChange={e => setDestinoFilter(e.target.value)}
                placeholder="Ex: Huambo" className="field-input rounded-sm" />
            </label>
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full justify-center rounded-sm">
                <Search size={16} /> Pesquisar
              </button>
            </div>
          </div>
        </form>

        <div>
          <h2 className="text-xl text-field mb-5 font-display uppercase tracking-wide">
            {loadingRoutes
              ? <span className="skeleton inline-block h-7 w-48" />
              : routes.length > 0
                ? `${routes.length} rota${routes.length !== 1 ? "s" : ""} disponíve${routes.length !== 1 ? "is" : "l"}`
                : "Rotas disponíveis"
            }
          </h2>

          {loadingRoutes ? (
            <div className="space-y-5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="field-card rounded-sm animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="flex flex-col gap-3">
                    <div className="skeleton-text w-2/3" />
                    <div className="skeleton-text-sm w-full" />
                    <div className="skeleton-text-sm w-1/3" />
                    <div className="flex gap-3 mt-2">
                      <div className="skeleton h-9 w-32 rounded-sm" />
                      <div className="skeleton h-9 w-24 rounded-sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : routes.length === 0 ? (
            <div className="empty-state field-card rounded-sm">
              <div className="empty-state-icon">
                <Truck size={28} className="text-field/50" />
              </div>
              <p className="empty-state-title">Nenhuma rota encontrada</p>
              <p className="empty-state-desc">
                Não há rotas disponíveis para estes filtros. Tente pesquisar sem filtros ou volte mais tarde.
              </p>
              {(origemFilter || destinoFilter) && (
                <button
                  onClick={() => { setOrigemFilter(""); setDestinoFilter(""); setTimeout(loadRoutes, 0); }}
                  className="btn-secondary rounded-sm mt-5 text-xs"
                >
                  <Search size={13} /> Ver todas as rotas
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-5 animate-fade-in">
              {routes.map((route, i) => (
                <div key={route.id} style={{ animationDelay: `${i * 50}ms` }} className="animate-fade-in">
                  <RouteCard
                    route={route}
                    token={token}
                    isAgricultor={user?.role === "agricultor" || user?.role === "comprador"}
                    onRequested={loadMyRequests}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {(user?.role === "agricultor" || user?.role === "comprador") && myRequests.length > 0 && (
          <div>
            <h2 className="text-2xl text-field mb-5">As minhas solicitações</h2>
            <div className="space-y-4">
              {myRequests.map(req => {
                const sc = statusConfig[req.status] ?? statusConfig.pendente;
                return (
                  <div key={req.id} className="field-card rounded-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin size={14} className="text-harvest" />
                          <p className="font-display text-base text-field">
                            {req.origem} → {req.destino}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Weight size={12} className="text-field-muted" />
                          <span className="font-mono text-xs text-ink/50">{req.peso_toneladas}t</span>
                        </div>
                      </div>
                      <span className={`status-badge ${sc.cls}`}>
                        <sc.icon size={11} /> {sc.label}
                      </span>
                    </div>

                    {req.valor_total && (
                      <div className="mt-4 pt-4 border-t border-field/10 grid grid-cols-3 gap-1 sm:gap-3 font-mono text-xs sm:text-sm">
                        <div>
                          <p className="text-xs text-ink/40 uppercase tracking-wider mb-0.5">Total</p>
                          <p className="text-field font-bold">{formatKz(req.valor_total)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-ink/40 uppercase tracking-wider mb-0.5">Comissão (5%)</p>
                          <p className="text-harvest">{formatKz(req.valor_comissao)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-ink/40 uppercase tracking-wider mb-0.5">Transportador</p>
                          <p className="text-earth">{formatKz(req.valor_liquido_transportador)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RouteCard({
  route, token, isAgricultor, onRequested,
}: {
  route: TransportRoute;
  token: string | null;
  isAgricultor: boolean;
  onRequested: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [peso, setPeso] = useState("");
  const [produto, setProduto] = useState("");
  const [data, setData] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [payment, setPayment] = useState<PaymentReference | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [simulating, setSimulating] = useState(false);

  async function handleRequest(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      const created = await createTransportRequest(token, {
        produto,
        peso_toneladas: parseFloat(peso),
        origem: route.origem,
        destino: route.destino,
        data,
        rota_id: route.id,
      });
      setDone(true);
      setOpen(false);
      onRequested();

      // Busca a referência de pagamento (gerada no backend ao criar o pedido)
      setLoadingPayment(true);
      try {
        const ref = await getTransportPaymentReference(token, created.id);
        setPayment(ref);
      } catch {
        // Sem referência disponível (ex: valor ainda não definido) — sem problema,
        // o pagamento pode ser tratado mais tarde na lista "Minhas solicitações".
      } finally {
        setLoadingPayment(false);
      }
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Não foi possível solicitar o transporte.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSimulatePayment() {
    if (!token || !payment) return;
    setSimulating(true);
    try {
      const updated = await simulateConfirmPayment(token, payment.id);
      setPayment(updated);
    } catch {
      // Falha ao simular — o agricultor pode tentar novamente.
    } finally {
      setSimulating(false);
    }
  }

  const precoEstimado = peso && route.preco_por_tonelada
    ? parseFloat(peso) * parseFloat(route.preco_por_tonelada)
    : null;
  const comissao = precoEstimado ? precoEstimado * 0.05 : null;

  return (
    <div className="field-card rounded-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="mb-4">
            <RouteDiagram
              origem={route.origem}
              destino={route.destino}
              capacidadeTotal={parseFloat(route.capacidade_total_toneladas)}
              capacidadeDisponivel={parseFloat(route.capacidade_disponivel_toneladas)}
            />
          </div>

          <div className="flex flex-wrap gap-4 font-mono text-xs text-ink/50">
            {route.preco_por_tonelada && (
              <span className="flex items-center gap-1">
                <span className="text-harvest font-bold text-sm">
                  {formatKz(route.preco_por_tonelada)}
                </span>
                /tonelada
              </span>
            )}
            {route.data && (
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {new Date(route.data).toLocaleDateString("pt-AO")}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          {done ? (
            <div className="status-badge active">
              <CheckCircle size={12} /> Solicitado
            </div>
          ) : isAgricultor && token ? (
            <button onClick={() => setOpen(v => !v)} className="btn-primary rounded-sm text-xs">
              <Send size={14} />
              {open ? "Cancelar" : "Solicitar"}
            </button>
          ) : !token ? (
            <a href="/login" className="btn-secondary rounded-sm text-xs">
              Entrar para solicitar
            </a>
          ) : null}
        </div>
      </div>

      {open && (
        <form onSubmit={handleRequest} className="mt-5 pt-5 border-t border-field/15 space-y-4">
          <p className="label-eyebrow">Solicitar transporte nesta rota</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Produto / Carga</span>
              <input required value={produto} onChange={e => setProduto(e.target.value)}
                placeholder="Ex: Milho branco, Feijão..."
                className="field-input rounded-sm" />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Peso (toneladas)</span>
              <input required type="number" min="0.1" step="0.1"
                /* max removido - validação feita no submit */
                value={peso} onChange={e => setPeso(e.target.value)}
                placeholder={`Máx. ${route.capacidade_disponivel_toneladas}t`}
                className="field-input rounded-sm" />
            </label>
            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Data pretendida</span>
              <input required type="date" value={data} onChange={e => setData(e.target.value)}
                className="field-input rounded-sm" />
            </label>
          </div>

          {precoEstimado !== null && comissao !== null && (
            <div className="grid grid-cols-3 gap-3 bg-field/5 border border-field/15 p-4 rounded-sm font-mono text-sm">
              <div>
                <p className="text-xs text-ink/40 uppercase tracking-wider mb-1">Estimativa total</p>
                <p className="text-field font-bold">{formatKz(String(precoEstimado))}</p>
              </div>
              <div>
                <p className="text-xs text-ink/40 uppercase tracking-wider mb-1">Comissão (5%)</p>
                <p className="text-harvest">{formatKz(String(comissao))}</p>
              </div>
              <div>
                <p className="text-xs text-ink/40 uppercase tracking-wider mb-1">Para transportador</p>
                <p className="text-earth">{formatKz(String((precoEstimado - comissao)))}</p>
              </div>
            </div>
          )}

          {error && <p className="text-earth font-body text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="btn-harvest rounded-sm disabled:opacity-50">
            <Send size={14} />
            {loading ? "A enviar..." : "Confirmar solicitação"}
          </button>
        </form>
      )}

      {done && (loadingPayment || payment) && (
        <div className="mt-5 pt-5 border-t border-field/15 space-y-3">
          <p className="label-eyebrow">Pagamento do transporte</p>

          {loadingPayment && !payment && (
            <p className="font-body text-sm text-ink/55">A gerar referência de pagamento...</p>
          )}

          {payment && payment.status === "pago" && (
            <div className="flex items-center gap-2 bg-field/5 border border-field/20 text-field rounded-sm px-4 py-3 font-body text-sm">
              <CheckCircle size={16} />
              Pagamento confirmado — o transportador já pode aceitar este pedido.
            </div>
          )}

          {payment && payment.status !== "pago" && (
            <div className="bg-harvest/5 border border-harvest/25 rounded-sm p-4 space-y-3">
              <p className="font-body text-xs text-ink/55">
                Ambiente de testes (sandbox) — pague esta referência num ATM/app Multicaixa quando a
                integração real estiver disponível. Por agora, usa o botão abaixo para simular o pagamento.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-sm">
                <div>
                  <p className="text-xs text-ink/40 uppercase tracking-wider mb-1">Entidade</p>
                  <p className="text-field font-bold">{payment.entidade ?? "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-ink/40 uppercase tracking-wider mb-1">Referência</p>
                  <p className="text-field font-bold">{formatReferencia(payment.referencia)}</p>
                </div>
                <div>
                  <p className="text-xs text-ink/40 uppercase tracking-wider mb-1">Valor</p>
                  <p className="text-harvest font-bold">{formatKz(payment.valor)}</p>
                </div>
              </div>
              {payment.validade && (
                <p className="font-mono text-xs text-ink/45">
                  Válida até {new Date(payment.validade).toLocaleDateString("pt-AO")}
                </p>
              )}
              <button
                type="button"
                onClick={handleSimulatePayment}
                disabled={simulating}
                className="btn-primary rounded-sm text-xs disabled:opacity-50"
              >
                <CheckCircle size={14} />
                {simulating ? "A confirmar..." : "Simular pagamento (sandbox)"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
