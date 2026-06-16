"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Users, Truck, Wheat, TrendingUp,
  CreditCard, CheckCircle, XCircle, Clock, BarChart2,
  Leaf, Package, RefreshCw, Eye, Ban, PlusCircle, Database, Tractor, Flag,
} from "lucide-react";
import { apiRequest, createPrice, seedPrices, CommodityType, User as ApiUser, listReportsAdmin } from "@/lib/api";
import { PROVINCIAS as PROVINCIAS_AO } from "@/lib/angola";

function formatKz(val: number) {
  return new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(val) + " Kz";
}

// ─── Tipos das respostas do backend ───────────────────────────────────────────

interface AdminStats {
  utilizadores: {
    total: number;
    ativos: number;
    por_role: {
      agricultor: number;
      comprador: number;
      transportador: number;
      proprietario_maquinas: number;
      admin: number;
    };
  };
  transporte: {
    total_pedidos: number;
    rotas_ativas: number;
    por_status: {
      pendente: number;
      aceite: number;
      em_andamento: number;
      concluido: number;
      cancelado: number;
    };
  };
  marketplace: { produtos_ativos: number };
  maquinas: { disponiveis: number };
  pagamentos: { total_transacoes: number; receita_total: number };
}

interface TransportRoute {
  id: string;
  origem: string;
  destino: string;
  data: string;
  capacidade_total_toneladas: string;
  capacidade_disponivel_toneladas: string;
  criado_em: string;
}

interface TransportRequest {
  id: string;
  produto: string;
  origem: string;
  destino: string;
  data: string;
  status: string;
  peso_toneladas: string;
  criado_em: string;
}

