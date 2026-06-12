"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sprout, UserPlus, AlertCircle, Wheat, Truck, Tractor, ShoppingCart, Eye, EyeOff,
} from "lucide-react";
import { ApiError, register, UserRole } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const PROVINCIAS = [
  "Bengo","Benguela","Bié","Cabinda","Cuando Cubango","Cuanza Norte",
  "Cuanza Sul","Cunene","Huambo","Huíla","Luanda","Lunda Norte",
  "Lunda Sul","Malanje","Moxico","Namibe","Uíge","Zaire",
];

const roles: { value: UserRole; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "agricultor",            label: "Agricultor",               icon: Wheat,        desc: "Vendo produtos e solicito transporte" },
  { value: "comprador",             label: "Comprador",                icon: ShoppingCart, desc: "Compro produtos agrícolas" },
  { value: "transportador",         label: "Transportador",            icon: Truck,        desc: "Ofereço serviços de transporte rural" },
  { value: "proprietario_maquinas", label: "Proprietário de Máquinas", icon: Tractor,      desc: "Aluguel tratores e equipamentos" },
];

export default function RegisterPage() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [role, setRole] = useState<UserRole>("agricultor");
  const [provincia, setProvincia] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (senha.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await register({ nome, email, telefone: telefone || undefined, senha, role, provincia, municipio });
      await signIn(email, senha);
      router.push("/marketplace");
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = err.detail;
        if (typeof detail === "string") {
          setError(detail);
        } else if (Array.isArray(detail)) {
          // Erros de validação do Pydantic
          const msgs = (detail as { msg: string }[]).map((d) => d.msg).join(". ");
          setError(msgs);
        } else {
          setError("Não foi possível criar a conta. Verifique os seus dados e tente novamente.");
        }
      } else {
        setError("Sem ligação ao servidor. Verifique a sua ligação à internet.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-field rounded-sm p-3 mb-4">
            <Sprout size={24} className="text-cream" />
          </div>
          <h1 className="text-3xl text-field mb-2">Criar conta gratuita</h1>
          <p className="font-body text-ink/55">Junte-se à maior rede agrícola de Angola</p>
        </div>

        <div className="field-card rounded-sm border-field/20">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tipo de conta */}
            <div>
              <p className="label-eyebrow mb-3">Tipo de conta</p>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((r) => (
                  <button key={r.value} type="button" onClick={() => setRole(r.value)}
                    className={`flex flex-col items-start gap-1 p-3 border rounded-sm text-left transition-all ${
                      role === r.value
                        ? "border-field bg-field/8 text-field"
                        : "border-ink/15 hover:border-field/40 text-ink/60"
                    }`}>
                    <div className="flex items-center gap-2">
                      <r.icon size={14} />
                      <span className="font-mono text-xs uppercase tracking-wider">{r.label}</span>
                    </div>
                    <span className="font-body text-[11px] leading-tight opacity-70">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="label-eyebrow">Nome completo</span>
                <input
                  required minLength={2} maxLength={150}
                  value={nome} onChange={(e) => setNome(e.target.value)}
                  placeholder="João Manuel da Silva"
                  className="field-input rounded-sm"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="label-eyebrow">Email</span>
                <input
                  type="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="joao@exemplo.ao"
                  className="field-input rounded-sm"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="label-eyebrow">Telefone (opcional)</span>
                <input
                  type="tel"
                  value={telefone} onChange={(e) => setTelefone(e.target.value)}
                  placeholder="+244 9XX XXX XXX"
                  className="field-input rounded-sm"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="label-eyebrow">Província</span>
                <select
                  required
                  value={provincia} onChange={(e) => setProvincia(e.target.value)}
                  className="field-input rounded-sm"
                >
                  <option value="">Selecionar...</option>
                  {PROVINCIAS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="label-eyebrow">Município</span>
                <input
                  required
                  value={municipio} onChange={(e) => setMunicipio(e.target.value)}
                  placeholder="Ex: Caála"
                  className="field-input rounded-sm"
                />
              </label>

              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="label-eyebrow">Senha</span>
                <div className="relative">
                  <input
                    type={showSenha ? "text" : "password"}
                    required minLength={8}
                    value={senha} onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="field-input rounded-sm w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70"
                    tabIndex={-1}
                  >
                    {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {senha.length > 0 && senha.length < 8 && (
                  <p className="text-[11px] text-earth/80 font-body">{8 - senha.length} caracteres em falta</p>
                )}
              </label>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-earth/8 border border-earth/25 text-earth px-3 py-2.5 rounded-sm">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <p className="font-body text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center rounded-sm disabled:opacity-50"
            >
              <UserPlus size={16} />
              {loading ? "A criar conta..." : "Criar conta"}
            </button>
          </form>
        </div>

        <p className="text-center font-body text-sm text-ink/50 mt-6">
          Já tem conta?{" "}
          <Link href="/login" className="text-field font-medium hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
