"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sprout, LogIn, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      router.push("/marketplace");
    } catch {
      setError("Email ou senha incorrectos. Verifique os seus dados.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-field rounded-sm p-3 mb-4">
            <Sprout size={24} className="text-cream" />
          </div>
          <h1 className="text-3xl text-field mb-2">Bem-vindo de volta</h1>
          <p className="font-body text-ink/55">Entre na sua conta AgroLink</p>
        </div>

        {/* Card */}
        <div className="field-card rounded-sm border-field/20">
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="flex flex-col gap-2">
              <span className="label-eyebrow">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agricultor@exemplo.ao"
                className="field-input rounded-sm"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="label-eyebrow">Senha</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="field-input rounded-sm"
              />
            </label>

            {error && (
              <div className="flex items-center gap-2 bg-earth/8 border border-earth/25 text-earth px-3 py-2.5 rounded-sm">
                <AlertCircle size={15} />
                <p className="font-body text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center rounded-sm disabled:opacity-50"
            >
              <LogIn size={16} />
              {loading ? "A entrar..." : "Entrar"}
            </button>
          </form>
        </div>

        <p className="text-center font-body text-sm text-ink/50 mt-6">
          Ainda não tem conta?{" "}
          <Link href="/register" className="text-field font-medium hover:underline">
            Criar conta gratuita
          </Link>
        </p>
      </div>
    </div>
  );
}
