"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Users, Truck, Wheat, TrendingUp,
  CreditCard, CheckCircle, XCircle, Clock, BarChart2,
  Leaf, Package, RefreshCw, Eye, Ban, PlusCircle, Database,
} from "lucide-react";
import { createPrice, seedPrices, CommodityType } from "@/lib/api";
import { PROVINCIAS as PROVINCIAS_AO, getMunicipios } from "@/lib/angola";

// Dados de DEMONSTRAÇÃO — claramente fictícios
const DEMO_USERS = [
  { id: "1", nome: "Utilizador Demo A", email: "demo-a@exemplo.demo", role: "agricultor",    status: "activo",  criado: "2024-01-15", provincia: "Huambo"   },
  { id: "2", nome: "Utilizador Demo B", email: "demo-b@exemplo.demo", role: "comprador",     status: "activo",  criado: "2024-02-03", provincia: "Luanda"   },
  { id: "3", nome: "Utilizador Demo C", email: "demo-c@exemplo.demo", role: "transportador", status: "activo",  criado: "2024-01-28", provincia: "Benguela" },
  { id: "4", nome: "Utilizador Demo D", email: "demo-d@exemplo.demo", role: "cooperativa",   status: "suspenso",criado: "2024-03-10", provincia: "Bié"      },
  { id: "5", nome: "Utilizador Demo E", email: "demo-e@exemplo.demo", role: "agricultor",    status: "activo",  criado: "2024-03-22", provincia: "Malanje"  },
];

const DEMO_PAYMENTS = [
  { id: "DEMO-001", descricao: "Transporte Caála → Huambo",   valor: 30000, comissao: 1500, status: "concluido", data: "2024-03-15", metodo: "Multicaixa"   },
  { id: "DEMO-002", descricao: "Aluguel Tractor — 2 dias",    valor: 25000, comissao: 2500, status: "pendente",  data: "2024-03-18", metodo: "Transferência" },
  { id: "DEMO-003", descricao: "Transporte Kuito → Luanda",   valor: 80000, comissao: 4000, status: "concluido", data: "2024-03-20", metodo: "Referência"   },
  { id: "DEMO-004", descricao: "Marketplace — Milho 500 kg",  valor: 15000, comissao: 750,  status: "concluido", data: "2024-03-21", metodo: "Multicaixa"   },
  { id: "DEMO-005", descricao: "Transporte Benguela → Luanda",valor: 60000, comissao: 3000, status: "cancelado", data: "2024-03-22", metodo: "Transferência" },
];

const DEMO_STATS = {
  totalUtilizadores: 1247,
  transacoesMes: 89,
  receitaMes: 145000,
  comissaoMes: 7250,
  agricultores: 623,
  compradores: 440,
  transportadores: 184,
  rotasActivas: 34,
};

