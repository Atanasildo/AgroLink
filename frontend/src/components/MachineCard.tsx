"use client";

import { useState, FormEvent } from "react";
import { MapPin, Tractor, CalendarPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError, Machine, createMachineRental } from "@/lib/api";

const tipoLabels: Record<string, string> = {
  trator: "🚜 Trator",
  colheitadeira: "🌾 Colheitadeira",
  arado: "🔧 Arado",
  plantadora: "🌱 Plantadora",
  irrigacao: "💧 Sistema de irrigação",
  outros: "⚙️ Outros",
};

export function MachineCard({ machine }: { machine: Machine }) {
  const { user, token } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canRequest = user?.role === "agricultor" && token;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await createMachineRental(token, machine.id, { data_inicio: dataInicio, data_fim: dataFim });
      setSuccess("Reserva solicitada! Aguarde aprovação do proprietário.");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Não foi possível solicitar a reserva.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="field-card flex flex-col gap-3 hover:border-field/40 transition-colors rounded-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg text-field leading-tight">{machine.nome}</p>
          <span className="crop-tag mt-1">{tipoLabels[machine.tipo] ?? machine.tipo}</span>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-mono text-xl text-harvest font-bold">
            {Number(machine.preco_diaria).toLocaleString("pt-AO")} Kz
          </p>
          <p className="font-mono text-xs text-ink/50">/dia</p>
        </div>
      </div>

      {machine.descricao && (
        <p className="font-body text-sm text-ink/60 leading-relaxed">{machine.descricao}</p>
      )}

      <div className="h-px bg-field/10" />

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-ink/50">
        <span className="flex items-center gap-1">
          <MapPin size={11} className="text-field" />
          {machine.municipio ? `${machine.municipio}, ` : ""}{machine.provincia ?? "Angola"}
        </span>
        <span className={`flex items-center gap-1 ${machine.disponivel ? "text-field" : "text-earth"}`}>
          <Tractor size={11} />
          {machine.disponivel ? "Disponível" : "Indisponível"}
        </span>
      </div>

      {canRequest && machine.disponivel && (
        <>
          {!showForm ? (
            <button onClick={() => setShowForm(true)} className="btn-secondary rounded-sm justify-center">
              <CalendarPlus size={14} /> Solicitar aluguel
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-field/10 pt-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink/50">Início</span>
                  <input required type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                    className="field-input rounded-sm text-sm" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink/50">Fim</span>
                  <input required type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                    className="field-input rounded-sm text-sm" />
                </label>
              </div>
              {error && <p className="text-earth font-body text-xs">{error}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={loading} className="btn-harvest rounded-sm disabled:opacity-50 flex-1 justify-center">
                  {loading ? "A enviar..." : "Confirmar"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary rounded-sm">
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {success && <p className="text-field font-body text-xs">{success}</p>}
    </div>
  );
}
