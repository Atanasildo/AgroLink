"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Wheat, ShoppingCart, Truck, Wrench, MapPin, User,
  ChevronRight, ChevronLeft, CheckCircle, Leaf,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { updateMyProfile, ApiError, UserRole } from "@/lib/api";
import { PROVINCIAS, getMunicipios } from "@/lib/angola";

const ROLES: { value: UserRole; label: string; icon: React.ElementType; desc: string; color: string; tips: string[] }[] = [
  {
    value: "agricultor",
    label: "Agricultor",
    icon: Wheat,
    desc: "Publico produtos, solicito transporte e aluguel de máquinas",
    color: "text-green-700 bg-green-50 border-green-300",
    tips: ["Publica os seus produtos com preço e quantidade", "Solicita transportadores para mover as suas colheitas", "Aluga máquinas agrícolas por dia"],
  },
  {
    value: "comprador",
    label: "Comprador",
    icon: ShoppingCart,
    desc: "Procuro e compro produtos agrícolas directamente dos agricultores",
    color: "text-blue-700 bg-blue-50 border-blue-300",
    tips: ["Pesquisa produtos por categoria e província", "Compara preços de vários agricultores", "Solicita transporte para os seus pedidos"],
  },
  {
    value: "transportador",
    label: "Transportador",
    icon: Truck,
    desc: "Ofereço serviços de transporte rural e registo os meus veículos",
    color: "text-amber-700 bg-amber-50 border-amber-300",
    tips: ["Regista os teus veículos com capacidade", "Publica rotas disponíveis", "Aceita pedidos e ganha comissão"],
  },
  {
    value: "proprietario_maquinas",
    label: "Proprietário de Máquinas",
    icon: Wrench,
    desc: "Aluguel os meus tractores e equipamentos agrícolas",
    color: "text-purple-700 bg-purple-50 border-purple-300",
    tips: ["Regista os teus equipamentos e disponibilidade", "Recebe pedidos de aluguer", "Aprova reservas e ganha 90% do valor"],
  },
];

const STEPS = ["Perfil", "Localização", "Confirmação"];

