"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  User, MapPin, Star, MessageCircle, ShieldCheck,
  Mail, Phone, Package, Leaf, ChevronLeft, Edit,
  CheckCircle, AlertCircle, Loader,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  ApiError,
  User as UserType,
  Rating,
  UserRatingSummary,
  Product,
  getUser,
  getUserRatings,
  getUserRatingSummary,
  getPublicProducts,
  createRating,
} from "@/lib/api";

const ROLE_LABELS: Record<string, string> = {
  agricultor: "Agricultor",
  comprador: "Comprador",
  transportador: "Transportador",
  proprietario_maquinas: "Proprietário de Máquinas",
  admin: "Administrador",
};

function StarRow({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="flex items-center gap-0.5">
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

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <span className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="p-0.5"
        >
          <Star
            size={20}
            className={i <= (hover || value) ? "text-harvest fill-harvest" : "text-ink/20"}
          />
        </button>
      ))}
    </span>
  );
}

export default function PerfilPage() {
  const { id } = useParams<{ id: string }>();
  const { user: me, token } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserType | null>(null);
  const [summary, setSummary] = useState<UserRatingSummary | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // rating form
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ratingMsg, setRatingMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const alreadyRated = ratings.some((r) => r.avaliador_id === me?.id);
  const isOwn = me?.id === id;

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [p, s, r] = await Promise.all([
        getUser(id),
        getUserRatingSummary(id),
        getUserRatings(id),
      ]);
      setProfile(p);
      setSummary(s);
      setRatings(r);
      if (p.role === "agricultor") {
        getPublicProducts(id)
          .then(setProducts)
          .catch(() => {});
      }
    } catch {
      setError("Não foi possível carregar este perfil.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleRating(e: React.FormEvent) {
    e.preventDefault();
    if (!token || nota < 1) return;
    setSubmitting(true);
    setRatingMsg(null);
    try {
      const r = await createRating(token, { avaliado_id: id, nota, comentario: comentario || undefined });
      setRatings((prev) => [r, ...prev]);
      setNota(0);
      setComentario("");
      setRatingMsg({ type: "ok", text: "Avaliação enviada." });
      getUserRatingSummary(id).then(setSummary).catch(() => {});
    } catch (err) {
      setRatingMsg({
        type: "err",
        text: err instanceof ApiError ? String(err.detail) : "Erro ao enviar avaliação.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size={24} className="text-field/40 animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <AlertCircle size={32} className="text-earth mx-auto mb-3" />
        <p className="font-body text-ink/60">{error ?? "Perfil não encontrado."}</p>
        <button onClick={() => router.back()} className="btn-secondary rounded-sm mt-4 mx-auto">
          <ChevronLeft size={14} /> Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
      {/* back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 font-mono text-xs text-ink/40 hover:text-field transition-colors mb-6"
      >
        <ChevronLeft size={14} /> Voltar
      </button>

      <div className="grid gap-8 sm:grid-cols-[280px_1fr]">
        {/* ── Coluna esquerda: cartão do perfil ── */}
        <aside className="space-y-4">
          <div className="field-card rounded-sm flex flex-col items-center text-center gap-3 py-6">
            {/* Avatar */}
            {profile.foto_perfil_url ? (
              <img
                src={profile.foto_perfil_url}
                alt={profile.nome}
                className="w-20 h-20 rounded-full object-cover border-2 border-field/20"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-field/10 border-2 border-field/20 flex items-center justify-center">
                <span className="font-display text-3xl text-field">
                  {profile.nome[0].toUpperCase()}
                </span>
              </div>
            )}

            <div>
              <h1 className="font-display text-xl text-field leading-tight">{profile.nome}</h1>
              <p className="font-mono text-xs text-ink/50 uppercase tracking-wider mt-0.5">
                {ROLE_LABELS[profile.role] ?? profile.role}
              </p>
            </div>

            {/* Localização */}
            {(profile.municipio || profile.provincia) && (
              <span className="flex items-center gap-1 font-mono text-xs text-ink/50">
                <MapPin size={11} className="text-field" />
                {[profile.municipio, profile.provincia].filter(Boolean).join(", ")}
              </span>
            )}

            {/* Verificações */}
            <div className="flex items-center gap-3 mt-1">
              <span
                className={`flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider ${
                  profile.email_verificado ? "text-green-600" : "text-ink/30"
                }`}
              >
                {profile.email_verificado ? (
                  <CheckCircle size={11} />
                ) : (
                  <AlertCircle size={11} />
                )}
                Email
              </span>
              <span
                className={`flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider ${
                  profile.telefone_verificado ? "text-green-600" : "text-ink/30"
                }`}
              >
                {profile.telefone_verificado ? (
                  <CheckCircle size={11} />
                ) : (
                  <AlertCircle size={11} />
                )}
                Telefone
              </span>
            </div>

            {/* Avaliação sumário */}
            {summary && summary.total_avaliacoes > 0 && (
              <div className="flex flex-col items-center gap-1 border-t border-field/10 pt-3 w-full">
                <StarRow value={summary.media_geral} />
                <p className="font-mono text-xs text-ink/50">
                  {summary.media_geral.toFixed(1)} · {summary.total_avaliacoes} avaliação
                  {summary.total_avaliacoes !== 1 ? "ões" : ""}
                </p>
              </div>
            )}

            {/* Acções */}
            <div className="flex flex-col gap-2 w-full mt-1">
              {isOwn ? (
                <Link href="/minha-conta" className="btn-primary rounded-sm justify-center text-xs">
                  <Edit size={13} /> Editar perfil
                </Link>
              ) : (
                token && (
                  <Link
                    href={`/chat?with=${profile.id}`}
                    className="btn-secondary rounded-sm justify-center text-xs"
                  >
                    <MessageCircle size={13} /> Enviar mensagem
                  </Link>
                )
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="field-card rounded-sm">
              <p className="label-eyebrow mb-2">Sobre</p>
              <p className="font-body text-sm text-ink/70 leading-relaxed">{profile.bio}</p>
            </div>
          )}
        </aside>

        {/* ── Coluna direita: conteúdo ── */}
        <div className="space-y-8">
          {/* Produtos (agricultor) */}
          {profile.role === "agricultor" && products.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <p className="label-eyebrow flex items-center gap-1.5">
                  <Leaf size={13} className="text-harvest" /> Produtos
                </p>
                <Link
                  href={`/marketplace?agricultor_id=${profile.id}`}
                  className="font-mono text-xs text-field hover:underline"
                >
                  Ver todos
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {products.map((p) => (
                  <div key={p.id} className="field-card rounded-sm flex items-start gap-3 py-3">
                    <Package size={16} className="text-harvest mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-display text-sm text-field leading-tight truncate">
                        {p.nome}
                      </p>
                      <p className="font-mono text-xs text-ink/50">
                        {Number(p.preco).toLocaleString("pt-AO")} Kz / {p.unidade}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Avaliações */}
          <section>
            <p className="label-eyebrow mb-3 flex items-center gap-1.5">
              <Star size={13} className="text-harvest" /> Avaliações
            </p>

            {/* Formulário de avaliação */}
            {token && !isOwn && !alreadyRated && (
              <form
                onSubmit={handleRating}
                className="field-card rounded-sm mb-4 bg-field/3"
              >
                <p className="font-mono text-xs uppercase tracking-wider text-ink/50 mb-3">
                  Deixar avaliação
                </p>
                <div className="flex flex-col gap-3">
                  <div>
                    <StarPicker value={nota} onChange={setNota} />
                  </div>
                  <textarea
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    rows={2}
                    placeholder="Comentário (opcional)"
                    className="field-input rounded-sm resize-none text-sm"
                    maxLength={1000}
                  />
                  {ratingMsg && (
                    <p
                      className={`flex items-center gap-1 font-mono text-xs ${
                        ratingMsg.type === "ok" ? "text-green-700" : "text-earth"
                      }`}
                    >
                      {ratingMsg.type === "ok" ? (
                        <CheckCircle size={11} />
                      ) : (
                        <AlertCircle size={11} />
                      )}
                      {ratingMsg.text}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting || nota < 1}
                    className="btn-harvest rounded-sm text-xs disabled:opacity-50 self-start"
                  >
                    {submitting ? "A enviar..." : "Enviar avaliação"}
                  </button>
                </div>
              </form>
            )}

            {alreadyRated && (
              <div className="flex items-center gap-1.5 font-mono text-xs text-green-700 mb-3">
                <CheckCircle size={12} /> Já avaliaste este utilizador.
              </div>
            )}

            {ratings.length === 0 ? (
              <div className="field-card rounded-sm text-center py-8">
                <Star size={24} className="text-field/20 mx-auto mb-2" />
                <p className="font-body text-sm text-ink/40">Sem avaliações ainda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ratings.map((r) => (
                  <div key={r.id} className="field-card rounded-sm">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <StarRow value={r.nota} />
                      <span className="font-mono text-[10px] text-ink/30">
                        {new Date(r.criado_em).toLocaleDateString("pt-AO")}
                      </span>
                    </div>
                    {r.comentario && (
                      <p className="font-body text-sm text-ink/65 leading-relaxed">
                        {r.comentario}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
