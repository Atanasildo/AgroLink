"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Heart,
  MessageCircle,
  Send,
  Loader2,
  HelpCircle,
  Lightbulb,
  Sprout,
  Newspaper,
  ImagePlus,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  PostType,
  SocialComment,
  SocialPost,
  createComment,
  createPost,
  listPostComments,
  listPosts,
  togglePostLike,
} from "@/lib/api";
import Link from "next/link";

const TIPOS: { value: PostType | ""; label: string; emoji: string }[] = [
  { value: "",             label: "Todos",        emoji: "🌐" },
  { value: "duvida",       label: "Dúvidas",      emoji: "❓" },
  { value: "dica",         label: "Dicas",        emoji: "💡" },
  { value: "experiencia",  label: "Experiências", emoji: "🌱" },
  { value: "noticia",      label: "Notícias",     emoji: "📰" },
];

const TIPO_ICON: Record<PostType, typeof HelpCircle> = {
  duvida: HelpCircle,
  dica: Lightbulb,
  experiencia: Sprout,
  noticia: Newspaper,
};

function tipoLabel(tipo: PostType) {
  return TIPOS.find((t) => t.value === tipo)?.label ?? tipo;
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString("pt-AO");
}

export default function SocialPage() {
  const { user, token } = useAuth();
  const [filtro, setFiltro] = useState<PostType | "">("");
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Composer
  const [conteudo, setConteudo] = useState("");
  const [tipo, setTipo] = useState<PostType>("experiencia");
  const [imagemUrl, setImagemUrl] = useState("");
  const [imagens, setImagens] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);

  // Comments
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, SocialComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [sendingComment, setSendingComment] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await listPosts(filtro ? { tipo: filtro } : {}, token);
      setPosts(data);
    } catch {
      setError("Erro ao carregar publicações. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filtro, token]); // eslint-disable-line react-hooks/exhaustive-deps

  function addImageUrl() {
    const url = imagemUrl.trim();
    if (!url) return;
    setImagens((prev) => [...prev, url]);
    setImagemUrl("");
  }

  function removeImageUrl(idx: number) {
    setImagens((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handlePublish() {
    if (!token || !conteudo.trim() || publishing) return;
    setPublishing(true);
    try {
      const post = await createPost(token, {
        conteudo: conteudo.trim(),
        tipo,
        imagens: imagens.length > 0 ? imagens : undefined,
      });
      setPosts((prev) => [post, ...prev]);
      setConteudo("");
      setImagens([]);
    } catch {
      setError("Erro ao publicar. Tente novamente.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleLike(post: SocialPost) {
    if (!token) return;
    // Atualização otimista
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              curtido_por_mim: !p.curtido_por_mim,
              likes_count: p.curtido_por_mim ? p.likes_count - 1 : p.likes_count + 1,
            }
          : p
      )
    );
    try {
      const result = await togglePostLike(token, post.id);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, curtido_por_mim: result.curtido, likes_count: result.likes_count } : p
        )
      );
    } catch {
      // revert on failure
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? {
                ...p,
                curtido_por_mim: post.curtido_por_mim,
                likes_count: post.likes_count,
              }
            : p
        )
      );
    }
  }

  async function toggleComments(postId: string) {
    const isOpen = !!openComments[postId];
    setOpenComments((prev) => ({ ...prev, [postId]: !isOpen }));
    if (!isOpen && !comments[postId]) {
      setLoadingComments((prev) => ({ ...prev, [postId]: true }));
      try {
        const data = await listPostComments(postId);
        setComments((prev) => ({ ...prev, [postId]: data }));
      } catch {
        /* ignore */
      } finally {
        setLoadingComments((prev) => ({ ...prev, [postId]: false }));
      }
    }
  }

  async function handleAddComment(postId: string) {
    const text = (commentDrafts[postId] ?? "").trim();
    if (!token || !text || sendingComment[postId]) return;
    setSendingComment((prev) => ({ ...prev, [postId]: true }));
    try {
      const comment = await createComment(token, postId, text);
      setComments((prev) => ({ ...prev, [postId]: [...(prev[postId] ?? []), comment] }));
      setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p))
      );
    } catch {
      /* ignore */
    } finally {
      setSendingComment((prev) => ({ ...prev, [postId]: false }));
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-field/10 border border-field/30 rounded-sm p-2">
            <Users size={20} className="text-field" />
          </div>
          <h1 className="font-display text-2xl uppercase tracking-widest text-ink">
            Rede Social Agrícola
          </h1>
        </div>
        <p className="font-mono text-sm text-ink/50 uppercase tracking-wider">
          Dúvidas, dicas, experiências e notícias da comunidade
        </p>
      </div>

      {/* Tabs/filtro */}
      <div className="flex gap-1 flex-wrap mb-6">
        {TIPOS.map((t) => (
          <button
            key={t.value}
            onClick={() => setFiltro(t.value as PostType | "")}
            className={`font-mono text-xs uppercase tracking-wider px-3 py-1.5 border transition-colors rounded-sm ${
              filtro === t.value
                ? "bg-field text-cream border-field"
                : "border-field/30 text-ink/60 hover:border-field/60"
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Composer */}
      {user ? (
        <div className="border border-field/20 bg-cream p-4 mb-6">
          <textarea
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            placeholder="Partilhe uma dúvida, dica, experiência ou notícia com a comunidade…"
            rows={3}
            className="w-full border border-field/30 bg-cream px-3 py-2 font-mono text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:border-field resize-none"
          />

          {/* Image URL input */}
          <div className="flex gap-2 mt-2">
            <div className="flex items-center gap-1.5 flex-1 border border-field/30 bg-cream px-2">
              <ImagePlus size={13} className="text-field/50 shrink-0" />
              <input
                type="text"
                value={imagemUrl}
                onChange={(e) => setImagemUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addImageUrl(); } }}
                placeholder="URL de uma imagem (opcional)"
                className="flex-1 bg-transparent py-2 font-mono text-xs text-ink placeholder:text-ink/30 focus:outline-none"
              />
            </div>
            <button
              onClick={addImageUrl}
              disabled={!imagemUrl.trim()}
              className="font-mono text-xs uppercase tracking-wider border border-field/30 px-3 py-2 text-field hover:bg-field/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Adicionar
            </button>
          </div>

          {imagens.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2">
              {imagens.map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} alt="" className="w-16 h-16 object-cover border border-field/20" />
                  <button
                    onClick={() => removeImageUrl(i)}
                    className="absolute -top-1.5 -right-1.5 bg-earth text-cream rounded-full p-0.5"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
            <div className="flex gap-1 flex-wrap">
              {TIPOS.filter((t) => t.value !== "").map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTipo(t.value as PostType)}
                  className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 border transition-colors rounded-sm ${
                    tipo === t.value
                      ? "bg-field text-cream border-field"
                      : "border-field/30 text-ink/50 hover:border-field/60"
                  }`}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={handlePublish}
              disabled={publishing || !conteudo.trim()}
              className="flex items-center gap-1.5 bg-field text-cream font-mono text-xs uppercase tracking-wider px-4 py-2 hover:bg-field-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {publishing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Publicar
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-field/20 bg-field/5 px-4 py-3 mb-6 flex items-center justify-between flex-wrap gap-2">
          <p className="font-mono text-xs text-ink/50 uppercase tracking-wider">
            Entre para publicar, curtir e comentar
          </p>
          <Link
            href="/login"
            className="bg-field text-cream font-mono text-xs uppercase tracking-wider px-4 py-2 hover:bg-field-light transition-colors"
          >
            Entrar
          </Link>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 border border-earth/30 bg-earth/5 px-4 py-3 font-mono text-sm text-earth">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border border-field/20 bg-cream p-4 animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="skeleton w-9 h-9 rounded-full" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="skeleton-text w-1/3" />
                  <div className="skeleton-text-sm w-1/4" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="skeleton-text w-full" />
                <div className="skeleton-text w-5/6" />
                <div className="skeleton-text w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && posts.length === 0 && (
        <div className="empty-state border border-field/10 bg-field/2">
          <div className="empty-state-icon">
            <Users size={28} className="text-field/50" />
          </div>
          <p className="empty-state-title">Sem publicações ainda</p>
          <p className="empty-state-desc">
            Seja o primeiro a partilhar uma dúvida, dica ou experiência com a comunidade agrícola.
          </p>
        </div>
      )}

      {/* Feed */}
      {!loading && posts.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          {posts.map((post) => {
            const Icon = TIPO_ICON[post.tipo];
            const isOpen = !!openComments[post.id];
            return (
              <div key={post.id} className="border border-field/20 bg-cream p-4 hover:border-field/35 transition-colors">
                {/* Author */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-field/15 border border-field/20 rounded-full flex items-center justify-center shrink-0">
                      <span className="font-mono text-sm text-field font-bold">
                        {post.autor.nome?.[0]?.toUpperCase() ?? "?"}
                      </span>
                    </div>
                    <div>
                      <p className="font-mono text-xs uppercase tracking-wider text-ink font-bold">
                        {post.autor.nome}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-ink/40 uppercase">
                          {post.autor.role}
                        </span>
                        <span className="text-ink/20">•</span>
                        <span className="font-mono text-[10px] text-ink/40">
                          {timeAgo(post.criado_em)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-field/70 border border-field/20 px-2 py-1 rounded-sm shrink-0">
                    <Icon size={11} />
                    {tipoLabel(post.tipo)}
                  </span>
                </div>

                {/* Content */}
                <p className="font-mono text-sm text-ink leading-relaxed whitespace-pre-wrap mb-3">
                  {post.conteudo}
                </p>

                {/* Images */}
                {post.imagens && post.imagens.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3">
                    {post.imagens.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={url}
                        alt=""
                        className="max-h-64 max-w-full object-cover border border-field/10"
                      />
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-4 border-t border-field/10 pt-3">
                  <button
                    onClick={() => handleLike(post)}
                    disabled={!token}
                    className={`flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider transition-colors ${
                      post.curtido_por_mim ? "text-earth" : "text-ink/50 hover:text-earth"
                    } ${!token ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <Heart size={14} fill={post.curtido_por_mim ? "currentColor" : "none"} />
                    {post.likes_count}
                  </button>
                  <button
                    onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-ink/50 hover:text-field transition-colors"
                  >
                    <MessageCircle size={14} />
                    {post.comments_count}
                  </button>
                </div>

                {/* Comments */}
                {isOpen && (
                  <div className="border-t border-field/10 mt-3 pt-3 space-y-3">
                    {loadingComments[post.id] && (
                      <div className="flex items-center justify-center py-3">
                        <Loader2 size={16} className="animate-spin text-field/40" />
                      </div>
                    )}
                    {!loadingComments[post.id] && (comments[post.id] ?? []).length === 0 && (
                      <p className="font-mono text-[11px] text-ink/30 uppercase tracking-wider text-center py-2">
                        Sem comentários ainda
                      </p>
                    )}
                    {(comments[post.id] ?? []).map((c) => (
                      <div key={c.id} className="flex items-start gap-2">
                        <div className="w-6 h-6 bg-field/15 border border-field/20 rounded-full flex items-center justify-center shrink-0">
                          <span className="font-mono text-[10px] text-field font-bold">
                            {c.autor.nome?.[0]?.toUpperCase() ?? "?"}
                          </span>
                        </div>
                        <div className="flex-1 bg-field/5 px-3 py-1.5 rounded-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-ink font-bold">
                              {c.autor.nome}
                            </span>
                            <span className="font-mono text-[9px] text-ink/30">
                              {timeAgo(c.criado_em)}
                            </span>
                          </div>
                          <p className="font-mono text-xs text-ink/70 mt-0.5">{c.conteudo}</p>
                        </div>
                      </div>
                    ))}

                    {token && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentDrafts[post.id] ?? ""}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); handleAddComment(post.id); }
                          }}
                          placeholder="Escreva um comentário…"
                          className="flex-1 border border-field/30 bg-cream px-3 py-1.5 font-mono text-xs text-ink placeholder:text-ink/30 focus:outline-none focus:border-field"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          disabled={sendingComment[post.id] || !(commentDrafts[post.id] ?? "").trim()}
                          className="bg-field text-cream px-3 py-1.5 hover:bg-field-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {sendingComment[post.id] ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Send size={14} />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
