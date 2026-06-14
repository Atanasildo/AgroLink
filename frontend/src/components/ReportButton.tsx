"use client";

import { useState, FormEvent } from "react";
import { Flag, X, AlertTriangle, CheckCircle } from "lucide-react";
import { createReport, ReportReason, ApiError } from "@/lib/api";

const MOTIVOS: { value: ReportReason; label: string; desc: string }[] = [
  { value: "fraude",               label: "🚨 Fraude",                desc: "Tentativa de burla ou enganar outros utilizadores" },
  { value: "produto_falso",        label: "📦 Produto falso",          desc: "Produto anunciado não corresponde à realidade" },
  { value: "comportamento_abusivo",label: "⚠️ Comportamento abusivo",  desc: "Linguagem ofensiva, ameaças ou assédio" },
  { value: "spam",                 label: "🔁 Spam",                   desc: "Publicações repetidas ou conteúdo irrelevante" },
  { value: "outro",                label: "📝 Outro motivo",           desc: "Outro problema não listado acima" },
];

export function ReportButton({
  token,
  denunciadoId,
  denunciadoNome,
}: {
  token: string;
  denunciadoId: string;
  denunciadoNome: string;
}) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState<ReportReason | "">("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleClose() {
    setOpen(false);
    setMotivo("");
    setDescricao("");
    setError(null);
    setSuccess(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!motivo) return;
    setError(null);
    setLoading(true);
    try {
      await createReport(token, {
        denunciado_id: denunciadoId,
        motivo: motivo as ReportReason,
        descricao: descricao.trim() || undefined,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Não foi possível enviar a denúncia.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 font-mono text-xs text-ink/40 hover:text-earth transition-colors"
        title="Denunciar este utilizador"
      >
        <Flag size={13} />
        Denunciar
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="bg-white rounded-sm shadow-2xl w-full max-w-md border border-field/15">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-field/10">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-earth" />
                <p className="font-display text-lg text-field">Denunciar utilizador</p>
              </div>
              <button onClick={handleClose} className="text-ink/40 hover:text-field transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5">
              {success ? (
                /* Success state */
                <div className="text-center py-6">
                  <CheckCircle size={36} className="text-green-600 mx-auto mb-3" />
                  <p className="font-display text-xl text-field mb-2">Denúncia enviada</p>
                  <p className="font-body text-sm text-ink/50 mb-5">
                    A equipa do AgroLink irá analisar esta denúncia e tomar as medidas necessárias.
                    Obrigado por ajudar a manter a plataforma segura.
                  </p>
                  <button onClick={handleClose} className="btn-primary rounded-sm text-sm">
                    Fechar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <p className="font-body text-sm text-ink/60">
                    Estás a denunciar <span className="text-field font-medium">{denunciadoNome}</span>.
                    A denúncia será analisada pela equipa AgroLink.
                  </p>

                  {/* Motivo */}
                  <div className="space-y-2">
                    <p className="font-mono text-xs uppercase tracking-wider text-ink/50">Motivo da denúncia *</p>
                    {MOTIVOS.map(m => (
                      <label
                        key={m.value}
                        className={`flex items-start gap-3 p-3 rounded-sm border cursor-pointer transition-colors ${
                          motivo === m.value
                            ? "border-earth/50 bg-earth/5"
                            : "border-field/15 hover:border-field/30"
                        }`}
                      >
                        <input
                          type="radio"
                          name="motivo"
                          value={m.value}
                          checked={motivo === m.value}
                          onChange={() => setMotivo(m.value)}
                          className="mt-0.5 accent-earth flex-shrink-0"
                        />
                        <div>
                          <p className="font-body text-sm text-field">{m.label}</p>
                          <p className="font-body text-xs text-ink/45">{m.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Descrição opcional */}
                  <div>
                    <label className="font-mono text-xs uppercase tracking-wider text-ink/50 block mb-2">
                      Descrição adicional (opcional)
                    </label>
                    <textarea
                      value={descricao}
                      onChange={e => setDescricao(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="Descreve o que aconteceu com mais detalhe..."
                      className="field-input rounded-sm resize-none w-full text-sm"
                    />
                    <p className="font-mono text-xs text-ink/30 text-right mt-1">{descricao.length}/500</p>
                  </div>

                  {error && (
                    <p className="text-earth font-body text-sm flex items-center gap-1.5">
                      <AlertTriangle size={14} /> {error}
                    </p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={!motivo || loading}
                      className="btn-harvest rounded-sm disabled:opacity-50 flex-1"
                      style={{ background: "#c0392b", borderColor: "#c0392b" }}
                    >
                      {loading ? "A enviar..." : "Enviar denúncia"}
                    </button>
                    <button type="button" onClick={handleClose} className="btn-secondary rounded-sm">
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
