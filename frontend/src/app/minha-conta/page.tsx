"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  User, Save, Lock, CheckCircle, AlertCircle, Loader, ChevronLeft,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError, updateMyProfile, changePassword } from "@/lib/api";
import { ImageUpload } from "@/components/ImageUpload";
import { PROVINCIAS, getMunicipios } from "@/lib/angola";

export default function MinhaContaPage() {
  const { user, token, refreshUser, loading: authLoading } = useAuth();
  const router = useRouter();

  // perfil
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [bio, setBio] = useState("");
  const [provincia, setProvincia] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [fotoPerfil, setFotoPerfil] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // senha
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [senhaConfirm, setSenhaConfirm] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      setNome(user.nome ?? "");
      setTelefone(user.telefone ?? "");
      setBio(user.bio ?? "");
      setProvincia(user.provincia ?? "");
      setMunicipio(user.municipio ?? "");
      setFotoPerfil(user.foto_perfil_url ? [user.foto_perfil_url] : []);
    }
  }, [user]);

  async function handleProfile(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await updateMyProfile(token, {
        nome,
        telefone: telefone || undefined,
        bio: bio || undefined,
        provincia: provincia || undefined,
        municipio: municipio || undefined,
        foto_perfil_url: fotoPerfil[0] || undefined,
      });
      await refreshUser();
      setProfileMsg({ type: "ok", text: "Perfil atualizado." });
    } catch (err) {
      setProfileMsg({
        type: "err",
        text: err instanceof ApiError ? String(err.detail) : "Erro ao guardar.",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePassword(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (senhaNova !== senhaConfirm) {
      setPwdMsg({ type: "err", text: "As senhas novas não coincidem." });
      return;
    }
    setSavingPwd(true);
    setPwdMsg(null);
    try {
      await changePassword(token, senhaAtual, senhaNova);
      setSenhaAtual("");
      setSenhaNova("");
      setSenhaConfirm("");
      setPwdMsg({ type: "ok", text: "Senha alterada com sucesso." });
    } catch (err) {
      setPwdMsg({
        type: "err",
        text: err instanceof ApiError ? String(err.detail) : "Erro ao alterar senha.",
      });
    } finally {
      setSavingPwd(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size={24} className="text-field/40 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-12">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 font-mono text-xs text-ink/40 hover:text-field transition-colors mb-6"
      >
        <ChevronLeft size={14} /> Voltar
      </button>

      <div className="border-b border-field/15 mb-8 pb-6">
        <p className="label-eyebrow mb-1">Conta</p>
        <h1 className="text-3xl text-field flex items-center gap-2">
          <User size={24} strokeWidth={1.5} /> Minha Conta
        </h1>
        <p className="font-body text-ink/50 mt-1 text-sm">
          Gerir o teu perfil público e credenciais.
        </p>
      </div>

      {/* ── Perfil ── */}
      <section className="field-card rounded-sm mb-6">
        <p className="label-eyebrow mb-4">Informações do perfil</p>
        <form onSubmit={handleProfile} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Nome completo</span>
              <input
                required value={nome} onChange={(e) => setNome(e.target.value)}
                className="field-input rounded-sm"
                minLength={2} maxLength={150}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Telefone</span>
              <input
                value={telefone} onChange={(e) => setTelefone(e.target.value)}
                placeholder="+244 9xx xxx xxx"
                className="field-input rounded-sm"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Província</span>
              <select
                value={provincia}
                onChange={(e) => { setProvincia(e.target.value); setMunicipio(""); }}
                className="field-input rounded-sm"
              >
                <option value="">— Selecionar —</option>
                {PROVINCIAS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Município</span>
              <select
                value={municipio} onChange={(e) => setMunicipio(e.target.value)}
                disabled={!provincia} className="field-input rounded-sm disabled:opacity-50"
              >
                <option value="">— Selecionar —</option>
                {provincia && getMunicipios(provincia).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="font-mono text-xs uppercase tracking-wider text-ink/50">
                Bio <span className="text-ink/30">(opcional)</span>
              </span>
              <textarea
                value={bio} onChange={(e) => setBio(e.target.value)}
                rows={3} maxLength={500}
                placeholder="Fala um pouco sobre ti — experiência, especialidade, localização..."
                className="field-input rounded-sm resize-none"
              />
            </label>

            <div className="sm:col-span-2">
              <ImageUpload
                images={fotoPerfil}
                onChange={setFotoPerfil}
                maxImages={1}
                label="Foto de perfil"
              />
            </div>
          </div>

          {profileMsg && (
            <p className={`flex items-center gap-1.5 font-mono text-xs ${profileMsg.type === "ok" ? "text-green-700" : "text-earth"}`}>
              {profileMsg.type === "ok" ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
              {profileMsg.text}
            </p>
          )}

          <div>
            <button type="submit" disabled={savingProfile} className="btn-harvest rounded-sm disabled:opacity-50">
              <Save size={14} />
              {savingProfile ? "A guardar..." : "Guardar perfil"}
            </button>
          </div>
        </form>
      </section>

      {/* ── Alterar senha ── */}
      <section className="field-card rounded-sm">
        <p className="label-eyebrow mb-4 flex items-center gap-1.5">
          <Lock size={13} className="text-harvest" /> Alterar senha
        </p>
        <form onSubmit={handlePassword} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Senha atual</span>
            <input
              type="password" required value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              className="field-input rounded-sm"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Nova senha</span>
            <input
              type="password" required minLength={8} value={senhaNova}
              onChange={(e) => setSenhaNova(e.target.value)}
              className="field-input rounded-sm"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Confirmar nova senha</span>
            <input
              type="password" required value={senhaConfirm}
              onChange={(e) => setSenhaConfirm(e.target.value)}
              className="field-input rounded-sm"
            />
          </label>

          {pwdMsg && (
            <p className={`flex items-center gap-1.5 font-mono text-xs ${pwdMsg.type === "ok" ? "text-green-700" : "text-earth"}`}>
              {pwdMsg.type === "ok" ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
              {pwdMsg.text}
            </p>
          )}

          <div>
            <button type="submit" disabled={savingPwd} className="btn-primary rounded-sm disabled:opacity-50">
              <Lock size={14} />
              {savingPwd ? "A alterar..." : "Alterar senha"}
            </button>
          </div>
        </form>
      </section>

      {/* Link para perfil público */}
      <div className="mt-6 text-center">
        <a
          href={`/perfil/${user.id}`}
          className="font-mono text-xs text-ink/40 hover:text-field transition-colors underline-offset-2 hover:underline"
        >
          Ver o meu perfil público →
        </a>
      </div>
    </div>
  );
}
