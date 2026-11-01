"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { User, Save, Lock, CheckCircle, AlertCircle, Loader, ChevronLeft, Camera, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError, updateMyProfile, changePassword, uploadProfilePhoto } from "@/lib/api";
import { PROVINCIAS, getMunicipios } from "@/lib/angola";

export default function MinhaContaPage() {
  const { user, token, refreshUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [bio, setBio] = useState("");
  const [provincia, setProvincia] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

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
      setFotoUrl(user.foto_perfil_url ?? null);
    }
  }, [user]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProfileMsg({ type: "err", text: "Apenas imagens são permitidas." });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProfileMsg({ type: "err", text: "A foto deve ter menos de 2 MB." });
      return;
    }
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
    setProfileMsg(null);
  }

  function removeFoto() {
    setFotoFile(null);
    setFotoPreview(null);
    setFotoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleProfile(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      let finalFotoUrl = fotoUrl;
      if (fotoFile) {
        finalFotoUrl = await uploadProfilePhoto(token, fotoFile);
        setFotoUrl(finalFotoUrl);
        setFotoFile(null);
        setFotoPreview(null);
      }
      await updateMyProfile(token, {
        nome,
        telefone: telefone || undefined,
        bio: bio || undefined,
        provincia: provincia || undefined,
        municipio: municipio || undefined,
        foto_perfil_url: finalFotoUrl || undefined,
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
      setSenhaAtual(""); setSenhaNova(""); setSenhaConfirm("");
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

  const displayFoto = fotoPreview || fotoUrl;

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
        <p className="font-body text-ink/50 mt-1 text-sm">Gerir o teu perfil público e credenciais.</p>
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
                className="field-input rounded-sm" minLength={2} maxLength={150}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Telefone</span>
              <input
                value={telefone} onChange={(e) => setTelefone(e.target.value)}
                placeholder="+244 9xx xxx xxx" className="field-input rounded-sm"
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

            {/* Foto de perfil */}
            <div className="sm:col-span-2 flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-ink/50">
                Foto de perfil {displayFoto ? "(1/1)" : ""}
              </span>
              <div className="flex items-center gap-3">
                {displayFoto ? (
                  <div className="relative w-20 h-20 rounded-sm overflow-hidden border border-field/20 bg-ink/5 flex-shrink-0">
                    <img src={displayFoto} alt="Foto de perfil" className="w-full h-full object-cover" />
                    <button
                      type="button" onClick={removeFoto}
                      className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-field/30 hover:border-field/60 rounded-sm text-field/50 hover:text-field/80 transition-colors"
                  >
                    <Camera size={18} />
                    <span className="font-mono text-[9px] uppercase tracking-wider">Adicionar</span>
                  </button>
                )}
                {!displayFoto && (
                  <p className="font-mono text-[10px] text-ink/35">JPG, PNG ou WEBP · máx. 2 MB</p>
                )}
                {fotoFile && (
                  <p className="font-mono text-[10px] text-harvest-dark">Nova foto pronta para guardar</p>
                )}
              </div>
              <input
                ref={fileInputRef} type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden" onChange={handleFileSelect}
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
            <input type="password" required value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} className="field-input rounded-sm" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Nova senha</span>
            <input type="password" required minLength={8} value={senhaNova} onChange={(e) => setSenhaNova(e.target.value)} className="field-input rounded-sm" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Confirmar nova senha</span>
            <input type="password" required value={senhaConfirm} onChange={(e) => setSenhaConfirm(e.target.value)} className="field-input rounded-sm" />
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

      <div className="mt-6 text-center">
        <a href={`/perfil/${user.id}`} className="font-mono text-xs text-ink/40 hover:text-field transition-colors underline-offset-2 hover:underline">
          Ver o meu perfil público →
        </a>
      </div>
    </div>
  );
}
