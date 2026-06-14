"use client";

/**
 * /admin/setup — Página secreta para o dono da aplicação se tornar administrador.
 *
 * Como funciona:
 *  1. O dono faz login com a sua conta normal
 *  2. Acede a /admin/setup (URL não está listado em lado nenhum — só o dono sabe)
 *  3. Introduz a ADMIN_SETUP_KEY definida no backend (variável de ambiente)
 *  4. O backend verifica a chave e promove a conta a role=admin
 *  5. A partir desse momento o link Admin aparece na navbar
 *
 * Esta página nunca é linkada publicamente. Sem a chave correta não faz nada.
 */

import { useState, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { ShieldCheck, KeyRound, LogIn, CheckCircle2, AlertTriangle } from "lucide-react";
import { promoteToAdmin } from "@/lib/api";

type State = "idle" | "loading" | "success" | "error";

export default function AdminSetupPage() {
  const { user, token, refreshUser } = useAuth();
  const router = useRouter();
  const [chave, setChave] = useState("");
  const [state, setState] = useState<State>("idle");
  const [errMsg, setErrMsg] = useState("");

  // Já é admin
  if (user?.role === "admin") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="field-card rounded-sm max-w-md w-full text-center flex flex-col items-center gap-4 py-10">
          <CheckCircle2 size={48} className="text-harvest" />
          <h1 className="font-display text-2xl uppercase tracking-wide">Já és Administrador</h1>
          <p className="font-body text-ink/60 text-sm">
            A tua conta já tem privilégios de administrador.
          </p>
          <button
            onClick={() => router.push("/admin")}
            className="btn-harvest rounded-sm mt-2"
          >
            <ShieldCheck size={14} />
            Ir para o Painel Admin
          </button>
        </div>
      </main>
    );
  }

  // Não tem sessão iniciada
  if (!user || !token) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="field-card rounded-sm max-w-md w-full text-center flex flex-col items-center gap-4 py-10">
          <LogIn size={40} className="text-field" />
          <h1 className="font-display text-xl uppercase tracking-wide">Sessão necessária</h1>
          <p className="font-body text-ink/60 text-sm">
            Inicia sessão com a tua conta antes de activar os privilégios de administrador.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="btn-harvest rounded-sm mt-2"
          >
            Iniciar sessão
          </button>
        </div>
      </main>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !chave.trim()) return;
    setState("loading");
    setErrMsg("");
    try {
      await promoteToAdmin(token, chave.trim());
      // Atualizar o contexto com o novo role
      if (refreshUser) await refreshUser();
      setState("success");
      setTimeout(() => router.push("/admin"), 2000);
    } catch (err: unknown) {
      setState("error");
      const msg =
        err instanceof Error
          ? err.message
          : "Chave inválida ou erro de servidor.";
      setErrMsg(msg.includes("403") || msg.includes("Chave") ? "Chave incorrecta. Verifica o valor de ADMIN_SETUP_KEY no backend." : msg);
    }
  }

  if (state === "success") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="field-card rounded-sm max-w-md w-full text-center flex flex-col items-center gap-4 py-12">
          <CheckCircle2 size={56} className="text-harvest" />
          <h1 className="font-display text-2xl uppercase tracking-wide">Conta promovida!</h1>
          <p className="font-body text-ink/60 text-sm">
            A tua conta é agora administrador. A redirecionar para o painel…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-parchment">
      <div className="field-card rounded-sm max-w-md w-full py-10 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-earth/10 border border-earth/30 flex items-center justify-center">
            <KeyRound size={26} className="text-earth" />
          </div>
          <h1 className="font-display text-2xl uppercase tracking-wide">Configuração de Admin</h1>
          <p className="font-body text-ink/60 text-sm max-w-xs">
            Introduz a chave secreta definida na variável de ambiente{" "}
            <code className="font-mono text-xs bg-ink/8 px-1 py-0.5 rounded">ADMIN_SETUP_KEY</code>{" "}
            do teu servidor backend para activar os privilégios de administrador nesta conta.
          </p>
        </div>

        {/* Conta activa */}
        <div className="bg-field/8 border border-field/20 rounded-sm p-3 flex flex-col gap-0.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink/40">Conta activa</span>
          <span className="font-body text-sm font-medium">{user.nome}</span>
          <span className="font-mono text-xs text-ink/50">{user.email} · {user.role}</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-ink/50">
              Chave secreta (ADMIN_SETUP_KEY)
            </span>
            <input
              type="password"
              required
              autoComplete="off"
              value={chave}
              onChange={e => { setChave(e.target.value); setState("idle"); setErrMsg(""); }}
              placeholder="••••••••••••••••"
              className="field-input rounded-sm"
            />
          </label>

          {state === "error" && (
            <div className="flex items-start gap-2 bg-earth/8 border border-earth/25 rounded-sm p-3">
              <AlertTriangle size={14} className="text-earth mt-0.5 flex-shrink-0" />
              <p className="font-body text-earth text-sm">{errMsg}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={state === "loading" || !chave.trim()}
            className="btn-harvest rounded-sm disabled:opacity-50 justify-center"
          >
            <ShieldCheck size={14} />
            {state === "loading" ? "A verificar…" : "Activar privilégios de Admin"}
          </button>
        </form>

        <p className="font-mono text-[10px] text-ink/35 text-center">
          Esta página não está linkada publicamente. Apenas o dono da aplicação sabe o URL e a chave.
        </p>
      </div>
    </main>
  );
}
