"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Sprout, Truck, ShoppingBasket, LogOut, User, Tractor, TrendingUp, Map, MessageCircle, Users } from "lucide-react";

const links = [
  { href: "/marketplace", label: "Mercado", icon: ShoppingBasket },
  { href: "/transporte", label: "Transporte", icon: Truck },
  { href: "/maquinas", label: "Máquinas", icon: Tractor },
  { href: "/precos", label: "Preços", icon: TrendingUp },
  { href: "/mapa", label: "Mapa", icon: Map },
  { href: "/social", label: "Comunidade", icon: Users },
  { href: "/chat", label: "Chat", icon: MessageCircle },
];

export function Nav() {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b-2 border-field/20 bg-cream/95 backdrop-blur sticky top-0 z-50 shadow-sm">
      <div className="flex items-center justify-between px-3 py-3 w-full">
        {/* Logo — flush left */}
        <Link href="/" className="flex items-center gap-2 shrink-0 mr-4">
          <div className="bg-field rounded-sm p-1.5">
            <Sprout size={18} className="text-cream" />
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="font-display text-xl uppercase tracking-widest text-field">Agro</span>
            <span className="font-display text-xl uppercase tracking-widest text-harvest">Link</span>
          </div>
        </Link>

        <nav className="flex items-center gap-0.5 min-w-0">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-ink/60 hover:text-field hover:bg-field/5 px-2 py-2 transition-colors rounded-sm whitespace-nowrap"
            >
              <link.icon size={13} />
              {link.label}
            </Link>
          ))}

          <div className="h-5 w-px bg-field/20 mx-1.5" />

          {user ? (
            <div className="flex items-center gap-1.5">
              <Link
                href={`/perfil/${user.id}`}
                className="flex items-center gap-1.5 bg-field/8 border border-field/20 px-2.5 py-1.5 rounded-sm hover:bg-field/15 transition-colors"
              >
                <User size={12} className="text-field" />
                <span className="font-mono text-xs uppercase tracking-wider text-field">
                  {user.nome.split(" ")[0]}
                </span>
              </Link>
              <button
                onClick={signOut}
                className="flex items-center gap-1 border border-earth/30 text-earth px-2.5 py-1.5 text-xs uppercase tracking-wider font-mono hover:bg-earth hover:text-cream transition-colors rounded-sm"
              >
                <LogOut size={12} /> Saír
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/login"
                className="font-mono text-xs uppercase tracking-wider text-field/80 hover:text-field px-2 py-2 transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="bg-field text-cream px-3 py-2 text-xs font-mono uppercase tracking-wider hover:bg-field-light transition-colors rounded-sm whitespace-nowrap"
              >
                Criar conta
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
