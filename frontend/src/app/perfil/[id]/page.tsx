"use client";

import { useEffect, useState, FormEvent } from "react";
import { Star, MapPin, BadgeCheck, Calendar, MessageSquare } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  ApiError,
  Rating,
  User,
  UserRatingSummary,
  createRating,
  getUser,
  getUserRatingSummary,
  getUserRatings,
} from "@/lib/api";
import { useAutoRetry } from "@/lib/useAutoRetry";

const roleLabels: Record<string, string> = {
  agricultor: "🌱 Agricultor",
  comprador: "🛒 Comprador",
  transportador: "🚛 Transportador",
  proprietario_maquinas: "🚜 Proprietário de Máquinas",
  admin: "🛠️ Administrador",
};

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(value) ? "text-harvest fill-harvest" : "text-ink/20"}
        />
      ))}
    </div>
  );
}

export default function PerfilPage({ params }: { params: { id: string } }) {
  const { user: currentUser, token } = useAuth();
  const profileId = params.id;

  const [profile, setProfile] = useState<User | null>(null);
  const [summary, setSummary] = useState<UserRatingSummary | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [profileData, summaryData, ratingsData] = await Promise.all([
        getUser(profileId),
        getUserRatingSummary(profileId),
        getUserRatings(profileId),
      ]);
      setProfile(profileData);
      setSummary(summaryData);
      setRatings(ratingsData);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 0 ? "O servidor está a acordar (~30s). Aguarde e recarregue a página." : "Não foi possível carregar este perfil.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [profileId]);
  // Auto-retry quando o servidor acorda
  useAutoRetry(!!error, load);

  const isOwnProfile = currentUser?.id === profileId;

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center gap-2 font-mono text-sm text-field/60">
          <BadgeCheck size={16} className="animate-pulse" />
          A carregar perfil...
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="field-card text-center py-16 rounded-sm">
          <p className="font-display text-2xl text-field mb-2">Perfil não encontrado</p>
          <p className="font-body text-ink/50 mb-4">{error ?? "Este utilizador não existe."}</p>
          {error && <button onClick={load} className="btn-primary rounded-sm text-sm">🔄 Tentar novamente</button>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-field/15 bg-sky-light">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <p className="label-eyebrow mb-2">
            <BadgeCheck size={12} className="inline mr-1" />
            Módulo 10 · Perfil &amp; Avaliações
          </p>
          <h1 className="text-4xl text-field">{profile.nome}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <span className="crop-tag">{roleLabels[profile.role] ?? profile.role}</span>
            {(profile.provincia || profile.municipio) && (
              <span className="flex items-center gap-1 font-mono text-xs text-ink/50">
                <MapPin size={12} className="text-field" />
                {profile.municipio ? `${profile.municipio}, ` : ""}{profile.provincia}
              </span>
            )}
            <span className="flex items-center gap-1 font-mono text-xs text-ink/50">
              <Calendar size={12} className="text-field" />
              Desde {new Date(profile.criado_em).toLocaleDateString("pt-AO", { year: "numeric", month: "long" })}
            </span>
          </div>
          {profile.bio && <p className="font-body text-ink/60 mt-4 leading-relaxed">{profile.bio}</p>}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-10 flex flex-col gap-8">
        {/* Resumo de avaliações */}
        <div className="field-card rounded-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="label-eyebrow mb-2">Reputação</p>
            <div className="flex items-center gap-3">
              <p className="font-display text-3xl text-field">{summary?.media_geral.toFixed(1) ?? "0.0"}</p>
              <Stars value={summary?.media_geral ?? 0} size={20} />
            </div>
            <p className="font-mono text-xs text-ink/50 mt-1">
              {summary?.total_avaliacoes ?? 0} avaliação(ões)
            </p>
          </div>

          {!isOwnProfile && currentUser && token && (
            <button onClick={() => setShowForm(v => !v)} className="btn-primary rounded-sm">
              <MessageSquare size={16} /> {showForm ? "Cancelar" : "Avaliar"}
            </button>
          )}
        </div>

        {showForm && token && (
          <RatingForm
            token={token}
            avaliadoId={profile.id}
            onSubmitted={() => { setShowForm(false); load(); }}
          />
        )}

        {/* Lista de avaliações */}
        <div>
          <p className="label-eyebrow mb-4">Avaliações recebidas</p>
          {ratings.length === 0 ? (
            <div className="field-card text-center py-12 rounded-sm">
              <p className="font-body text-ink/50">Este utilizador ainda não recebeu avaliações.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {ratings.map((r) => (
                <div key={r.id} className="field-card rounded-sm">
                  <div className="flex items-center justify-between mb-2">
                    <Stars value={r.nota} />
                    <span className="font-mono text-xs text-ink/40">
                      {new Date(r.criado_em).toLocaleDateString("pt-AO")}
                    </span>
                  </div>
                  {r.comentario && <p className="font-body text-sm text-ink/70">{r.comentario}</p>}
                  <div className="flex flex-wrap gap-3 mt-2 font-mono text-[10px] uppercase tracking-wider text-ink/40">
                    {r.confianca && <span>Confiança: {r.confianca}/5</span>}
                    {r.qualidade && <span>Qualidade: {r.qualidade}/5</span>}
                    {r.pontualidade && <span>Pontualidade: {r.pontualidade}/5</span>}
                    {r.atendimento && <span>Atendimento: {r.atendimento}/5</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RatingForm({ token, avaliadoId, onSubmitted }: { token: string; avaliadoId: string; onSubmitted: () => void }) {
  const [nota, setNota] = useState(5);
  const [confianca, setConfianca] = useState(5);
  const [qualidade, setQualidade] = useState(5);
  const [pontualidade, setPontualidade] = useState(5);
  const [atendimento, setAtendimento] = useState(5);
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createRating(token, {
        avaliado_id: avaliadoId,
        nota,
        confianca,
        qualidade,
        pontualidade,
        atendimento,
        comentario: comentario || undefined,
      });
      onSubmitted();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Não foi possível enviar a avaliação.");
    } finally {
      setLoading(false);
    }
  }

  const criteria: [string, number, (v: number) => void][] = [
    ["Nota geral", nota, setNota],
    ["Confiança", confianca, setConfianca],
    ["Qualidade", qualidade, setQualidade],
    ["Pontualidade", pontualidade, setPontualidade],
    ["Atendimento", atendimento, setAtendimento],
  ];

  return (
    <form onSubmit={handleSubmit} className="field-card rounded-sm border-harvest/30 flex flex-col gap-4">
      <p className="label-eyebrow">Deixar avaliação</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {criteria.map(([label, value, setValue]) => (
          <label key={label} className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-ink/50">{label}</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button type="button" key={i} onClick={() => setValue(i)}>
                  <Star size={20} className={i <= value ? "text-harvest fill-harvest" : "text-ink/20"} />
                </button>
              ))}
            </div>
          </label>
        ))}
      </div>
      <label className="flex flex-col gap-2">
        <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Comentário (opcional)</span>
        <textarea value={comentario} onChange={e => setComentario(e.target.value)} rows={3}
          className="field-input rounded-sm" />
      </label>
      {error && <p className="text-earth font-body text-sm">{error}</p>}
      <div>
        <button type="submit" disabled={loading} className="btn-harvest rounded-sm disabled:opacity-50">
          {loading ? "A enviar..." : "Enviar avaliação"}
        </button>
      </div>
    </form>
  );
}
