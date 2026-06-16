"use client";

/**
 * /recuperar-senha — Recuperação de senha por email.
 * O utilizador introduz o email, recebe um email com nova senha temporária.
 * Nota: sem servidor SMTP configurado, a nova senha é mostrada no ecrã (MVP).
 */

import { useState, FormEvent } from "react";
import Link from "next/link";
import { KeyRound, Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/api";

type State = "idle" | "loading" | "success" | "error";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [errMsg, setErrMsg] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("loading");
    setErrMsg("");
    try {
      const res = await apiRequest<{ detail: string; temp_password?: string }>(
        "/auth/reset-password",
        { method: "POST", body: { email: email.trim() } }
      );
      setTempPassword(res.temp_password ?? null);
      setState("success");
    } catch (err: unknown) {
      setState("error");
      setErrMsg(err instanceof Error ? err.message : "Erro ao processar pedido.");
    }
  }

  if (state === "success") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-parchment">
        <div className="field-card rounded-sm max-w-md w-full py-10 flex flex-col items-center gap-5 text-center">
          <CheckCircle2 size={52} className="text-harvest" />
          <h1 className="font-display text-2xl uppercase tracking-wide">Senha redefinida!</h1>
          {tempPassword ? (
            <div className="w-full bg-field/8 border border-field/25 rounded-sm p-4">
              <p className="font-body text-sm text-ink/70 mb-3">
                A tua senha temporária é (altera-a depois de entrar):
              </p>
              <code className="font-mono text-lg font-bold text-field bg-cream px-4 py-2 rounded-sm border border-field/20 block">
                {tempPassword}
              </code>
            </div>
          ) : (
            <p className="font-body text-sm text-ink/60">
              Se o email existir na nossa base de dados, receberás instruções em breve.
            </p>
          )}
          <Link href="/login" className="btn-harvest rounded-sm mt-2">
            <KeyRound size={14} />
            Ir para o Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-parchment">
      <div className="field-card rounded-sm max-w-md w-full py-10 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-field/10 border border-field/30 flex items-center justify-center">
            <KeyRound size={26} className="text-field" />
          </div>
          <h1 className="font-display text-2xl uppercase tracking-wide">Recuperar Senha</h1>
          <p className="font-body text-ink/60 text-sm max-w-xs">
            Introduz o teu email. Vamos gerar uma senha temporária para entrares na plataforma.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Email</span>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setState("idle"); setErrMsg(""); }}
                placeholder="o.teu@email.ao"
                className="field-input rounded-sm pl-9"
              />
            </div>
          </label>

          {state === "error" && (
            <div className="flex items-start gap-2 bg-earth/8 border border-earth/25 rounded-sm p-3">
              <p className="font-body text-earth text-sm">{errMsg}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={state === "loading" || !email.trim()}
            className="btn-harvest rounded-sm disabled:opacity-50 justify-center"
          >
            <KeyRound size={14} />
            {state === "loading" ? "A processar…" : "Recuperar senha"}
          </button>
        </form>

        <Link href="/login" className="flex items-center gap-1.5 font-mono text-xs text-ink/50 hover:text-ink/70 transition-colors justify-center">
          <ArrowLeft size={12} />
          Voltar ao login
        </Link>
      </div>
    </main>
  );
}
