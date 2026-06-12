"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, getMe, login as apiLogin } from "@/lib/api";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, senha: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "agrolink.access_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.sessionStorage.getItem(STORAGE_KEY) : null;
    if (stored) {
      getMe(stored)
        .then((u) => {
          setUser(u);
          setToken(stored);
        })
        .catch(() => {
          window.sessionStorage.removeItem(STORAGE_KEY);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function signIn(email: string, senha: string) {
    const tokenResponse = await apiLogin(email, senha);
    const me = await getMe(tokenResponse.access_token);
    setUser(me);
    setToken(tokenResponse.access_token);
    window.sessionStorage.setItem(STORAGE_KEY, tokenResponse.access_token);
  }

  function signOut() {
    setUser(null);
    setToken(null);
    window.sessionStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