function formatKz(val: number) {
  return new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(val) + " Kz";
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"dashboard" | "users" | "payments" | "routes" | "precos">("dashboard");
  const [users, setUsers] = useState(DEMO_USERS);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (loading) return;
    // Redireciona se não estiver autenticado ou não for admin
    if (!user || user.role !== "admin") {
      router.replace("/");
    }
  }, [user, loading, router]);

  // Enquanto verifica autenticação, não mostra nada
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

  function toggleUserStatus(id: string) {
    setUsers(prev => prev.map(u =>
      u.id === id ? { ...u, status: u.status === "activo" ? "suspenso" : "activo" } : u
    ));
  }

  const roleColor: Record<string, string> = {
    agricultor:    "bg-field/10 text-field border-field/30",
    transportador: "bg-sky-100 text-sky-700 border-sky-200",
    comprador:     "bg-harvest/10 text-harvest-dark border-harvest/30",
    cooperativa:   "bg-purple-100 text-purple-700 border-purple-200",
    admin:         "bg-red-100 text-red-700 border-red-200",
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
            Gestão completa da plataforma ·{" "}
            <span className="text-harvest font-mono text-xs uppercase tracking-wider">
              ⚠ Dados de demonstração — não reflectem utilizadores reais
            </span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-field/15 bg-cream sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex gap-0 overflow-x-auto">
          {[
            { key: "dashboard", label: "Dashboard",      icon: BarChart2 },
            { key: "users",     label: "Utilizadores",   icon: Users     },
            { key: "payments",  label: "Pagamentos",     icon: CreditCard},
            { key: "routes",    label: "Rotas Activas",  icon: Truck     },
            { key: "precos",    label: "Preços",         icon: TrendingUp},
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

        {/* ── DASHBOARD ─── */}
        {tab === "dashboard" && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Utilizadores",  value: DEMO_STATS.totalUtilizadores.toLocaleString(), icon: Users,      color: "text-field"   },
                { label: "Transacções / Mês",   value: DEMO_STATS.transacoesMes,                      icon: TrendingUp,  color: "text-harvest" },
                { label: "Receita do Mês",       value: formatKz(DEMO_STATS.receitaMes),               icon: CreditCard,  color: "text-earth"   },
                { label: "Comissão do Mês",      value: formatKz(DEMO_STATS.comissaoMes),              icon: Leaf,        color: "text-harvest" },
              ].map(s => (
                <div key={s.label} className="field-card rounded-sm">
                  <div className="flex items-start justify-between mb-3">
                    <s.icon size={20} className={s.color} />
                    <span className="font-mono text-xs text-ink/30 uppercase tracking-wider">Demo</span>
                  </div>
                  <p className={`font-display text-2xl ${s.color}`}>{s.value}</p>
                  <p className="font-mono text-xs text-ink/50 uppercase tracking-wider mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: "Agricultores",    value: DEMO_STATS.agricultores,    icon: Wheat,    color: "text-field",   pct: 50 },
                { label: "Compradores",     value: DEMO_STATS.compradores,     icon: Package,  color: "text-harvest", pct: 35 },
                { label: "Transportadores", value: DEMO_STATS.transportadores, icon: Truck,    color: "text-sky-600", pct: 15 },
              ].map(s => (
                <div key={s.label} className="field-card rounded-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <s.icon size={16} className={s.color} />
                    <span className="font-mono text-xs uppercase tracking-wider text-ink/60">{s.label}</span>
                  </div>
                  <p className={`font-display text-3xl ${s.color} mb-3`}>{s.value}</p>
                  <div className="h-2 bg-field/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full bg-current ${s.color}`} style={{ width: `${s.pct}%`, opacity: 0.6 }} />
                  </div>
                  <p className="font-mono text-xs text-ink/40 mt-1">{s.pct}% do total</p>
                </div>
              ))}
            </div>

            <div className="field-card rounded-sm">
              <p className="label-eyebrow mb-4 flex items-center gap-2">
                <BarChart2 size={14} /> Actividade simulada — Últimos 7 dias
              </p>
              <div className="flex items-end gap-2 h-32">
                {[12, 8, 15, 23, 18, 31, 27].map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-field/30 hover:bg-field transition-colors rounded-sm cursor-default"
                      style={{ height: `${(v / 31) * 100}%` }}
                      title={`${v} transacções (demo)`}
                    />
                    <span className="font-mono text-xs text-ink/30">
                      {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][i]}
                    </span>
                  </div>
                ))}
              </div>
              <p className="font-mono text-xs text-ink/30 mt-3 uppercase tracking-wider">⚠ Valores simulados para demonstração</p>
            </div>
          </div>
        )}

        {/* ── USERS ─── */}
        {tab === "users" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl text-field">Utilizadores ({users.length})</h2>
                <p className="font-mono text-xs text-ink/40 uppercase tracking-wider mt-0.5">
                  ⚠ Dados fictícios de demonstração — não são utilizadores reais
                </p>
              </div>
              <button
                onClick={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); }}
                className="btn-secondary rounded-sm text-xs"
              >
                <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Actualizar
              </button>
            </div>
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
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-field/10 hover:bg-field/3 transition-colors">
                      <td className="px-3 py-3 font-display text-sm text-ink">{u.nome}</td>
                      <td className="px-3 py-3 font-mono text-xs text-ink/40 italic">{u.email}</td>
                      <td className="px-3 py-3">
                        <span className={`font-mono text-xs px-2 py-0.5 border rounded-sm ${roleColor[u.role] ?? ""}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-ink/60">{u.provincia}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 font-mono text-xs ${u.status === "activo" ? "text-field" : "text-earth"}`}>
                          {u.status === "activo" ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {u.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-ink/40">{u.criado}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <button className="p-1.5 border border-field/20 hover:border-field rounded-sm text-field/60 hover:text-field transition-colors" title="Ver detalhes (demo)">
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => toggleUserStatus(u.id)}
                            title={u.status === "activo" ? "Suspender (demo)" : "Activar (demo)"}
                            className={`p-1.5 border rounded-sm transition-colors ${u.status === "activo" ? "border-earth/20 hover:border-earth text-earth/60 hover:text-earth" : "border-field/20 hover:border-field text-field/60 hover:text-field"}`}
                          >
                            <Ban size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PAYMENTS ─── */}
        {tab === "payments" && (
          <div>
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl text-field">Pagamentos</h2>
                <div className="font-mono text-sm text-harvest">
                  Comissões demo: {formatKz(DEMO_PAYMENTS.reduce((s, p) => s + (p.status === "concluido" ? p.comissao : 0), 0))}
                </div>
              </div>
              <p className="font-mono text-xs text-ink/40 uppercase tracking-wider mt-1">
                ⚠ Transacções fictícias de demonstração
              </p>
            </div>
            <div className="space-y-4">
              {DEMO_PAYMENTS.map(p => (
                <div key={p.id} className="field-card rounded-sm flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-ink/40">{p.id}</span>
                      <span className={`inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded-sm ${
                        p.status === "concluido" ? "bg-field/10 text-field border border-field/30" :
                        p.status === "pendente"  ? "bg-harvest/10 text-harvest-dark border border-harvest/30" :
                                                   "bg-earth/10 text-earth border border-earth/30"
                      }`}>
                        {p.status === "concluido" ? <CheckCircle size={10} /> : p.status === "pendente" ? <Clock size={10} /> : <XCircle size={10} />}
                        {p.status}
                      </span>
                    </div>
                    <p className="font-display text-base text-ink">{p.descricao}</p>
                    <p className="font-mono text-xs text-ink/40 mt-0.5">{p.data} · {p.metodo}</p>
                  </div>
                  <div className="text-right font-mono">
                    <p className="text-xl text-field font-bold">{formatKz(p.valor)}</p>
                    <p className="text-xs text-harvest">Comissão: {formatKz(p.comissao)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ROUTES ─── */}
        {tab === "routes" && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl text-field">Rotas Activas ({DEMO_STATS.rotasActivas})</h2>
              <p className="font-mono text-xs text-ink/40 uppercase tracking-wider mt-1">
                ⚠ Rotas de demonstração
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { origem: "Caála",   destino: "Huambo", transp: "Transportador Demo 1", cap: 10, disp: 4,  data: "2024-03-25" },
                { origem: "Kuito",   destino: "Luanda", transp: "Transportador Demo 2", cap: 15, disp: 8,  data: "2024-03-26" },
                { origem: "Malanje", destino: "Luanda", transp: "Transportador Demo 3", cap: 8,  disp: 2,  data: "2024-03-27" },
                { origem: "Lobito",  destino: "Luanda", transp: "Transportador Demo 4", cap: 20, disp: 15, data: "2024-03-28" },
              ].map((r, i) => (
                <div key={i} className="field-card rounded-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Truck size={16} className="text-field" />
                    <p className="font-display text-base text-field">{r.origem} → {r.destino}</p>
                  </div>
                  <p className="font-mono text-xs text-ink/50 mb-3">Transportador: {r.transp}</p>
                  <div className="mb-2">
                    <div className="flex justify-between font-mono text-xs text-ink/50 mb-1">
                      <span>Capacidade</span>
                      <span>{r.disp}t / {r.cap}t disponíveis</span>
                    </div>
                    <div className="h-2 bg-field/10 rounded-full overflow-hidden">
                      <div className="h-full bg-field/50 rounded-full" style={{ width: `${((r.cap - r.disp) / r.cap) * 100}%` }} />
                    </div>
                  </div>
                  <p className="font-mono text-xs text-ink/40">Partida: {r.data}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PREÇOS ─── */}
        {tab === "precos" && <PrecosAdmin token={user.token} />}
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

      {/* Seed inicial */}
      <div className="border border-field/20 bg-field/3 p-5 rounded-sm">
        <div className="flex items-start gap-3 mb-3">
          <Database size={18} className="text-field mt-0.5" />
          <div>
            <p className="font-display text-base text-ink uppercase tracking-widest">Carregar Preços de Referência</p>
            <p className="font-mono text-xs text-ink/50 mt-0.5">
              Insere preços iniciais baseados em mercados reais de Angola (milho, feijão, mandioca, soja, hortaliças em várias províncias).
              Só funciona se a base de dados estiver vazia.
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

      {/* Formulário para adicionar preço manualmente */}
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
              type="number"
              min="0"
              step="0.01"
              placeholder="ex: 250.00"
              value={form.preco_kg}
              onChange={e => setForm(f => ({ ...f, preco_kg: e.target.value }))}
              className="w-full font-mono text-xs border border-field/30 bg-cream px-3 py-2 rounded-sm focus:outline-none focus:border-field"
            />
          </div>
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-ink/50 mb-1.5">Fonte (opcional)</label>
            <input
              type="text"
              placeholder="ex: Mercado Municipal Huambo"
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
