"use client";

import { useEffect, useState, FormEvent } from "react";
import { Search, Tractor } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError, Machine, listMachines } from "@/lib/api";
import { MachineCard } from "@/components/MachineCard";
import { MachineOwnerDashboard } from "@/components/MachineOwnerDashboard";
import { PROVINCIAS, getMunicipios } from "@/lib/angola";

export default function MaquinasPage() {
  const { user, token } = useAuth();

  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provincia, setProvincia] = useState("");
  const [municipio, setMunicipio] = useState("");

  async function loadMachines() {
    setLoading(true);
    setError(null);
    try {
      const data = await listMachines({
        provincia: provincia || undefined,
        municipio: municipio || undefined,
      });
      setMachines(data);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 0
          ? "O servidor está a iniciar. Aguarde uns momentos e tente novamente."
          : "Não foi possível carregar as máquinas."
      );
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
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
          <h1 className="text-4xl text-field">Aluguel de Máquinas</h1>
          <p className="font-body text-ink/55 mt-1">
            Tratores, colheitadeiras e outros equipamentos para alugar diretamente dos proprietários
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
        {/* Painel do proprietário — inclui formulário de publicação */}
        {user?.role === "proprietario_maquinas" && token && (
          <div className="mb-14">
            <MachineOwnerDashboard token={token} />
            <div className="border-b border-field/15 mt-14 mb-2" />
            <p className="label-eyebrow mt-6 mb-6">Catálogo público de máquinas</p>
          </div>
        )}

        {/* Filtros */}
        <form onSubmit={handleSearch} className="field-card mb-10 rounded-sm">
          <p className="label-eyebrow mb-4">Filtrar máquinas</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-2 lg:col-span-2">
              <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Província</span>
              <select value={provincia} onChange={e => { setProvincia(e.target.value); setMunicipio(""); }}
                className="field-input rounded-sm">
                <option value="">Todas as províncias</option>
                {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-2 lg:col-span-2">
              <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Município</span>
              <select value={municipio} onChange={e => setMunicipio(e.target.value)}
                disabled={!provincia} className="field-input rounded-sm disabled:opacity-50">
                <option value="">Todos os municípios</option>
                {provincia && getMunicipios(provincia).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <div className="sm:col-span-2 lg:col-span-4">
              <button type="submit" className="btn-primary rounded-sm">
                <Search size={16} /> Pesquisar
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="border border-earth/25 bg-earth/8 text-earth px-4 py-3 rounded-sm mb-6 font-body text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={loadMachines} className="btn-link text-earth hover:underline text-xs ml-4">
              🔄 Tentar novamente
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-card animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="skeleton-img" />
                <div className="p-4 flex flex-col gap-3">
                  <div className="skeleton-text w-3/4" />
                  <div className="skeleton-text-sm w-full" />
                  <div className="skeleton-text-sm w-1/2" />
                  <div className="skeleton h-9 w-full mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : machines.length === 0 ? (
          <div className="empty-state field-card rounded-sm">
            <div className="empty-state-icon">
              <Tractor size={28} className="text-field/50" />
            </div>
            <p className="empty-state-title">Nenhuma máquina encontrada</p>
            <p className="empty-state-desc">
              Tente ajustar os filtros ou remova a pesquisa para ver todos os equipamentos disponíveis.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
            {machines.map((m, i) => (
              <div key={m.id} style={{ animationDelay: `${i * 40}ms` }} className="animate-fade-in">
                <MachineCard machine={m} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