export default function AdminPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"dashboard" | "users" | "routes" | "requests" | "precos" | "denuncias">("dashboard");

  // Stats reais
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Utilizadores reais
  const [realUsers, setRealUsers] = useState<ApiUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Rotas reais
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);

  // Pedidos reais
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Denúncias
  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "admin") {
      router.replace("/");
    }
  }, [user, loading, router]);

  const loadStats = useCallback(async () => {
    if (!token) return;
    setStatsLoading(true);
    setStatsError(null);
    try {
      const data = await apiRequest<AdminStats>("/admin/stats", { token });
      setStats(data);
    } catch {
      setStatsError("Não foi possível carregar as estatísticas.");
    } finally {
      setStatsLoading(false);
    }
  }, [token]);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setUsersLoading(true);
    setUsersError(null);
    try {
      const data = await apiRequest<ApiUser[]>("/admin/users?limit=100", { token });
      setRealUsers(data);
    } catch {
      setUsersError("Não foi possível carregar os utilizadores.");
    } finally {
      setUsersLoading(false);
    }
  }, [token]);

  const loadRoutes = useCallback(async () => {
    if (!token) return;
    setRoutesLoading(true);
    try {
      const data = await apiRequest<TransportRoute[]>("/admin/transport/routes?limit=50", { token });
      setRoutes(data);
    } catch {
      setRoutes([]);
    } finally {
      setRoutesLoading(false);
    }
  }, [token]);

  const loadRequests = useCallback(async () => {
    if (!token) return;
    setRequestsLoading(true);
    try {
      const data = await apiRequest<TransportRequest[]>("/admin/transport/requests?limit=50", { token });
      setRequests(data);
    } catch {
      setRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  }, [token]);

  const loadReports = useCallback(async () => {
    if (!token) return;
    setReportsLoading(true);
    try {
      const data = await listReportsAdmin(token);
      setReports(data);
    } catch {
      setReports([]);
    } finally {
      setReportsLoading(false);
    }
  }, [token]);

  // Carrega stats ao entrar
  useEffect(() => {
    if (user?.role === "admin" && token) {
      loadStats();
    }
  }, [user, token, loadStats]);

  // Carrega dados conforme o tab activo
  useEffect(() => {
    if (!token || user?.role !== "admin") return;
    if (tab === "users" && realUsers.length === 0) loadUsers();
    if (tab === "routes" && routes.length === 0) loadRoutes();
    if (tab === "requests" && requests.length === 0) loadRequests();
    if (tab === "denuncias" && reports.length === 0) loadReports();
  }, [tab, token, user]);

  async function toggleUserActive(userId: string) {
    if (!token) return;
    setTogglingId(userId);
    try {
      const updated = await apiRequest<ApiUser>(`/admin/users/${userId}/toggle-active`, { method: "PATCH", token });
      setRealUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    } catch {
      // silencioso
    } finally {
      setTogglingId(null);
    }
  }

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ShieldCheck size={40} className="text-field/20 mx-auto mb-3 animate-pulse" />
          <p className="font-mono text-sm text-ink/40 uppercase tracking-widest">A verificar acesso…</p>
        </div>
      </div>
    );
  }

  const roleColor: Record<string, string> = {
    agricultor:           "bg-field/10 text-field border-field/30",
    transportador:        "bg-sky-100 text-sky-700 border-sky-200",
    comprador:            "bg-harvest/10 text-harvest-dark border-harvest/30",
    proprietario_maquinas:"bg-purple-100 text-purple-700 border-purple-200",
    admin:                "bg-red-100 text-red-700 border-red-200",
  };

  const statusColor: Record<string, string> = {
    pendente:     "bg-harvest/10 text-harvest-dark border-harvest/30",
    aceite:       "bg-sky-100 text-sky-700 border-sky-200",
    em_andamento: "bg-field/10 text-field border-field/30",
    concluido:    "bg-green-100 text-green-700 border-green-200",
    cancelado:    "bg-earth/10 text-earth border-earth/30",
  };

  return (
    <div>
      {/* Header */}
      <div className="border-b border-field/15 bg-gradient-to-r from-field/5 to-field/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-field p-2 rounded-sm">
              <ShieldCheck size={20} className="text-cream" />
            </div>
            <div>
              <p className="label-eyebrow">Painel de Administração</p>
              <h1 className="text-2xl sm:text-4xl text-field">AgroLink Admin</h1>
            </div>
          </div>
          <p className="font-body text-ink/50 mt-1">
            Gestão completa da plataforma · dados reais em tempo real
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-field/15 bg-cream sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex gap-0 overflow-x-auto">
          {[
            { key: "dashboard", label: "Dashboard",     icon: BarChart2 },
            { key: "users",     label: "Utilizadores",  icon: Users     },
            { key: "routes",    label: "Rotas",         icon: Truck     },
            { key: "requests",  label: "Pedidos",       icon: Package   },
            { key: "precos",    label: "Preços",        icon: TrendingUp},
            { key: "denuncias", label: "Denúncias",     icon: Flag      },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as typeof tab)}
              className={`flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider px-4 py-3.5 border-b-2 transition-colors whitespace-nowrap ${
                tab === key ? "border-field text-field" : "border-transparent text-ink/50 hover:text-ink/80"
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <p className="label-eyebrow">Estatísticas da plataforma</p>
              <button onClick={loadStats} disabled={statsLoading} className="btn-secondary rounded-sm text-xs">
                <RefreshCw size={13} className={statsLoading ? "animate-spin" : ""} /> Actualizar
              </button>
            </div>

            {statsError && (
              <div className="border border-earth/20 bg-earth/5 text-earth p-4 rounded-sm font-mono text-sm">
                {statsError}
              </div>
            )}

            {statsLoading && !stats ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="field-card rounded-sm animate-pulse h-24 bg-field/5" />
                ))}
              </div>
            ) : stats ? (
              <>
                {/* KPIs principais */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Total Utilizadores",   value: stats.utilizadores.total.toLocaleString(),          icon: Users,     color: "text-field"   },
                    { label: "Utilizadores Activos", value: stats.utilizadores.ativos.toLocaleString(),          icon: CheckCircle, color: "text-harvest" },
                    { label: "Receita Total",         value: formatKz(stats.pagamentos.receita_total),           icon: CreditCard, color: "text-earth"   },
                    { label: "Total Transacções",     value: stats.pagamentos.total_transacoes.toLocaleString(), icon: Leaf,       color: "text-harvest" },
                  ].map(s => (
                    <div key={s.label} className="field-card rounded-sm">
                      <div className="flex items-start justify-between mb-3">
                        <s.icon size={20} className={s.color} />
                      </div>
                      <p className={`font-display text-2xl ${s.color}`}>{s.value}</p>
                      <p className="font-mono text-xs text-ink/50 uppercase tracking-wider mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Distribuição por papel */}
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { label: "Agricultores",     value: stats.utilizadores.por_role.agricultor,           icon: Wheat,    color: "text-field"   },
                    { label: "Compradores",       value: stats.utilizadores.por_role.comprador,            icon: Package,  color: "text-harvest" },
                    { label: "Transportadores",   value: stats.utilizadores.por_role.transportador,        icon: Truck,    color: "text-sky-600" },
                  ].map(s => {
                    const total = stats.utilizadores.total || 1;
                    const pct = Math.round((s.value / total) * 100);
                    return (
                      <div key={s.label} className="field-card rounded-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <s.icon size={16} className={s.color} />
                          <span className="font-mono text-xs uppercase tracking-wider text-ink/60">{s.label}</span>
                        </div>
                        <p className={`font-display text-3xl ${s.color} mb-3`}>{s.value}</p>
                        <div className="h-2 bg-field/10 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full bg-current ${s.color}`} style={{ width: `${pct}%`, opacity: 0.6 }} />
                        </div>
                        <p className="font-mono text-xs text-ink/40 mt-1">{pct}% do total</p>
                      </div>
                    );
                  })}
                </div>

                {/* Transporte */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="field-card rounded-sm">
                    <p className="label-eyebrow mb-4 flex items-center gap-2">
                      <Truck size={14} /> Transporte Rural
                    </p>
                    <div className="space-y-2">
                      {[
                        { label: "Total pedidos",   value: stats.transporte.total_pedidos },
                        { label: "Rotas activas",   value: stats.transporte.rotas_ativas  },
                        { label: "Pendentes",        value: stats.transporte.por_status.pendente },
                        { label: "Em andamento",     value: stats.transporte.por_status.em_andamento },
                        { label: "Concluídos",       value: stats.transporte.por_status.concluido },
                      ].map(r => (
                        <div key={r.label} className="flex justify-between items-center py-1 border-b border-field/10">
                          <span className="font-mono text-xs text-ink/50">{r.label}</span>
                          <span className="font-display text-base text-field">{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="field-card rounded-sm">
                    <p className="label-eyebrow mb-4 flex items-center gap-2">
                      <BarChart2 size={14} /> Plataforma
                    </p>
                    <div className="space-y-2">
                      {[
                        { label: "Produtos activos",  value: stats.marketplace.produtos_ativos },
                        { label: "Máquinas disponíveis", value: stats.maquinas.disponiveis },
                        { label: "Prop. de máquinas", value: stats.utilizadores.por_role.proprietario_maquinas },
                        { label: "Admins",             value: stats.utilizadores.por_role.admin },
                      ].map(r => (
                        <div key={r.label} className="flex justify-between items-center py-1 border-b border-field/10">
                          <span className="font-mono text-xs text-ink/50">{r.label}</span>
                          <span className="font-display text-base text-harvest">{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ── UTILIZADORES ── */}
        {tab === "users" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl text-field">
                  Utilizadores {realUsers.length > 0 && `(${realUsers.length})`}
                </h2>
                <p className="font-mono text-xs text-ink/40 uppercase tracking-wider mt-0.5">
                  Dados reais da base de dados
                </p>
              </div>
              <button onClick={loadUsers} disabled={usersLoading} className="btn-secondary rounded-sm text-xs">
                <RefreshCw size={13} className={usersLoading ? "animate-spin" : ""} /> Actualizar
              </button>
            </div>

            {usersError && (
              <div className="border border-earth/20 bg-earth/5 text-earth p-4 rounded-sm font-mono text-sm mb-4">
                {usersError}
              </div>
            )}

            {usersLoading && realUsers.length === 0 ? (
              <div className="space-y-2">
                {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-field/5 animate-pulse rounded-sm" />)}
              </div>
            ) : realUsers.length === 0 ? (
              <div className="field-card text-center py-16 rounded-sm">
                <Users size={32} className="text-field/30 mx-auto mb-3" />
                <p className="font-display text-xl text-field">Nenhum utilizador encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-field/15">
                      {["Nome", "Email", "Papel", "Província", "Estado", "Registado", "Acções"].map(h => (
                        <th key={h} className="px-3 py-3 text-left font-mono text-xs uppercase tracking-wider text-ink/50">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {realUsers.map(u => (
                      <tr key={u.id} className="border-b border-field/10 hover:bg-field/3 transition-colors">
                        <td className="px-3 py-3 font-display text-sm text-ink">{u.nome}</td>
                        <td className="px-3 py-3 font-mono text-xs text-ink/50">{u.email}</td>
                        <td className="px-3 py-3">
                          <span className={`font-mono text-xs px-2 py-0.5 border rounded-sm ${roleColor[u.role] ?? ""}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-ink/60">{u.provincia || "—"}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1 font-mono text-xs ${u.ativo ? "text-field" : "text-earth"}`}>
                            {u.ativo ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            {u.ativo ? "activo" : "suspenso"}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-ink/40">
                          {new Date(u.criado_em).toLocaleDateString("pt-AO")}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleUserActive(u.id)}
                              disabled={togglingId === u.id || u.role === "admin"}
                              title={u.ativo ? "Suspender utilizador" : "Activar utilizador"}
                              className={`p-1.5 border rounded-sm transition-colors disabled:opacity-40 ${
                                u.ativo
                                  ? "border-earth/20 hover:border-earth text-earth/60 hover:text-earth"
                                  : "border-field/20 hover:border-field text-field/60 hover:text-field"
                              }`}
                            >
                              {togglingId === u.id
                                ? <RefreshCw size={13} className="animate-spin" />
                                : <Ban size={13} />
                              }
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── ROTAS ── */}
        {tab === "routes" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl text-field">
                  Rotas de Transporte {routes.length > 0 && `(${routes.length})`}
                </h2>
                <p className="font-mono text-xs text-ink/40 uppercase tracking-wider mt-0.5">Dados reais</p>
              </div>
              <button onClick={loadRoutes} disabled={routesLoading} className="btn-secondary rounded-sm text-xs">
                <RefreshCw size={13} className={routesLoading ? "animate-spin" : ""} /> Actualizar
              </button>
            </div>

            {routesLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[1,2,3,4].map(i => <div key={i} className="h-32 bg-field/5 animate-pulse rounded-sm" />)}
              </div>
            ) : routes.length === 0 ? (
              <div className="field-card text-center py-16 rounded-sm">
                <Truck size={32} className="text-field/30 mx-auto mb-3" />
                <p className="font-display text-xl text-field">Sem rotas registadas</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {routes.map(r => {
                  const total = Number(r.capacidade_total_toneladas);
                  const disp  = Number(r.capacidade_disponivel_toneladas);
                  const used  = total - disp;
                  return (
                    <div key={r.id} className="field-card rounded-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Truck size={16} className="text-field" />
                        <p className="font-display text-base text-field">{r.origem} → {r.destino}</p>
                      </div>
                      <div className="mb-2">
                        <div className="flex justify-between font-mono text-xs text-ink/50 mb-1">
                          <span>Capacidade usada</span>
                          <span>{used.toFixed(1)}t / {total.toFixed(1)}t</span>
                        </div>
                        <div className="h-2 bg-field/10 rounded-full overflow-hidden">
                          <div className="h-full bg-field/50 rounded-full" style={{ width: `${total > 0 ? (used/total)*100 : 0}%` }} />
                        </div>
                      </div>
                      <p className="font-mono text-xs text-ink/40">
                        Partida: {new Date(r.data).toLocaleDateString("pt-AO")}
                      </p>
                      <p className="font-mono text-xs text-ink/30 mt-0.5">
                        Disponível: {disp.toFixed(1)}t
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── PEDIDOS ── */}
        {tab === "requests" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl text-field">
                  Pedidos de Transporte {requests.length > 0 && `(${requests.length})`}
                </h2>
                <p className="font-mono text-xs text-ink/40 uppercase tracking-wider mt-0.5">Dados reais</p>
              </div>
              <button onClick={loadRequests} disabled={requestsLoading} className="btn-secondary rounded-sm text-xs">
                <RefreshCw size={13} className={requestsLoading ? "animate-spin" : ""} /> Actualizar
              </button>
            </div>

            {requestsLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-field/5 animate-pulse rounded-sm" />)}
              </div>
            ) : requests.length === 0 ? (
              <div className="field-card text-center py-16 rounded-sm">
                <Package size={32} className="text-field/30 mx-auto mb-3" />
                <p className="font-display text-xl text-field">Sem pedidos registados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map(req => (
                  <div key={req.id} className="field-card rounded-sm flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-mono text-xs px-2 py-0.5 border rounded-sm ${statusColor[req.status] ?? ""}`}>
                          {req.status}
                        </span>
                        <span className="font-mono text-xs text-ink/40">{req.peso_toneladas}t</span>
                      </div>
                      <p className="font-display text-sm text-ink">{req.produto}</p>
                      <p className="font-mono text-xs text-ink/40 mt-0.5">
                        {req.origem} → {req.destino} · {new Date(req.data).toLocaleDateString("pt-AO")}
                      </p>
                    </div>
                    <div className="font-mono text-xs text-ink/30">
                      {new Date(req.criado_em).toLocaleDateString("pt-AO")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PREÇOS ── */}
        {tab === "precos" && <PrecosAdmin token={token ?? ""} />}

        {/* ── DENÚNCIAS ── */}
        {tab === "denuncias" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="label-eyebrow">Denúncias reportadas</p>
              <button onClick={loadReports} disabled={reportsLoading} className="btn-secondary rounded-sm text-xs">
                <RefreshCw size={13} className={reportsLoading ? "animate-spin" : ""} /> Actualizar
              </button>
            </div>

            {reportsLoading && !reports.length ? (
              <div className="text-center py-12">
                <div className="animate-pulse text-ink/30">A carregar denúncias...</div>
              </div>
            ) : reports.length === 0 ? (
              <div className="field-card rounded-sm text-center py-8">
                <Flag size={32} className="mx-auto mb-2 text-ink/20" />
                <p className="font-body text-ink/40">Nenhuma denúncia neste momento</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                {reports.map((report) => (
                  <div key={report.id} className="field-card rounded-sm border-l-4 border-earth/30">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="px-2 py-1 bg-earth/10 rounded text-earth text-xs font-mono font-bold">
                            {report.motivo}
                          </div>
                          <span className="font-mono text-xs text-ink/40">
                            {new Date(report.criado_em).toLocaleDateString("pt-AO")}
                          </span>
                        </div>
                        <div className="grid gap-2 mb-3">
                          <div>
                            <p className="font-mono text-xs uppercase tracking-wider text-ink/50 mb-1">Denunciante</p>
                            <p className="font-body text-sm text-field">{report.denunciante_nome}</p>
                          </div>
                          <div>
                            <p className="font-mono text-xs uppercase tracking-wider text-ink/50 mb-1">Denunciado</p>
                            <p className="font-body text-sm text-field">{report.denunciado_nome}</p>
                          </div>
                        </div>
                        {report.descricao && (
                          <div className="bg-ink/2 p-3 rounded-sm border border-field/10">
                            <p className="font-body text-sm text-ink/70">{report.descricao}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const PRODUTOS_AO = [
  { value: "milho",      label: "Milho 🌽" },
  { value: "feijao",     label: "Feijão 🫘" },
  { value: "mandioca",   label: "Mandioca 🥔" },
  { value: "soja",       label: "Soja 🌱" },
  { value: "hortalicas", label: "Hortaliças 🥬" },
];

function PrecosAdmin({ token }: { token: string }) {
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMsg, setSeedMsg]         = useState("");
  const [addLoading, setAddLoading]   = useState(false);
  const [addMsg, setAddMsg]           = useState("");
  const [form, setForm] = useState({
    produto: "milho" as CommodityType,
    provincia: "Luanda",
    preco_kg: "",
    fonte: "",
  });

  async function handleSeed() {
    setSeedLoading(true); setSeedMsg("");
    try {
      const r = await seedPrices(token);
      setSeedMsg(r.detail);
    } catch (e: unknown) {
      setSeedMsg("Erro: " + (e instanceof Error ? e.message : String(e)));
    } finally { setSeedLoading(false); }
  }

  async function handleAdd() {
    if (!form.preco_kg || isNaN(Number(form.preco_kg))) { setAddMsg("Introduza um preço válido."); return; }
    setAddLoading(true); setAddMsg("");
    try {
      await createPrice(token, {
        produto: form.produto,
        provincia: form.provincia,
        preco_kg: Number(form.preco_kg),
        fonte: form.fonte || undefined,
      });
      setAddMsg(`✅ Preço de ${form.produto} em ${form.provincia} adicionado!`);
      setForm(f => ({ ...f, preco_kg: "", fonte: "" }));
    } catch (e: unknown) {
      setAddMsg("Erro: " + (e instanceof Error ? e.message : String(e)));
    } finally { setAddLoading(false); }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl text-field mb-1">Gestão de Preços</h2>
        <p className="font-mono text-xs text-ink/40 uppercase tracking-wider">
          Inserir e gerir preços de referência por produto e província
        </p>
      </div>

      <div className="border border-field/20 bg-field/3 p-5 rounded-sm">
        <div className="flex items-start gap-3 mb-3">
          <Database size={18} className="text-field mt-0.5" />
          <div>
            <p className="font-display text-base text-ink uppercase tracking-widest">Carregar Preços de Referência</p>
            <p className="font-mono text-xs text-ink/50 mt-0.5">
              Insere preços iniciais baseados em mercados reais de Angola. Só funciona se a base de dados estiver vazia.
            </p>
          </div>
        </div>
        <button
          onClick={handleSeed}
          disabled={seedLoading}
          className="flex items-center gap-2 bg-field text-cream font-mono text-xs uppercase tracking-wider px-4 py-2 hover:bg-field-light transition-colors rounded-sm disabled:opacity-50"
        >
          <RefreshCw size={13} className={seedLoading ? "animate-spin" : ""} />
          {seedLoading ? "A carregar…" : "Carregar preços de referência"}
        </button>
        {seedMsg && (
          <p className="mt-3 font-mono text-xs text-field border border-field/20 bg-field/5 px-3 py-2 rounded-sm">{seedMsg}</p>
        )}
      </div>

      <div className="border border-field/20 p-5 rounded-sm">
        <div className="flex items-center gap-2 mb-4">
          <PlusCircle size={16} className="text-harvest" />
          <p className="font-display text-base text-ink uppercase tracking-widest">Adicionar Preço Manualmente</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-ink/50 mb-1.5">Produto</label>
            <select
              value={form.produto}
              onChange={e => setForm(f => ({ ...f, produto: e.target.value as CommodityType }))}
              className="w-full font-mono text-xs border border-field/30 bg-cream px-3 py-2 rounded-sm focus:outline-none focus:border-field"
            >
              {PRODUTOS_AO.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-ink/50 mb-1.5">Província</label>
            <select
              value={form.provincia}
              onChange={e => setForm(f => ({ ...f, provincia: e.target.value }))}
              className="w-full font-mono text-xs border border-field/30 bg-cream px-3 py-2 rounded-sm focus:outline-none focus:border-field"
            >
              {PROVINCIAS_AO.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-ink/50 mb-1.5">Preço (Kz/kg)</label>
            <input
              type="number" min="0" step="0.01" placeholder="ex: 250.00"
              value={form.preco_kg}
              onChange={e => setForm(f => ({ ...f, preco_kg: e.target.value }))}
              className="w-full font-mono text-xs border border-field/30 bg-cream px-3 py-2 rounded-sm focus:outline-none focus:border-field"
            />
          </div>
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-ink/50 mb-1.5">Fonte (opcional)</label>
            <input
              type="text" placeholder="ex: Mercado Municipal Huambo"
              value={form.fonte}
              onChange={e => setForm(f => ({ ...f, fonte: e.target.value }))}
              className="w-full font-mono text-xs border border-field/30 bg-cream px-3 py-2 rounded-sm focus:outline-none focus:border-field"
            />
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={addLoading}
          className="flex items-center gap-2 bg-harvest text-cream font-mono text-xs uppercase tracking-wider px-4 py-2 hover:opacity-90 transition-opacity rounded-sm disabled:opacity-50"
        >
          <PlusCircle size={13} />
          {addLoading ? "A guardar…" : "Adicionar preço"}
        </button>
        {addMsg && (
          <p className="mt-3 font-mono text-xs border border-field/20 bg-field/5 px-3 py-2 rounded-sm text-ink/70">{addMsg}</p>
        )}
      </div>
    </div>
  );
}
