"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Send, MessageCircle, Loader2, ArrowLeft, UserPlus, Search, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  ChatMessage,
  ConversationSummary,
  User,
  getConversation,
  getUser,
  listConversations,
  sendMessage,
  searchUsers,
} from "@/lib/api";
import Link from "next/link";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/^http/, "ws") ??
  "wss://agrolink-api-67zk.onrender.com/api/v1";

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return new Date(iso).toLocaleDateString("pt-AO");
}

export default function ChatPage() {
  const { user, token } = useAuth();
  // Clear unread badge when chat is open
  const { refreshUnread } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [partners, setPartners] = useState<Record<string, User>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);

  // New conversation search
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load conversations list
  useEffect(() => {
    if (!token) return;
    listConversations(token)
      .then(async (convs) => {
        setConversations(convs);
        const map: Record<string, User> = {};
        await Promise.all(
          convs.map(async (c) => {
            try {
              map[c.outro_utilizador_id] = await getUser(c.outro_utilizador_id);
            } catch { /* ignore */ }
          })
        );
        setPartners(map);
      })
      .catch(() => {})
      .finally(() => setLoadingConvs(false));
  }, [token]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!token || !activeId) return;
    setLoadingMsgs(true);
    getConversation(token, activeId)
      .then((msgs) => setMessages([...msgs].reverse()))
      .catch(() => {})
      .finally(() => { setLoadingMsgs(false); refreshUnread(); });
  }, [token, activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // WebSocket for real-time messages
  useEffect(() => {
    if (!token) return;
    const ws = new WebSocket(`${API_BASE}/chat/ws?token=${token}`);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.event === "new_message") {
          const msg: ChatMessage = payload.data;
          const otherId =
            msg.remetente_id === user?.id ? msg.destinatario_id : msg.remetente_id;
          if (otherId === activeId) {
            setMessages((prev) => [...prev, msg]);
          }
          setConversations((prev) =>
            prev.map((c) =>
              c.outro_utilizador_id === otherId
                ? {
                    ...c,
                    ultima_mensagem: msg,
                    mensagens_nao_lidas:
                      otherId === activeId ? 0 : c.mensagens_nao_lidas + 1,
                  }
                : c
            )
          );
        }
      } catch { /* ignore */ }
    };
    return () => ws.close();
  }, [token, activeId, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Debounced user search
  const doSearch = useCallback(
    (q: string) => {
      if (!token || !q.trim()) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      searchUsers({ q: q.trim(), limit: 15 }, token)
        .then((results) => {
          // exclude self
          setSearchResults(results.filter((u) => u.id !== user?.id));
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    },
    [token, user?.id]
  );

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => doSearch(searchQuery), 350);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, doSearch]);

  function openConversation(target: User) {
    // Add to partners map
    setPartners((prev) => ({ ...prev, [target.id]: target }));
    // Add to conversations list if not present
    setConversations((prev) => {
      if (prev.find((c) => c.outro_utilizador_id === target.id)) return prev;
      return [
        { outro_utilizador_id: target.id, mensagens_nao_lidas: 0, ultima_mensagem: null as unknown as ChatMessage },
        ...prev,
      ];
    });
    setActiveId(target.id);
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  }

  async function handleSend() {
    if (!token || !activeId || !text.trim() || sending) return;
    setSending(true);
    try {
      const msg = await sendMessage(token, {
        destinatario_id: activeId,
        conteudo: text.trim(),
        tipo: "texto",
      });
      setMessages((prev) => [...prev, msg]);
      setText("");
    } catch { /* ignore */ } finally {
      setSending(false);
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <MessageCircle size={40} className="text-field/30" />
        <p className="font-mono text-sm text-ink/40 uppercase tracking-widest">
          Precisa de entrar para usar o chat
        </p>
        <Link
          href="/login"
          className="bg-field text-cream font-mono text-xs uppercase tracking-wider px-5 py-2.5 hover:bg-field-light transition-colors"
        >
          Entrar
        </Link>
      </div>
    );
  }

  const activePartner = activeId ? partners[activeId] : null;

  return (
    <main className="mx-auto max-w-5xl px-0 sm:px-4 py-0 sm:py-4">
      <div className="border border-field/20 flex overflow-hidden" style={{ height: "calc(100dvh - 110px)", minHeight: "400px" }}>

        {/* Sidebar — conversation list */}
        <div className={`w-full sm:w-72 border-r border-field/20 flex flex-col shrink-0 ${activeId && !showSearch ? "hidden sm:flex" : "flex"}`}>
          <div className="p-3 border-b border-field/10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageCircle size={15} className="text-field" />
                <span className="font-display text-sm uppercase tracking-widest text-ink">
                  Mensagens
                </span>
              </div>
              <button
                onClick={() => { setShowSearch((v) => !v); setSearchQuery(""); setSearchResults([]); }}
                title="Nova conversa"
                className="flex items-center gap-1 text-field/60 hover:text-field border border-field/20 hover:border-field/40 px-2 py-1 rounded-sm transition-colors"
              >
                {showSearch ? <X size={13} /> : <UserPlus size={13} />}
                <span className="font-mono text-[10px] uppercase tracking-wider">
                  {showSearch ? "Fechar" : "Nova"}
                </span>
              </button>
            </div>

            {/* Search panel */}
            {showSearch && (
              <div className="mt-3">
                <div className="flex items-center border border-field/30 bg-cream overflow-hidden">
                  <Search size={12} className="ml-2.5 text-field/40 shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Procurar utilizadores…"
                    className="flex-1 px-2 py-2 font-mono text-xs text-ink placeholder:text-ink/30 focus:outline-none bg-transparent"
                  />
                  {searching && <Loader2 size={12} className="animate-spin mr-2 text-field/40" />}
                </div>
                {searchQuery.trim() && !searching && searchResults.length === 0 && (
                  <p className="font-mono text-[10px] text-ink/30 uppercase text-center mt-3">
                    Sem resultados
                  </p>
                )}
                {!searchQuery.trim() && (
                  <p className="font-mono text-[10px] text-ink/30 mt-2 text-center">
                    Escreva um nome para procurar
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Search results */}
          {showSearch && searchResults.length > 0 && (
            <div className="overflow-y-auto border-b border-field/10">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => openConversation(u)}
                  className="w-full text-left px-4 py-2.5 border-b border-field/5 hover:bg-field/5 transition-colors flex items-center gap-2.5"
                >
                  <div className="w-7 h-7 bg-field/15 border border-field/20 rounded-full flex items-center justify-center shrink-0">
                    <span className="font-mono text-xs text-field font-bold">
                      {u.nome?.[0]?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-xs uppercase tracking-wider text-ink font-bold truncate">
                      {u.nome}
                    </p>
                    <p className="font-mono text-[10px] text-ink/40 uppercase">
                      {u.role}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {loadingConvs && (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin text-field/40" />
              </div>
            )}
            {!loadingConvs && conversations.length === 0 && !showSearch && (
              <div className="py-12 px-4 text-center">
                <MessageCircle size={28} className="mx-auto text-field/20 mb-2" />
                <p className="font-mono text-xs text-ink/40 uppercase tracking-wider">
                  Sem conversas ainda
                </p>
                <p className="font-mono text-[10px] text-ink/30 mt-1">
                  Clique em <strong>Nova</strong> para começar
                </p>
              </div>
            )}
            {conversations.map((c) => {
              const partner = partners[c.outro_utilizador_id];
              const isActive = activeId === c.outro_utilizador_id;
              return (
                <button
                  key={c.outro_utilizador_id}
                  onClick={() => { setActiveId(c.outro_utilizador_id); setShowSearch(false); }}
                  className={`w-full text-left px-4 py-3 border-b border-field/10 hover:bg-field/5 transition-colors ${
                    isActive ? "bg-field/8 border-l-2 border-l-field" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 bg-field/15 border border-field/20 rounded-full flex items-center justify-center shrink-0">
                        <span className="font-mono text-xs text-field font-bold">
                          {partner?.nome?.[0]?.toUpperCase() ?? "?"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono text-xs uppercase tracking-wider text-ink font-bold truncate">
                          {partner?.nome ?? "Utilizador"}
                        </p>
                        <p className="font-mono text-[10px] text-ink/40 truncate">
                          {c.ultima_mensagem?.conteudo ?? ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {c.ultima_mensagem && (
                        <span className="font-mono text-[9px] text-ink/30">
                          {timeAgo(c.ultima_mensagem.criado_em)}
                        </span>
                      )}
                      {c.mensagens_nao_lidas > 0 && (
                        <span className="bg-field text-cream text-[9px] font-mono px-1.5 py-0.5 rounded-full">
                          {c.mensagens_nao_lidas}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat panel */}
        <div className={`flex-1 flex flex-col ${!activeId ? "hidden sm:flex" : "flex"}`}>
          {!activeId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 gap-4">
              <MessageCircle size={40} className="text-field/20" />
              <p className="font-mono text-sm text-ink/40 uppercase tracking-widest">
                Selecione uma conversa
              </p>
              <button
                onClick={() => setShowSearch(true)}
                className="flex items-center gap-2 bg-field text-cream font-mono text-xs uppercase tracking-wider px-4 py-2.5 hover:bg-field-light transition-colors rounded-sm"
              >
                <UserPlus size={14} /> Nova Conversa
              </button>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-field/10 shrink-0">
                <button
                  onClick={() => setActiveId(null)}
                  className="sm:hidden text-ink/40 hover:text-ink"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="w-8 h-8 bg-field/15 border border-field/20 rounded-full flex items-center justify-center">
                  <span className="font-mono text-xs text-field font-bold">
                    {activePartner?.nome?.[0]?.toUpperCase() ?? "?"}
                  </span>
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-ink font-bold">
                    {activePartner?.nome ?? "Utilizador"}
                  </p>
                  {activePartner?.role && (
                    <p className="font-mono text-[10px] text-ink/40 uppercase">
                      {activePartner.role}
                    </p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMsgs && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-field/40" />
                  </div>
                )}
                {!loadingMsgs && messages.length === 0 && (
                  <div className="text-center py-8">
                    <p className="font-mono text-xs text-ink/30 uppercase tracking-wider">
                      Nenhuma mensagem ainda. Diga olá!
                    </p>
                  </div>
                )}
                {messages.map((msg) => {
                  const isMine = msg.remetente_id === user.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[70%] px-3 py-2 text-sm font-mono leading-relaxed ${
                          isMine
                            ? "bg-field text-cream"
                            : "bg-field/8 border border-field/20 text-ink"
                        }`}
                      >
                        <p>{msg.conteudo}</p>
                        <p className={`text-[9px] mt-1 ${isMine ? "text-cream/50" : "text-ink/30"}`}>
                          {timeAgo(msg.criado_em)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-field/10 flex gap-2 shrink-0">
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Escreva uma mensagem…"
                  className="flex-1 border border-field/30 bg-cream px-3 py-2 font-mono text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:border-field"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !text.trim()}
                  className="bg-field text-cream px-4 py-2 hover:bg-field-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
