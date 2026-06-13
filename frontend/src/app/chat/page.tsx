"use client";

import { useEffect, useRef, useState } from "react";
import { Send, MessageCircle, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  ChatMessage,
  ConversationSummary,
  User,
  getConversation,
  getUser,
  listConversations,
  sendMessage,
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
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [partners, setPartners] = useState<Record<string, User>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Load conversations list
  useEffect(() => {
    if (!token) return;
    listConversations(token)
      .then(async (convs) => {
        setConversations(convs);
        // Fetch partner names
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
      .finally(() => setLoadingMsgs(false));
  }, [token, activeId]);

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
          // Add to current conversation if open
          const otherId =
            msg.remetente_id === user?.id ? msg.destinatario_id : msg.remetente_id;
          if (otherId === activeId) {
            setMessages((prev) => [...prev, msg]);
          }
          // Update conversations list unread badge
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
    <main className="mx-auto max-w-5xl px-0 sm:px-4 py-0 sm:py-6">
      <div className="border border-field/20 flex overflow-hidden" style={{ height: "calc(100vh - 130px)", minHeight: "500px" }}>

        {/* Sidebar — conversation list */}
        <div className={`w-full sm:w-72 border-r border-field/20 flex flex-col shrink-0 ${activeId ? "hidden sm:flex" : "flex"}`}>
          <div className="p-4 border-b border-field/10">
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-field" />
              <span className="font-display text-sm uppercase tracking-widest text-ink">
                Mensagens
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConvs && (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin text-field/40" />
              </div>
            )}
            {!loadingConvs && conversations.length === 0 && (
              <div className="py-12 px-4 text-center">
                <MessageCircle size={28} className="mx-auto text-field/20 mb-2" />
                <p className="font-mono text-xs text-ink/40 uppercase tracking-wider">
                  Sem conversas ainda
                </p>
                <p className="font-mono text-[10px] text-ink/30 mt-1">
                  Contacte um agricultor ou transportador
                </p>
              </div>
            )}
            {conversations.map((c) => {
              const partner = partners[c.outro_utilizador_id];
              const isActive = activeId === c.outro_utilizador_id;
              return (
                <button
                  key={c.outro_utilizador_id}
                  onClick={() => setActiveId(c.outro_utilizador_id)}
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
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <MessageCircle size={40} className="text-field/20 mb-3" />
              <p className="font-mono text-sm text-ink/40 uppercase tracking-widest">
                Selecione uma conversa
              </p>
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