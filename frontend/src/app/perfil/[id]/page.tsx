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
      const profileData = await getUser(profileId);
      setProfile(profileData);
      // Ratings desabilitados temporariamente
      setSummary({ media_geral: 0, total_avaliacoes: 0 });
      setRatings([]);
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
    const is500 = error?.includes("Erro interno");
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="field-card text-center py-16 rounded-sm border-l-4 border-alert">
          <p className="font-display text-2xl text-field mb-2">
            {is500 ? "Servidor indisponível" : "Perfil não encontrado"}
          </p>
          <p className="font-body text-ink/50 mb-6">
            {error ?? "Este utilizador não existe."}
          </p>
          <div className="flex justify-center gap-2">
            <button onClick={load} className="btn-primary rounded-sm text-sm">
              🔄 Tentar novamente
            </button>
            <a href="/" className="btn-secondary rounded-sm text-sm">
              ← Voltar ao início
            </a>
          </div>
          {is500 && (
            <p className="font-mono text-xs text-ink/40 mt-4 p-2 bg-field/5 rounded">
              Se o problema persistir, contacte support@agrolink.ao
            </p>
          )}
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

      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Aviso temporário */}
        <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-sm mb-6">
          <p className="font-mono text-xs text-amber-700">
            ⚠️ Módulo de avaliações temporariamente em manutenção
          </p>
        </div>

        <p className="font-body text-ink/60">
          Este perfil foi carregado com sucesso. Os detalhes de avaliações, histórico de transações e reputação serão adicionados em breve.
        </p>
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
