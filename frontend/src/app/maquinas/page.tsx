"use client";

import { useEffect, useState, FormEvent } from "react";
import { Search, Plus, X, Tractor } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError, Machine, createMachine, listMachines } from "@/lib/api";
import { MachineCard } from "@/components/MachineCard";

const tipos = [
  { value: "trator", label: "🚜 Trator" },
  { value: "colheitadeira", label: "🌾 Colheitadeira" },
  { value: "pulverizador", label: "💨 Pulverizador" },
  { value: "arado", label: "🔧 Arado" },
  { value: "sistema_irrigacao", label: "💧 Sistema de irrigação" },
];

export default function MaquinasPage() {
  const { user, token } = useAuth();

  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [provincia, setProvincia] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function loadMachines() {
    setLoading(true);
    setError(null);
    try {
      const data = await listMachines({
        provincia: provincia || undefined,
        municipio: municipio || undefined,
      });
      setMachines(data);
    } catch {
      setError("Não foi possível carregar as máquinas. Verifique se o backend está em execução.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMachines(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function handleSearch(e: FormEvent) { e.preventDefault(); loadMachines(); }

  return (
    <div>
      {/* Page header */}
      <div className="border-b border-field/15 bg-sky-light">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-eyebrow mb-2">
              <Tractor size={12} className="inline mr-1" />
              Módulo 04 · Aluguel de Máquinas Agrícolas
            </p>
            <h1 className="text-4xl text-field">Máquinas disponíveis</h1>
            <p className="font-body text-ink/55 mt-1">
              Tratores, colheitadeiras e outros equipamentos para alugar diretamente dos proprietários
            </p>
          </div>
          {user?.role === "proprietario_maquinas" && (
            <button onClick={() => setShowForm(v => !v)} className={showForm ? "btn-secondary rounded-sm" : "btn-primary rounded-sm"}>
              {showForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Anunciar máquina</>}
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {showForm && token && (
          <PublishMachineForm token={token} onPublished={() => { setShowForm(false); loadMachines(); }} />
        )}

        {/* Filtros */}
        <form onSubmit={handleSearch} className="field-card mb-10 rounded-sm">
          <p className="label-eyebrow mb-4">Filtrar máquinas</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-2 lg:col-span-2">
              <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Província</span>
              <input value={provincia} onChange={e => setProvincia(e.target.value)}
                placeholder="Ex: Huambo"
                className="field-input rounded-sm" />
            </label>
            <label className="flex flex-col gap-2 lg:col-span-2">
              <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Município</span>
              <input value={municipio} onChange={e => setMunicipio(e.target.value)}
                placeholder="Ex: Caála"
                className="field-input rounded-sm" />
            </label>
            <div className="sm:col-span-2 lg:col-span-4">
              <button type="submit" className="btn-primary rounded-sm">
                <Search size={16} /> Pesquisar
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="border border-earth/25 bg-earth/8 text-earth px-4 py-3 rounded-sm mb-6 font-body text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center gap-2 font-mono text-sm text-field/60">
              <Tractor size={16} className="animate-pulse" />
              A carregar máquinas...
            </div>
          </div>
        ) : machines.length === 0 ? (
          <div className="field-card text-center py-16 rounded-sm">
            <Tractor size={32} className="text-field/30 mx-auto mb-3" />
            <p className="font-display text-2xl text-field mb-2">Nenhuma máquina encontrada</p>
            <p className="font-body text-ink/50">
              Ajuste os filtros ou seja o primeiro a anunciar um equipamento nesta região.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {machines.map(m => <MachineCard key={m.id} machine={m} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function PublishMachineForm({ token, onPublished }: { token: string; onPublished: () => void }) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState("trator");
  const [valorDiario, setValorDiario] = useState("");
  const [provincia, setProvincia] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createMachine(token, {
        nome,
        descricao: descricao || undefined,
        tipo: tipo as Machine["tipo"],
        valor_diario: Number(valorDiario) as unknown as string,
        provincia: provincia || undefined,
        municipio: municipio || undefined,
      });
      onPublished();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Não foi possível anunciar a máquina.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="field-card mb-10 rounded-sm border-harvest/30">
      <p className="label-eyebrow mb-5">Anunciar nova máquina</p>
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-2 lg:col-span-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Nome do equipamento</span>
          <input required value={nome} onChange={e => setNome(e.target.value)}
            placeholder="Ex: Trator Massey Ferguson 4275" className="field-input rounded-sm" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Tipo</span>
          <select value={tipo} onChange={e => setTipo(e.target.value)} className="field-input rounded-sm">
            {tipos.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Valor diário (Kz)</span>
          <input required type="number" min="0.01" step="0.01" value={valorDiario}
            onChange={e => setValorDiario(e.target.value)} className="field-input rounded-sm" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Província</span>
          <input value={provincia} onChange={e => setProvincia(e.target.value)}
            placeholder="Ex: Huambo" className="field-input rounded-sm" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Município</span>
          <input value={municipio} onChange={e => setMunicipio(e.target.value)}
            placeholder="Ex: Caála" className="field-input rounded-sm" />
        </label>
        <label className="flex flex-col gap-2 lg:col-span-4">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Descrição (opcional)</span>
          <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3}
            className="field-input rounded-sm" />
        </label>
        {error && <p className="text-earth font-body text-sm lg:col-span-4">{error}</p>}
        <div className="lg:col-span-4">
          <button type="submit" disabled={loading} className="btn-harvest rounded-sm disabled:opacity-50">
            {loading ? "A publicar..." : "Anunciar máquina"}
          </button>
        </div>
      </form>
    </div>
  );
}
