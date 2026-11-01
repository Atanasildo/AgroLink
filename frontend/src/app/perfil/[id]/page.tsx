"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  User, MapPin, Star, Package, Truck, Wrench, MessageCircle,
  CheckCircle, Calendar, Flag, ChevronRight, Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getUser, getUserRatings, getUserRatingSummary, getMe,
  listProducts, myMachines, myTransportRequests, updateMyProfile,
  User as ApiUser, Rating, UserRatingSummary, Product, Machine,
  TransportRequestItem, ApiError, createRating,
} from "@/lib/api";
import { ReportButton } from "@/components/ReportButton";

// ─── helpers ─────────────────────────────────────────────────────────────────

const roleLabel: Record<string, string> = {
  agricultor:            "🌾 Agricultor",
  comprador:             "🛒 Comprador",
  transportador:         "🚛 Transportador",
  proprietario_maquinas: "⚙️ Prop. de Máquinas",
  admin:                 "🛡️ Administrador",
};

function StarRow({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={13}
          className={i < Math.round(value) ? "text-harvest fill-harvest" : "text-ink/20"}
        />
      ))}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-AO", { month: "short", year: "numeric" });
}

// ─── Rating Form ─────────────────────────────────────────────────────────────

function RatingForm({
  token,
  avaliadoId,
  onDone,
}: {
  token: string;
  avaliadoId: string;
  onDone: () => void;
}) {
  const [nota, setNota] = useState(5);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      await createRating(token, {
        avaliado_id: avaliadoId,
        nota,
        comentario: comentario.trim() || undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Erro ao enviar avaliação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="field-card rounded-sm space-y-4">
      <p className="label-eyebrow">Deixar avaliação</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNota(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
          >
            <Star
              size={28}
              className={(hover || nota) >= n ? "text-harvest fill-harvest" : "text-ink/20"}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="Comentário opcional..."
        className="field-input rounded-sm resize-none text-sm"
      />
      {error && <p className="text-earth text-sm font-body">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="btn-harvest rounded-sm text-xs disabled:opacity-50"
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Star size={13} />}
        {loading ? "A enviar..." : "Enviar avaliação"}
      </button>
    </div>
  );
}

// ─── Edit Profile Form ────────────────────────────────────────────────────────

function EditProfileForm({
  user,
  token,
  onSaved,
}: {
  user: ApiUser;
  token: string;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(user.nome);
  const [bio, setBio] = useState(user.bio ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      await updateMyProfile(token, { nome, bio: bio || undefined });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Erro ao guardar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="field-card rounded-sm space-y-4">
      <p className="label-eyebrow">Editar perfil</p>
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Nome</span>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="field-input rounded-sm text-sm"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Bio</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={500}
          className="field-input rounded-sm text-sm resize-none"
          placeholder="Conta um pouco sobre ti..."
        />
      </label>
      {error && <p className="text-earth text-sm font-body">{error}</p>}
      <button
        onClick={handleSave}
        disabled={loading}
        className="btn-primary rounded-sm text-xs disabled:opacity-50"
      >
        {loading ? "A guardar..." : "Guardar"}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const { id } = useParams<{ id: string }>();
  const { user: authUser, token } = useAuth();
  const router = useRouter();

  const isOwn = authUser?.id === id;

  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [summary, setSummary] = useState<UserRatingSummary | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [requests, setRequests] = useState<TransportRequestItem[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showRatingForm, setShowRatingForm] = useState(false);

  async function loadProfile() {
    setLoadingProfile(true);
    try {
      const [p, s, r] = await Promise.all([
        getUser(id),
        getUserRatingSummary(id),
        getUserRatings(id),
      ]);
      setProfile(p as ApiUser);
      setSummary(s);
      setRatings(r);
    } catch {
      router.replace("/");
    } finally {
      setLoadingProfile(false);
    }
  }

  async function loadActivity() {
    if (!token) return;
    try {
      if (isOwn) {
        const [prods, reqs] = await Promise.all([
          listProducts({ limit: "6" }),
          myTransportRequests(token),
        ]);
        // filter own products
        setProducts((prods as Product[]).filter((p) => p.agricultor_id === id).slice(0, 6));
        setRequests((reqs as TransportRequestItem[]).slice(0, 5));
      }
    } catch { /* silent */ }
  }

  async function loadOwnerMachines() {
    if (!token || !isOwn || authUser?.role !== "proprietario_maquinas") return;
    try {
      const m = await myMachines(token);
      setMachines(m.slice(0, 4));
    } catch { /* silent */ }
  }

  useEffect(() => {
    if (!id) return;
    loadProfile();
    loadActivity();
    loadOwnerMachines();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="text-field/40 animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const memberSince = formatDate(profile.criado_em ?? new Date().toISOString());
  const canRate = !isOwn && !!token && !!authUser;

  return (
    <div>
      {/* ── Hero ── */}
      <div className="border-b border-field/15 bg-gradient-to-r from-field/5 to-field/10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 bg-field/15 border-2 border-field/20 rounded-full flex items-center justify-center flex-shrink-0 relative">
              {profile.foto_perfil_url ? (
                <img
                  src={profile.foto_perfil_url}
                  alt={profile.nome}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="font-display text-3xl text-field">
                  {profile.nome[0].toUpperCase()}
                </span>
              )}
              {profile.is_online && (
                <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 border-2 border-cream rounded-full" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-3xl text-field">{profile.nome}</h1>
                {profile.email_verificado && (
                  <span title="Email verificado">
                    <CheckCircle size={16} className="text-green-600" />
                  </span>
                )}
              </div>
              <p className="font-mono text-xs uppercase tracking-wider text-ink/50 mb-2">
                {roleLabel[profile.role] ?? profile.role}
              </p>
              {profile.provincia && (
                <p className="flex items-center gap-1 font-body text-sm text-ink/50 mb-2">
                  <MapPin size={13} className="text-field" />
                  {profile.municipio ? `${profile.municipio}, ` : ""}
                  {profile.provincia}
                </p>
              )}
              {profile.bio && (
                <p className="font-body text-sm text-ink/70 max-w-xl leading-relaxed">
                  {profile.bio}
                </p>
              )}
              <p className="font-mono text-xs text-ink/35 mt-2 flex items-center gap-1">
                <Calendar size={11} /> Membro desde {memberSince}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              {isOwn && (
                <button
                  onClick={() => setEditing((v) => !v)}
                  className="btn-secondary rounded-sm text-xs"
                >
                  <User size={13} />
                  {editing ? "Cancelar" : "Editar perfil"}
                </button>
              )}
              {!isOwn && token && (
                <Link
                  href={`/chat?with=${id}`}
                  className="btn-primary rounded-sm text-xs"
                >
                  <MessageCircle size={13} /> Enviar mensagem
                </Link>
              )}
              {!isOwn && token && authUser && (
                <ReportButton
                  token={token}
                  denunciadoId={id}
                  denunciadoNome={profile.nome}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-10">
        {/* ── Edit form ── */}
        {isOwn && editing && (
          <EditProfileForm
            user={authUser!}
            token={token!}
            onSaved={() => {
              setEditing(false);
              loadProfile();
            }}
          />
        )}

        {/* ── Rating summary ── */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="field-card rounded-sm text-center">
            <p className="font-display text-4xl text-harvest mb-1">
              {summary ? summary.media_geral.toFixed(1) : "—"}
            </p>
            <StarRow value={summary?.media_geral ?? 0} />
            <p className="font-mono text-xs text-ink/40 mt-1 uppercase tracking-wider">
              {summary?.total_avaliacoes ?? 0} avaliações
            </p>
          </div>
          <div className="field-card rounded-sm text-center">
            <CheckCircle size={24} className="text-green-600 mx-auto mb-1" />
            <p className="font-body text-sm text-ink/60">
              {profile.email_verificado ? "Email verificado" : "Email não verificado"}
            </p>
            <p className="font-body text-xs text-ink/40 mt-0.5">
              {profile.telefone_verificado ? "Telemóvel verificado" : "Telemóvel não verificado"}
            </p>
          </div>
          <div className="field-card rounded-sm text-center">
            <p className="font-display text-4xl text-field mb-1">{products.length || "—"}</p>
            <p className="font-mono text-xs text-ink/40 uppercase tracking-wider">
              {profile.role === "transportador" ? "Rotas publicadas" :
               profile.role === "proprietario_maquinas" ? "Máquinas registadas" :
               "Produtos publicados"}
            </p>
          </div>
        </div>

        {/* ── Own activity: products ── */}
        {isOwn && products.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <p className="label-eyebrow flex items-center gap-1.5">
                <Package size={13} /> Os meus produtos
              </p>
              <Link href="/marketplace" className="font-mono text-xs text-field hover:underline flex items-center gap-1">
                Ver todos <ChevronRight size={12} />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {products.map((p) => (
                <div key={p.id} className="field-card rounded-sm flex justify-between items-center gap-3">
                  <div>
                    <p className="font-body text-sm text-field font-medium">{p.nome}</p>
                    <p className="font-mono text-xs text-ink/50">
                      {Number(p.preco).toLocaleString("pt-AO")} Kz/{p.unidade}
                    </p>
                    <p className="font-mono text-xs text-ink/35">{p.municipio}, {p.provincia}</p>
                  </div>
                  <span className={`status-badge ${p.ativo ? "active" : "done"} text-[10px]`}>
                    {p.ativo ? "Activo" : "Inactivo"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Own activity: machines (proprietário) ── */}
        {isOwn && authUser?.role === "proprietario_maquinas" && machines.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <p className="label-eyebrow flex items-center gap-1.5">
                <Wrench size={13} /> As minhas máquinas
              </p>
              <Link href="/maquinas" className="font-mono text-xs text-field hover:underline flex items-center gap-1">
                Gerir <ChevronRight size={12} />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {machines.map((m) => (
                <div key={m.id} className="field-card rounded-sm flex justify-between items-center gap-3">
                  <div>
                    <p className="font-body text-sm text-field font-medium">{m.nome}</p>
                    <p className="font-mono text-xs text-ink/50">
                      {Number(m.preco_diaria).toLocaleString("pt-AO")} Kz/dia
                    </p>
                  </div>
                  <span className={`status-badge ${m.disponivel ? "active" : "done"} text-[10px]`}>
                    {m.disponivel ? "Disponível" : "Indisponível"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Own activity: transport requests ── */}
        {isOwn && requests.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <p className="label-eyebrow flex items-center gap-1.5">
                <Truck size={13} /> Pedidos de transporte
              </p>
              <Link href="/transporte" className="font-mono text-xs text-field hover:underline flex items-center gap-1">
                Ver todos <ChevronRight size={12} />
              </Link>
            </div>
            <div className="space-y-2">
              {requests.map((r) => (
                <div key={r.id} className="field-card rounded-sm flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-body text-sm text-field">{r.produto}</p>
                    <p className="font-mono text-xs text-ink/50">
                      {r.origem} → {r.destino} · {r.peso_toneladas}t
                    </p>
                  </div>
                  <span className={`status-badge text-[10px] ${
                    r.status === "concluido" ? "done" :
                    r.status === "cancelado" ? "done" :
                    r.status === "pendente" ? "pending" : "active"
                  }`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Rating form (outros utilizadores) ── */}
        {canRate && (
          <section>
            {showRatingForm ? (
              <RatingForm
                token={token!}
                avaliadoId={id}
                onDone={() => {
                  setShowRatingForm(false);
                  loadProfile();
                }}
              />
            ) : (
              <button
                onClick={() => setShowRatingForm(true)}
                className="btn-secondary rounded-sm text-xs"
              >
                <Star size={13} /> Avaliar este utilizador
              </button>
            )}
          </section>
        )}

        {/* ── Ratings list ── */}
        {ratings.length > 0 && (
          <section>
            <p className="label-eyebrow mb-4 flex items-center gap-1.5">
              <Star size={13} /> Avaliações recebidas
            </p>
            <div className="space-y-3">
              {ratings.map((r) => (
                <div key={r.id} className="field-card rounded-sm">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <StarRow value={r.nota} />
                    <span className="font-mono text-xs text-ink/30">
                      {formatDate(r.criado_em)}
                    </span>
                  </div>
                  {r.comentario && (
                    <p className="font-body text-sm text-ink/70 leading-relaxed">{r.comentario}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {ratings.length === 0 && !isOwn && (
          <div className="field-card rounded-sm text-center py-8">
            <Star size={28} className="text-ink/20 mx-auto mb-2" />
            <p className="font-body text-sm text-ink/40">Ainda sem avaliações</p>
          </div>
        )}
      </div>
    </div>
  );
}
