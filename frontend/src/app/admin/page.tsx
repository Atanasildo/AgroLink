"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Users, Truck, Wheat, TrendingUp,
  CreditCard, CheckCircle, XCircle, Clock, BarChart2,
  Leaf, Package, RefreshCw, Eye, Ban
} from "lucide-react";

// Fake admin data
const FAKE_USERS = [
  { id: "1", nome: "João Mbala", email: "joao@agrolink.ao", role: "agricultor", status: "activo", criado: "2024-01-15", provincia: "Huambo" },
  { id: "2", nome: "Maria Ngola", email: "maria@agrolink.ao", role: "comprador", status: "activo", criado: "2024-02-03", provincia: "Luanda" },
  { id: "3", nome: "Carlos Transportes", email: "carlos@agrolink.ao", role: "transportador", status: "activo", criado: "2024-01-28", provincia: "Benguela" },
  { id: "4", nome: "Ana Cooperativa", email: "ana@agrolink.ao", role: "cooperativa", status: "suspenso", criado: "2024-03-10", provincia: "Bié" },
  { id: "5", nome: "Pedro Fazenda", email: "pedro@agrolink.ao", role: "agricultor", status: "activo", criado: "2024-03-22", provincia: "Malanje" },
];

const FAKE_PAYMENTS = [
  { id: "PAY-001", descricao: "Transporte Caála → Huambo", valor: 30000, comissao: 1500, status: "concluido", data: "2024-03-15", metodo: "Multicaixa" },
  { id: "PAY-002", descricao: "Aluguel Tractor - 2 dias", valor: 25000, comissao: 2500, status: "pendente", data: "2024-03-18", metodo: "Transferência" },
  { id: "PAY-003", descricao: "Transporte Kuito → Luanda", valor: 80000, comissao: 4000, status: "concluido", data: "2024-03-20", metodo: "Referência" },
  { id: "PAY-004", descricao: "Marketplace - Milho 500kg", valor: 15000, comissao: 750, status: "concluido", data: "2024-03-21", metodo: "Multicaixa" },
  { id: "PAY-005", descricao: "Transporte Benguela → Luanda", valor: 60000, comissao: 3000, status: "cancelado", data: "2024-03-22", metodo: "Transferência" },
];

const FAKE_STATS = {
  totalUtilizadores: 1247,
  agricultores: 623,
  transportadores: 184,
  compradores: 440,
  transacoesMes: 89,
  receitaMes: 145000,
  comissaoMes: 7250,
  rotasActivas: 34,
};