export default function OnboardingPage() {
  const { user, token, refreshUser } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [role, setRole]         = useState<UserRole>(user?.role ?? "agricultor");
  const [bio, setBio]           = useState(user?.bio ?? "");
  const [telefone, setTelefone] = useState(user?.telefone ?? "");
  const [provincia, setProvincia] = useState(user?.provincia ?? "");
  const [municipio, setMunicipio] = useState(user?.municipio ?? "");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [done, setDone]         = useState(false);

  const selectedRole = ROLES.find(r => r.value === role)!;
  const municipios = getMunicipios(provincia);

  async function handleFinish() {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      await updateMyProfile(token, {
        bio: bio || undefined,
        telefone: telefone || undefined,
        provincia: provincia || undefined,
        municipio: municipio || undefined,
      });
      if (refreshUser) await refreshUser();
      setDone(true);
      setTimeout(() => {
        const dest = role === "agricultor" ? "/marketplace" :
                     role === "comprador"  ? "/marketplace" :
                     role === "transportador" ? "/transporte" : "/maquinas";
        router.push(dest);
      }, 2000);
    } catch (e) {
      setError(e instanceof ApiError ? String(e.detail) : "Erro ao guardar. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream px-6">
        <div className="text-center">
          <CheckCircle size={56} className="text-green-600 mx-auto mb-4" />
          <h2 className="font-display text-3xl text-field mb-2">Tudo pronto!</h2>
          <p className="font-body text-ink/60">A redirecionar para a plataforma...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <div className="border-b border-field/10 bg-white px-6 py-4 flex items-center gap-3">
        <Leaf size={20} className="text-harvest" />
        <span className="font-display text-lg text-field">AgroLink</span>
        <span className="ml-auto font-mono text-xs text-ink/40">Configuração inicial</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-field/10">
        <div
          className="h-1 bg-harvest transition-all duration-500"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-lg">

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-colors ${
                  i < step ? "bg-green-600 text-white" :
                  i === step ? "bg-harvest text-black" :
                  "bg-field/10 text-ink/40"
                }`}>
                  {i < step ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span className={`font-mono text-xs ${i === step ? "text-field" : "text-ink/40"}`}>{s}</span>
                {i < STEPS.length - 1 && <div className="w-6 h-px bg-field/20" />}
              </div>
            ))}
          </div>

          {/* ── PASSO 0: Escolher perfil ── */}
          {step === 0 && (
            <div>
              <p className="label-eyebrow mb-1 text-center">Passo 1</p>
              <h1 className="font-display text-3xl text-field text-center mb-2">
                Bem-vindo, {user?.nome?.split(" ")[0]}!
              </h1>
              <p className="font-body text-ink/60 text-center mb-8">
                Confirma o teu tipo de conta para personalizarmos a experiência.
              </p>

              <div className="space-y-3 mb-8">
                {ROLES.map(r => {
                  const Icon = r.icon;
                  const selected = role === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={`w-full text-left p-4 rounded-sm border-2 transition-all ${
                        selected ? r.color + " shadow-sm" : "border-field/15 bg-white hover:border-field/30"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${selected ? "bg-current/10" : "bg-field/10"}`}>
                          <Icon size={18} className={selected ? "" : "text-field/50"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-body font-semibold text-field">{r.label}</p>
                          <p className="font-body text-sm text-ink/60 mt-0.5">{r.desc}</p>
                        </div>
                        {selected && <CheckCircle size={18} className="flex-shrink-0 mt-1" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Dicas do role seleccionado */}
              <div className="field-card rounded-sm bg-harvest/5 border-harvest/20 mb-6">
                <p className="font-mono text-xs uppercase tracking-wider text-harvest mb-2">Como {selectedRole.label}</p>
                <ul className="space-y-1">
                  {selectedRole.tips.map(tip => (
                    <li key={tip} className="flex items-start gap-2 font-body text-sm text-ink/70">
                      <ChevronRight size={14} className="text-harvest mt-0.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              <button onClick={() => setStep(1)} className="w-full btn-primary rounded-sm py-3">
                Continuar <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── PASSO 1: Localização e bio ── */}
          {step === 1 && (
            <div>
              <p className="label-eyebrow mb-1 text-center">Passo 2</p>
              <h1 className="font-display text-3xl text-field text-center mb-2">Localização</h1>
              <p className="font-body text-ink/60 text-center mb-8">
                A tua localização ajuda-nos a mostrar produtos e transportes mais próximos.
              </p>

              <div className="space-y-4 mb-6">
                {/* Telemóvel */}
                <label className="block">
                  <span className="font-mono text-xs uppercase tracking-wider text-ink/50 block mb-2">
                    <User size={12} className="inline mr-1" /> Telemóvel (opcional)
                  </span>
                  <input
                    type="tel"
                    value={telefone}
                    onChange={e => setTelefone(e.target.value)}
                    placeholder="+244 9XX XXX XXX"
                    className="field-input rounded-sm w-full"
                  />
                </label>

                {/* Bio */}
                <label className="block">
                  <span className="font-mono text-xs uppercase tracking-wider text-ink/50 block mb-2">
                    <User size={12} className="inline mr-1" /> Sobre ti (opcional)
                  </span>
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    rows={3}
                    maxLength={300}
                    placeholder={
                      role === "agricultor" ? "Ex: Agricultor de milho e mandioca em Malanje há 15 anos..." :
                      role === "transportador" ? "Ex: Transportador com 2 camiões, rota Luanda-Huambo..." :
                      "Apresenta-te brevemente..."
                    }
                    className="field-input rounded-sm w-full resize-none"
                  />
                  <p className="font-mono text-xs text-ink/30 text-right mt-1">{bio.length}/300</p>
                </label>

                {/* Província */}
                <label className="block">
                  <span className="font-mono text-xs uppercase tracking-wider text-ink/50 block mb-2">
                    <MapPin size={12} className="inline mr-1" /> Província
                  </span>
                  <select
                    value={provincia}
                    onChange={e => { setProvincia(e.target.value); setMunicipio(""); }}
                    className="field-input rounded-sm w-full"
                  >
                    <option value="">Selecciona a tua província</option>
                    {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>

                {/* Município */}
                {provincia && (
                  <label className="block">
                    <span className="font-mono text-xs uppercase tracking-wider text-ink/50 block mb-2">
                      <MapPin size={12} className="inline mr-1" /> Município
                    </span>
                    <select
                      value={municipio}
                      onChange={e => setMunicipio(e.target.value)}
                      className="field-input rounded-sm w-full"
                    >
                      <option value="">Selecciona o município</option>
                      {municipios.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </label>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="btn-secondary rounded-sm px-4">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setStep(2)} className="flex-1 btn-primary rounded-sm py-3">
                  Continuar <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── PASSO 2: Confirmação ── */}
          {step === 2 && (
            <div>
              <p className="label-eyebrow mb-1 text-center">Passo 3</p>
              <h1 className="font-display text-3xl text-field text-center mb-2">Confirmação</h1>
              <p className="font-body text-ink/60 text-center mb-8">
                Revê os teus dados antes de entrar na plataforma.
              </p>

              <div className="field-card rounded-sm space-y-4 mb-6">
                {[
                  { label: "Nome", value: user?.nome },
                  { label: "Email", value: user?.email },
                  { label: "Tipo de conta", value: selectedRole.label },
                  { label: "Telemóvel", value: telefone || "—" },
                  { label: "Província", value: provincia || "—" },
                  { label: "Município", value: municipio || "—" },
                  { label: "Bio", value: bio || "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="font-mono text-xs text-ink/40 uppercase tracking-wider flex-shrink-0">{label}</span>
                    <span className="font-body text-sm text-field text-right">{value}</span>
                  </div>
                ))}
              </div>

              {error && (
                <p className="text-earth font-body text-sm mb-4 text-center">{error}</p>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary rounded-sm px-4">
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-1 btn-primary rounded-sm py-3 disabled:opacity-50"
                >
                  {loading ? "A guardar..." : "Entrar na plataforma →"}
                </button>
              </div>

              <button
                onClick={() => router.push("/marketplace")}
                className="w-full mt-3 font-mono text-xs text-ink/40 hover:text-ink/60 transition-colors"
              >
                Saltar configuração por agora
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
