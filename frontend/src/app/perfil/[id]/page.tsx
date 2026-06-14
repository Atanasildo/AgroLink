"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  Star, MapPin, BadgeCheck, Calendar, MessageSquare, Edit2, Save, X,
  Phone, Mail, Truck, Wrench, Leaf, ShoppingCart, Shield,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  ApiError, Rating, User, UserRatingSummary,
  createRating, getUser, getUserRatingSummary, getUserRatings,
  updateMyProfile,
} from "@/lib/api";
import { useAutoRetry } from "@/lib/useAutoRetry";
import { PROVINCIAS, getMunicipios } from "@/lib/angola";

const roleLabels: Record<string, { label: string; icon: typeof Leaf; color: string }> = {
  agricultor:            { label: "Agricultor",           icon: Leaf,        color: "text-green-700 bg-green-50 border-green-200" },
  comprador:             { label: "Comprador",             icon: ShoppingCart, color: "text-blue-700 bg-blue-50 border-blue-200" },
  transportador:         { label: "Transportador",         icon: Truck,       color: "text-amber-700 bg-amber-50 border-amber-200" },
  proprietario_maquinas: { label: "Proprietário de Máquinas", icon: Wrench,  color: "text-purple-700 bg-purple-50 border-purple-200" },
  admin:                 { label: "Administrador",         icon: Shield,      color: "text-red-700 bg-red-50 border-red-200" },
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

function ClickableStars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button type="button" key={i} onClick={() => onChange(i)}>
          <Star size={22} className={i <= value ? "text-harvest fill-harvest" : "text-ink/20"} />
        </button>
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
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [editing, setEditing] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const profileData = await getUser(profileId);
      setProfile(profileData);
      try {
        const [sum, rats] = await Promise.all([
          getUserRatingSummary(profileId),
          getUserRatings(profileId),
        ]);
        setSummary(sum);
        setRatings(rats);
      } catch {
        setSummary({ media_geral: 0, total_avaliacoes: 0 });
        setRatings([]);
      }
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 0
          ? "O servidor está a acordar (~30s). Aguarde e recarregue a página."
          : "Não foi possível carregar este perfil."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [profileId]);
  useAutoRetry(!!error, load);

  const isOwnProfile = currentUser?.id === profileId;
  const roleInfo = profile ? (roleLabels[profile.role] ?? { label: profile.role, icon: Shield, color: "text-ink/60 bg-field/5 border-field/20" }) : null;

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
        <div className="field-card text-center py-16 rounded-sm border-l-4 border-alert">
          <p className="font-display text-2xl text-field mb-2">Perfil não encontrado</p>
          <p className="font-body text-ink/50 mb-6">{error ?? "Este utilizador não existe."}</p>
          <div className="flex justify-center gap-2">
            <button onClick={load} className="btn-primary rounded-sm text-sm">🔄 Tentar novamente</button>
            <a href="/" className="btn-secondary rounded-sm text-sm">← Voltar ao início</a>
          </div>
        </div>
      </div>
    );
  }

  const RoleIcon = roleInfo!.icon;

  return (
    <div>
      {/* Hero header */}
      <div className="border-b border-field/15 bg-sky-light">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-medium mb-3 ${roleInfo!.color}`}>
                <RoleIcon size={12} />
                {roleInfo!.label}
              </div>
              <h1 className="text-4xl text-field leading-tight">{profile.nome}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-3">
                {(profile.provincia || profile.municipio) && (
                  <span className="flex items-center gap-1 font-mono text-xs text-ink/50">
                    <MapPin size={12} className="text-field" />
                    {[profile.municipio, profile.provincia].filter(Boolean).join(", ")}
                  </span>
                )}
                <span className="flex items-center gap-1 font-mono text-xs text-ink/50">
                  <Calendar size={12} className="text-field" />
                  Membro desde {new Date(profile.criado_em).toLocaleDateString("pt-AO", { year: "numeric", month: "long" })}
                </span>
              </div>
            </div>

            {/* Rating badge */}
            {summary && summary.total_avaliacoes > 0 && (
              <div className="field-card rounded-sm text-center px-5 py-3 flex-shrink-0">
                <p className="font-display text-3xl text-field">{summary.media_geral.toFixed(1)}</p>
                <Stars value={summary.media_geral} size={14} />
                <p className="font-mono text-xs text-ink/40 mt-1">{summary.total_avaliacoes} avaliação{summary.total_avaliacoes !== 1 ? "ões" : ""}</p>
              </div>
            )}
          </div>

          {profile.bio && (
            <p className="font-body text-ink/60 mt-5 leading-relaxed max-w-xl">{profile.bio}</p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-10 space-y-10">

        {/* Edit or view profile info */}
        {isOwnProfile && editing && token ? (
          <EditProfileForm
            profile={profile}
            token={token}
            onSaved={(updated) => {
              setProfile(updated);
              // profile updated locally
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <section className="field-card rounded-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="label-eyebrow">Informações de contacto</p>
              {isOwnProfile && (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 font-mono text-xs text-ink/50 hover:text-field transition-colors"
                >
                  <Edit2 size={13} /> Editar perfil
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-field/10 flex items-center justify-center flex-shrink-0">
                  <Mail size={14} className="text-field/60" />
                </div>
                <div>
                  <p className="font-mono text-xs text-ink/40 uppercase tracking-wider">Email</p>
                  <p className="font-body text-sm text-field">{profile.email}</p>
                </div>
              </div>
              {profile.telefone ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-field/10 flex items-center justify-center flex-shrink-0">
                    <Phone size={14} className="text-field/60" />
                  </div>
                  <div>
                    <p className="font-mono text-xs text-ink/40 uppercase tracking-wider">Telefone</p>
                    <p className="font-body text-sm text-field">{profile.telefone}</p>
                  </div>
                </div>
              ) : isOwnProfile ? (
                <div className="flex items-center gap-3 opacity-40">
                  <div className="w-8 h-8 rounded-full bg-field/10 flex items-center justify-center flex-shrink-0">
                    <Phone size={14} className="text-field/60" />
                  </div>
                  <div>
                    <p className="font-mono text-xs text-ink/40 uppercase tracking-wider">Telefone</p>
                    <p className="font-body text-sm text-ink/40 italic">Não definido</p>
                  </div>
                </div>
              ) : null}
            </div>

            {!profile.bio && isOwnProfile && (
              <div className="mt-4 pt-4 border-t border-field/10">
                <p className="font-body text-xs text-ink/40 italic">Adicione uma bio para apresentar o seu negócio aos outros utilizadores.</p>
              </div>
            )}
          </section>
        )}

        {/* Ratings section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl text-field flex items-center gap-2">
              <Star size={18} className="text-harvest" />
              Avaliações
              {summary && summary.total_avaliacoes > 0 && (
                <span className="font-mono text-sm text-ink/40">({summary.total_avaliacoes})</span>
              )}
            </h2>
            {!isOwnProfile && token && !showRatingForm && (
              <button
                onClick={() => setShowRatingForm(true)}
                className="btn-primary rounded-sm text-xs"
              >
                <MessageSquare size={13} /> Avaliar
              </button>
            )}
          </div>

          {showRatingForm && token && (
            <RatingForm
              token={token}
              avaliadoId={profileId}
              onSubmitted={() => { setShowRatingForm(false); load(); }}
              onCancel={() => setShowRatingForm(false)}
            />
          )}

          {ratings.length === 0 && !showRatingForm ? (
            <div className="field-card text-center py-10 rounded-sm">
              <Star size={28} className="text-field/20 mx-auto mb-3" />
              <p className="font-display text-xl text-field mb-1">Sem avaliações ainda</p>
              <p className="font-body text-ink/45 text-sm">
                {isOwnProfile
                  ? "As avaliações de outros utilizadores aparecerão aqui."
                  : "Seja o primeiro a avaliar este utilizador."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {ratings.map((rating) => (
                <RatingCard key={rating.id} rating={rating} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ---- Edit Profile Form ----
function EditProfileForm({ profile, token, onSaved, onCancel }: {
  profile: User;
  token: string;
  onSaved: (u: User) => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState(profile.nome);
  const [telefone, setTelefone] = useState(profile.telefone ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [provincia, setProvincia] = useState(profile.provincia ?? "");
  const [municipio, setMunicipio] = useState(profile.municipio ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const updated = await updateMyProfile(token, {
        nome,
        telefone: telefone || undefined,
        bio: bio || undefined,
        provincia: provincia || undefined,
        municipio: municipio || undefined,
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Erro ao guardar perfil.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="field-card rounded-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="label-eyebrow">Editar perfil</p>
        <button type="button" onClick={onCancel} className="text-ink/40 hover:text-field transition-colors">
          <X size={16} />
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Nome completo</span>
          <input required value={nome} onChange={e => setNome(e.target.value)} className="field-input rounded-sm" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Telefone</span>
          <input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="+244 9xx xxx xxx" className="field-input rounded-sm" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Província</span>
          <select value={provincia} onChange={e => { setProvincia(e.target.value); setMunicipio(""); }} className="field-input rounded-sm">
            <option value="">Selecionar...</option>
            {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Município</span>
          <select value={municipio} onChange={e => setMunicipio(e.target.value)} className="field-input rounded-sm" disabled={!provincia}>
            <option value="">Selecionar...</option>
            {provincia && getMunicipios(provincia).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Bio (apresentação do negócio)</span>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Descreva o seu negócio, especialidade, anos de experiência..." className="field-input rounded-sm resize-none" />
        </label>
      </div>
      {error && <p className="text-earth font-body text-sm mt-3">{error}</p>}
      <div className="flex gap-2 mt-4">
        <button type="submit" disabled={loading} className="btn-harvest rounded-sm disabled:opacity-50">
          <Save size={14} />
          {loading ? "A guardar..." : "Guardar perfil"}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary rounded-sm">
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ---- Rating Card ----
function RatingCard({ rating }: { rating: Rating }) {
  return (
    <div className="field-card rounded-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Stars value={rating.nota} size={14} />
            <span className="font-mono text-xs text-ink/40">
              {new Date(rating.criado_em).toLocaleDateString("pt-AO")}
            </span>
          </div>
          {rating.comentario && (
            <p className="font-body text-sm text-ink/70 leading-relaxed">{rating.comentario}</p>
          )}
          {(rating.confianca || rating.qualidade || rating.pontualidade || rating.atendimento) && (
            <div className="flex flex-wrap gap-3 mt-3">
              {rating.confianca && (
                <span className="font-mono text-xs text-ink/50">Confiança: <span className="text-field">{rating.confianca}/5</span></span>
              )}
              {rating.qualidade && (
                <span className="font-mono text-xs text-ink/50">Qualidade: <span className="text-field">{rating.qualidade}/5</span></span>
              )}
              {rating.pontualidade && (
                <span className="font-mono text-xs text-ink/50">Pontualidade: <span className="text-field">{rating.pontualidade}/5</span></span>
              )}
              {rating.atendimento && (
                <span className="font-mono text-xs text-ink/50">Atendimento: <span className="text-field">{rating.atendimento}/5</span></span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Rating Form ----
function RatingForm({ token, avaliadoId, onSubmitted, onCancel }: {
  token: string;
  avaliadoId: string;
  onSubmitted: () => void;
  onCancel: () => void;
}) {
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
        avaliado_id: avaliadoId, nota, confianca, qualidade, pontualidade, atendimento,
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
    <form onSubmit={handleSubmit} className="field-card rounded-sm border-harvest/30 mb-4">
      <div className="flex items-center justify-between mb-4">
        <p className="label-eyebrow">Deixar avaliação</p>
        <button type="button" onClick={onCancel} className="text-ink/40 hover:text-field transition-colors">
          <X size={16} />
        </button>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 mb-4">
        {criteria.map(([label, value, setValue]) => (
          <label key={label} className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-ink/50">{label}</span>
            <ClickableStars value={value} onChange={setValue} />
          </label>
        ))}
      </div>
      <label className="flex flex-col gap-2 mb-4">
        <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Comentário (opcional)</span>
        <textarea value={comentario} onChange={e => setComentario(e.target.value)} rows={3}
          placeholder="Partilhe a sua experiência com este utilizador..."
          className="field-input rounded-sm resize-none" />
      </label>
      {error && <p className="text-earth font-body text-sm mb-3">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="btn-harvest rounded-sm disabled:opacity-50">
          {loading ? "A enviar..." : "Enviar avaliação"}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary rounded-sm">
          Cancelar
        </button>
      </div>
    </form>
  );
}