function formatKz(val: number) {
  return new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(val) + " Kz";
}

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"dashboard" | "users" | "payments" | "routes">("dashboard");
  const [users, setUsers] = useState(FAKE_USERS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only admin can access — for demo, allow any logged-in user
    if (user === null) {
      router.push("/login");
    }
  }, [user, router]);

  function toggleUserStatus(id: string) {
    setUsers(prev => prev.map(u =>
      u.id === id ? { ...u, status: u.status === "activo" ? "suspenso" : "activo" } : u
    ));
  }

  const roleColor: Record<string, string> = {
    agricultor: "bg-field/10 text-field border-field/30",
    transportador: "bg-sky-100 text-sky-700 border-sky-200",
    comprador: "bg-harvest/10 text-harvest-dark border-harvest/30",
    cooperativa: "bg-purple-100 text-purple-700 border-purple-200",
    admin: "bg-red-100 text-red-700 border-red-200",
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
          <p className="font-body text-ink/50 mt-1">Gestão completa da plataforma · Dados de demonstração</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-field/15 bg-cream sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex gap-0 overflow-x-auto">
          {[
            { key: "dashboard", label: "Dashboard", icon: BarChart2 },
            { key: "users", label: "Utilizadores", icon: Users },
            { key: "payments", label: "Pagamentos", icon: CreditCard },
            { key: "routes", label: "Rotas Activas", icon: Truck },
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
                { label: "Total Utilizadores", value: FAKE_STATS.totalUtilizadores.toLocaleString(), icon: Users, color: "text-field" },
                { label: "Transacções/Mês", value: FAKE_STATS.transacoesMes, icon: TrendingUp, color: "text-harvest" },
                { label: "Receita do Mês", value: formatKz(FAKE_STATS.receitaMes), icon: CreditCard, color: "text-earth" },
                { label: "Comissão do Mês", value: formatKz(FAKE_STATS.comissaoMes), icon: Leaf, color: "text-harvest" },
              ].map(s => (
                <div key={s.label} className="field-card rounded-sm">
                  <div className="flex items-start justify-between mb-3">
                    <s.icon size={20} className={s.color} />
                    <span className="font-mono text-xs text-ink/30 uppercase tracking-wider">Este mês</span>
                  </div>
                  <p className={`font-display text-2xl ${s.color}`}>{s.value}</p>
                  <p className="font-mono text-xs text-ink/50 uppercase tracking-wider mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: "Agricultores", value: FAKE_STATS.agricultores, icon: Wheat, color: "text-field", pct: 50 },
                { label: "Compradores", value: FAKE_STATS.compradores, icon: Package, color: "text-harvest", pct: 35 },
                { label: "Transportadores", value: FAKE_STATS.transportadores, icon: Truck, color: "text-sky-600", pct: 15 },
              ].map(s => (
                <div key={s.label} className="field-card rounded-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <s.icon size={16} className={s.color} />
                    <span className="font-mono text-xs uppercase tracking-wider text-ink/60">{s.label}</span>
                  </div>
                  <p className={`font-display text-3xl ${s.color} mb-3`}>{s.value}</p>
                  <div className="h-2 bg-field/10 rounded-full overflow-hidden">
                    <div className={`h-full bg-current ${s.color} rounded-full`} style={{ width: `${s.pct}%`, opacity: 0.6 }} />
                  </div>
                  <p className="font-mono text-xs text-ink/40 mt-1">{s.pct}% do total</p>
                </div>
              ))}
            </div>

            <div className="field-card rounded-sm">
              <p className="label-eyebrow mb-4 flex items-center gap-2">
                <BarChart2 size={14} /> Actividade recente — Últimos 7 dias
              </p>
              <div className="flex items-end gap-2 h-32">
                {[12, 8, 15, 23, 18, 31, 27].map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-field/30 hover:bg-field transition-colors rounded-sm cursor-pointer"
                      style={{ height: `${(v / 31) * 100}%` }}
                      title={`${v} transacções`}
                    />
                    <span className="font-mono text-xs text-ink/30">
                      {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ─── */}
        {tab === "users" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-field">Utilizadores ({users.length})</h2>
              <button onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 800); }}
                className="btn-secondary rounded-sm text-xs">
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Actualizar
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
                      <td className="px-3 py-3 font-mono text-xs text-ink/60">{u.email}</td>
                      <td className="px-3 py-3">
                        <span className={`font-mono text-xs px-2 py-0.5 border rounded-sm ${roleColor[u.role] || ""}`}>
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
                          <button className="p-1.5 border border-field/20 hover:border-field rounded-sm text-field/60 hover:text-field transition-colors">
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => toggleUserStatus(u.id)}
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-field">Pagamentos</h2>
              <div className="font-mono text-sm text-harvest">
                Total comissões: {formatKz(FAKE_PAYMENTS.reduce((s, p) => s + (p.status === "concluido" ? p.comissao : 0), 0))}
              </div>
            </div>
            <div className="space-y-4">
              {FAKE_PAYMENTS.map(p => (
                <div key={p.id} className="field-card rounded-sm flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-ink/40">{p.id}</span>
                      <span className={`inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded-sm ${
                        p.status === "concluido" ? "bg-field/10 text-field border border-field/30" :
                        p.status === "pendente" ? "bg-harvest/10 text-harvest-dark border border-harvest/30" :
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
            <h2 className="text-2xl text-field mb-6">Rotas Activas ({FAKE_STATS.rotasActivas})</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { origem: "Caála", destino: "Huambo", transp: "Carlos Transportes", cap: 10, disp: 4, data: "2024-03-25" },
                { origem: "Kuito", destino: "Luanda", transp: "António Caminhões", cap: 15, disp: 8, data: "2024-03-26" },
                { origem: "Malanje", destino: "Luanda", transp: "Transportes Mbala", cap: 8, disp: 2, data: "2024-03-27" },
                { origem: "Lobito", destino: "Luanda", transp: "Rota Sul Lda", cap: 20, disp: 15, data: "2024-03-28" },
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
      </div>
    </div>
  );
}
