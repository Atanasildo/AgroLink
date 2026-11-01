"use client";

import { useState } from "react";
import { ShieldCheck, X, Mail, Phone, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  requestEmailVerification, confirmEmailVerification,
  requestPhoneVerification, confirmPhoneVerification,
  ApiError,
} from "@/lib/api";

export function VerificationBanner() {
  const { user, token, refreshUser } = useAuth();

  const [dismissed, setDismissed] = useState(false);
  const [step, setStep] = useState<null | "email_sent" | "phone_sent">(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  if (!user || !token || dismissed) return null;
  if (user.email_verificado && user.telefone_verificado) return null;

  const needsEmail = !user.email_verificado;
  const needsPhone = !user.telefone_verificado && user.telefone;

  async function sendEmail() {
    setLoading(true); setMsg(null);
    try {
      await requestEmailVerification(token!);
      setStep("email_sent");
      setMsg({ type: "ok", text: "Código enviado para o teu email." });
    } catch (e) {
      setMsg({ type: "err", text: e instanceof ApiError ? String(e.detail) : "Erro ao enviar." });
    } finally { setLoading(false); }
  }

  async function sendPhone() {
    setLoading(true); setMsg(null);
    try {
      await requestPhoneVerification(token!);
      setStep("phone_sent");
      setMsg({ type: "ok", text: "Código enviado por SMS." });
    } catch (e) {
      setMsg({ type: "err", text: e instanceof ApiError ? String(e.detail) : "Erro ao enviar." });
    } finally { setLoading(false); }
  }

  async function confirm() {
    if (!code.trim()) return;
    setLoading(true); setMsg(null);
    try {
      if (step === "email_sent") {
        await confirmEmailVerification(token!, code.trim());
        setMsg({ type: "ok", text: "Email verificado!" });
      } else {
        await confirmPhoneVerification(token!, code.trim());
        setMsg({ type: "ok", text: "Telemóvel verificado!" });
      }
      await refreshUser();
      setStep(null);
      setCode("");
    } catch (e) {
      setMsg({ type: "err", text: e instanceof ApiError ? String(e.detail) : "Código inválido." });
    } finally { setLoading(false); }
  }

  return (
    <div className="bg-harvest/10 border-b border-harvest/30 px-4 py-3">
      <div className="mx-auto max-w-4xl flex flex-wrap items-start gap-3">
        <ShieldCheck size={16} className="text-harvest-dark mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs uppercase tracking-wider text-harvest-dark mb-1">
            Conta não verificada
          </p>
          {step === null ? (
            <div className="flex flex-wrap gap-2">
              {needsEmail && (
                <button
                  onClick={sendEmail}
                  disabled={loading}
                  className="flex items-center gap-1.5 font-mono text-xs border border-harvest/40 text-harvest-dark px-3 py-1.5 rounded-sm hover:bg-harvest/10 transition-colors disabled:opacity-50"
                >
                  <Mail size={12} /> Verificar email
                </button>
              )}
              {needsPhone && (
                <button
                  onClick={sendPhone}
                  disabled={loading}
                  className="flex items-center gap-1.5 font-mono text-xs border border-harvest/40 text-harvest-dark px-3 py-1.5 rounded-sm hover:bg-harvest/10 transition-colors disabled:opacity-50"
                >
                  <Phone size={12} /> Verificar telemóvel
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Código de 6 dígitos"
                maxLength={6}
                className="border border-harvest/40 bg-cream px-2 py-1 font-mono text-xs rounded-sm w-36 focus:outline-none focus:border-harvest"
              />
              <button
                onClick={confirm}
                disabled={loading || !code.trim()}
                className="flex items-center gap-1 font-mono text-xs bg-harvest text-ink px-3 py-1.5 rounded-sm hover:bg-harvest-dark hover:text-cream transition-colors disabled:opacity-50"
              >
                <CheckCircle size={12} /> Confirmar
              </button>
              <button
                onClick={() => { setStep(null); setCode(""); setMsg(null); }}
                className="font-mono text-xs text-ink/40 hover:text-ink/70"
              >
                Cancelar
              </button>
            </div>
          )}
          {msg && (
            <p className={`flex items-center gap-1 font-mono text-xs mt-1.5 ${msg.type === "ok" ? "text-green-700" : "text-earth"}`}>
              {msg.type === "ok" ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
              {msg.text}
            </p>
          )}
        </div>
        <button onClick={() => setDismissed(true)} className="text-ink/30 hover:text-ink/60 flex-shrink-0">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
