"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  Wrench, Plus, Trash2, CheckCircle, XCircle, Clock, Loader,
  MapPin, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Pencil, Save, X,
} from "lucide-react";
import {
  Machine, MachineRental, MachineRentalStatus,
  myMachines, createMachine, updateMachine, deleteMachine,
  myMachineRentals, updateMachineRentalStatus,
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

const tipoMaquinaLabels: Record<string, string> = {
  trator: "🚜 Trator",
  colheitadeira: "🌾 Colheitadeira",
  arado: "⚙️ Arado",
  plantadora: "🌱 Plantadora",
  irrigacao: "💧 Irrigação",
  outros: "🔧 Outros",
};

const statusConfig: Record<string, { label: string; icon: typeof Clock; cls: string }> = {
  pendente:     { label: "Pendente",     icon: Clock,       cls: "pending" },
  confirmado:   { label: "Confirmado",   icon: CheckCircle, cls: "active" },
  em_andamento: { label: "Em andamento", icon: Loader,      cls: "active" },
  concluido:    { label: "Concluído",    icon: CheckCircle, cls: "done" },
  cancelado:    { label: "Cancelado",    icon: XCircle,     cls: "done" },
};

function formatKz(value?: number | string | null) {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(num) + " Kz";
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-AO");
}

// ---- Main Component ----
export function MachineOwnerDashboard({ token }: { token: string }) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [rentals, setRentals] = useState<MachineRental[]>([]);
  const [loadingAll, setLoadingAll] = useState(true);
  const [showMachineForm, setShowMachineForm] = useState(false);

  async function loadAll() {
    setLoadingAll(true);
    try {
      const [m, r] = await Promise.all([
        myMachines(token),
        myMachineRentals(token),
      ]);
      setMachines(m);
      setRentals(r);
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
        <Wrench size={28} className="text-field/30 mx-auto mb-2 animate-pulse" />
        <p className="font-mono text-sm text-ink/40">A carregar o seu painel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="border-b border-field/15 pb-6">
        <p className="label-eyebrow mb-1">Painel do Proprietário</p>
        <h2 className="text-3xl text-field">As suas máquinas</h2>
        <p className="font-body text-ink/50 mt-1">
          Gira o seu equipamento, ajuste disponibilidade e responda às reservas.
        </p>
      </div>

      {/* ---- Meu Equipamento ---- */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl text-field flex items-center gap-2">
            <Wrench size={18} className="text-harvest" />
            Meu Equipamento ({machines.length})
          </h3>
          <button
            onClick={() => setShowMachineForm(v => !v)}
            className="btn-primary rounded-sm text-xs"
          >
            <Plus size={14} />
            {showMachineForm ? "Cancelar" : "Adicionar máquina"}
          </button>
        </div>

        {showMachineForm && (
          <MachineForm
            token={token}
            onSuccess={() => { setShowMachineForm(false); loadAll(); }}
          />
        )}

        {machines.length === 0 && !showMachineForm ? (
          <div className="field-card text-center py-10 rounded-sm">
            <Wrench size={28} className="text-field/25 mx-auto mb-3" />
            <p className="font-display text-xl text-field mb-1">Sem equipamento registado</p>
            <p className="font-body text-ink/45 text-sm">Adicione a sua primeira máquina para começar a receber reservas.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {machines.map(m => (
              <MachineCard
                key={m.id}
                machine={m}
                token={token}
                onChanged={loadAll}
              />
            ))}
          </div>
        )}
      </section>

      {/* ---- Reservas Recebidas ---- */}
      <section>
        <h3 className="text-xl text-field flex items-center gap-2 mb-4">
          <Clock size={18} className="text-harvest" />
          Reservas Recebidas ({rentals.length})
        </h3>

        {rentals.length === 0 ? (
          <div className="field-card text-center py-10 rounded-sm">
            <Clock size={28} className="text-field/25 mx-auto mb-3" />
            <p className="font-display text-xl text-field mb-1">Sem reservas ainda</p>
            <p className="font-body text-ink/45 text-sm">Os pedidos de reserva dos agricultores aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rentals.map(rental => (
              <RentalCard
                key={rental.id}
                rental={rental}
                machines={machines}
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

// ---- Machine Form ----
function MachineForm({ token, onSuccess, initial }: {
  token: string;
  onSuccess: () => void;
  initial?: Machine;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [tipo, setTipo] = useState<string>(initial?.tipo ?? "trator");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [precoDiaria, setPrecoDiaria] = useState(initial?.preco_diaria?.toString() ?? "");
  const [provincia, setProvincia] = useState(initial?.provincia ?? "");
  const [municipio, setMunicipio] = useState(initial?.municipio ?? "");
  const [imagens, setImagens] = useState<string[]>(initial?.imagens ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        nome, tipo: tipo as Machine["tipo"], descricao: descricao || undefined,
        preco_diaria: parseFloat(precoDiaria), provincia, municipio,
        imagens: imagens.length > 0 ? imagens : undefined,
      };
      if (initial) {
        await updateMachine(token, initial.id, payload);
      } else {
        await createMachine(token, payload);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Erro ao guardar máquina.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="field-card rounded-sm mb-4">
      <p className="label-eyebrow mb-4">{initial ? "Editar máquina" : "Registar nova máquina"}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Nome do equipamento</span>
          <input
            required value={nome} onChange={e => setNome(e.target.value)}
            placeholder="Ex: Trator John Deere 5075E"
            className="field-input rounded-sm"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Tipo</span>
          <select value={tipo} onChange={e => setTipo(e.target.value)} className="field-input rounded-sm">
            {Object.entries(tipoMaquinaLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Preço por dia (Kz)</span>
          <input
            required type="number" min="100" step="100"
            value={precoDiaria} onChange={e => setPrecoDiaria(e.target.value)}
            placeholder="Ex: 25000"
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
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Descrição (opcional)</span>
          <textarea
            value={descricao} onChange={e => setDescricao(e.target.value)}
            rows={2} placeholder="Condições, acessórios incluídos, etc."
            className="field-input rounded-sm resize-none"
          />
        </label>
        <div className="sm:col-span-2">
          <ImageUpload images={imagens} onChange={setImagens} maxImages={4} label="Fotos da máquina/equipamento" />
        </div>
      </div>
      {error && <p className="text-earth font-body text-sm mt-3">{error}</p>}
      <div className="mt-4">
        <button type="submit" disabled={loading} className="btn-harvest rounded-sm disabled:opacity-50">
          <Save size={14} />
          {loading ? "A guardar..." : initial ? "Guardar alterações" : "Registar máquina"}
        </button>
      </div>
    </form>
  );
}

// ---- Machine Card ----
function MachineCard({ machine, token, onChanged }: {
  machine: Machine;
  token: string;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleDelete() {
    if (!confirm("Tem a certeza que quer remover esta máquina?")) return;
    setDeleting(true);
    try {
      await deleteMachine(token, machine.id);
      onChanged();
    } catch { setDeleting(false); }
  }

  async function handleToggle() {
    setToggling(true);
    try {
      await updateMachine(token, machine.id, { disponivel: !machine.disponivel });
      onChanged();
    } catch { setToggling(false); }
  }

  if (editing) {
    return (
      <div className="field-card rounded-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-xs uppercase tracking-wider text-ink/50">A editar</p>
          <button onClick={() => setEditing(false)} className="text-ink/40 hover:text-field transition-colors">
            <X size={16} />
          </button>
        </div>
        <MachineForm
          token={token}
          initial={machine}
          onSuccess={() => { setEditing(false); onChanged(); }}
        />
      </div>
    );
  }

  return (
    <div className="field-card rounded-sm">
      {/* Galeria de fotos (se existir) */}
      {machine.imagens && machine.imagens.length > 0 && (
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-0.5">
          {machine.imagens.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`Foto ${i + 1}`}
              className="w-20 h-16 object-cover rounded-sm flex-shrink-0 border border-earth/15"
            />
          ))}
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-display text-base text-field mb-0.5">
            {machine.nome}
          </p>
          <p className="font-mono text-xs text-ink/50 mb-1">{tipoMaquinaLabels[machine.tipo] ?? machine.tipo}</p>
          {machine.descricao && (
            <p className="font-body text-xs text-ink/50 mb-2 leading-relaxed">{machine.descricao}</p>
          )}
          <div className="flex flex-wrap gap-3 font-mono text-xs text-ink/50">
            <span className="text-harvest font-bold">{formatKz(machine.preco_diaria)}/dia</span>
            {machine.municipio && (
              <span className="flex items-center gap-1">
                <MapPin size={11} /> {machine.municipio}, {machine.provincia}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={handleToggle}
            disabled={toggling}
            title={machine.disponivel ? "Marcar como indisponível" : "Marcar como disponível"}
            className={`flex items-center gap-1 font-mono text-xs rounded-sm px-2 py-1 border transition-colors ${
              machine.disponivel
                ? "border-green-500/30 text-green-600 bg-green-50"
                : "border-field/20 text-ink/40 bg-field/5"
            }`}
          >
            {machine.disponivel
              ? <><ToggleRight size={14} /> Disponível</>
              : <><ToggleLeft size={14} /> Indisponível</>
            }
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(true)}
              className="text-ink/40 hover:text-field transition-colors"
              title="Editar máquina"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-earth/60 hover:text-earth transition-colors disabled:opacity-40"
              title="Remover máquina"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Rental Card ----
function RentalCard({ rental, machines, token, onUpdated }: {
  rental: MachineRental;
  machines: Machine[];
  token: string;
  onUpdated: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const machine = machines.find(m => m.id === rental.maquina_id);
  const sc = statusConfig[rental.status] ?? statusConfig.pendente;

  const days = Math.ceil(
    (new Date(rental.data_fim).getTime() - new Date(rental.data_inicio).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  async function handleStatus(newStatus: MachineRentalStatus) {
    setLoading(true);
    setError(null);
    try {
      await updateMachineRentalStatus(token, rental.id, newStatus);
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
          <p className="font-display text-base text-field mb-1">
            {machine ? machine.nome : "Máquina"}
          </p>
          <div className="flex flex-wrap gap-3 font-mono text-xs text-ink/50">
            <span>📅 {formatDate(rental.data_inicio)} → {formatDate(rental.data_fim)}</span>
            <span>🗓️ {days} dia{days !== 1 ? "s" : ""}</span>
            {rental.valor_total && (
              <span className="text-harvest font-bold">{formatKz(rental.valor_total)} total</span>
            )}
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
          {rental.valor_total && (
            <div className="grid grid-cols-3 gap-3 bg-field/5 border border-field/15 p-4 rounded-sm font-mono text-sm">
              <div>
                <p className="text-xs text-ink/40 uppercase tracking-wider mb-0.5">Total</p>
                <p className="text-field font-bold">{formatKz(rental.valor_total)}</p>
              </div>
              <div>
                <p className="text-xs text-ink/40 uppercase tracking-wider mb-0.5">Comissão (10%)</p>
                <p className="text-harvest">{formatKz(rental.valor_comissao)}</p>
              </div>
              <div>
                <p className="text-xs text-ink/40 uppercase tracking-wider mb-0.5">Recebe</p>
                <p className="text-earth font-bold">
                  {formatKz(
                    rental.valor_liquido_proprietario ??
                    (rental.valor_total && rental.valor_comissao
                      ? (parseFloat(String(rental.valor_total)) - parseFloat(String(rental.valor_comissao)))
                      : null)
                  )}
                </p>
              </div>
            </div>
          )}

          {error && <p className="text-earth font-body text-sm">{error}</p>}

          <div className="flex flex-wrap gap-2">
            {rental.status === "pendente" && (
              <>
                <button
                  onClick={() => handleStatus("confirmado")}
                  disabled={loading}
                  className="btn-harvest rounded-sm text-xs disabled:opacity-50"
                >
                  <CheckCircle size={13} />
                  {loading ? "..." : "Confirmar reserva"}
                </button>
                <button
                  onClick={() => handleStatus("cancelado")}
                  disabled={loading}
                  className="text-xs rounded-sm px-3 py-1.5 border border-earth/30 text-earth hover:bg-earth/5 transition-colors disabled:opacity-50"
                >
                  <XCircle size={13} />
                  Rejeitar
                </button>
              </>
            )}
            {rental.status === "confirmado" && (
              <>
                <button
                  onClick={() => handleStatus("em_andamento")}
                  disabled={loading}
                  className="btn-primary rounded-sm text-xs disabled:opacity-50"
                >
                  <Wrench size={13} />
                  {loading ? "..." : "Iniciar utilização"}
                </button>
                <button
                  onClick={() => handleStatus("cancelado")}
                  disabled={loading}
                  className="text-xs rounded-sm px-3 py-1.5 border border-earth/30 text-earth hover:bg-earth/5 transition-colors disabled:opacity-50"
                >
                  <XCircle size={13} />
                  Cancelar
                </button>
              </>
            )}
            {rental.status === "em_andamento" && (
              <button
                onClick={() => handleStatus("concluido")}
                disabled={loading}
                className="btn-primary rounded-sm text-xs disabled:opacity-50"
              >
                <CheckCircle size={13} />
                {loading ? "..." : "Marcar como concluído"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
