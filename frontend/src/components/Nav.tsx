"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Sprout, Truck, ShoppingBasket, LogOut, User } from "lucide-react";

const links = [
  { href: "/marketplace", label: "Mercado", icon: ShoppingBasket },
  { href: "/transporte", label: "Transporte", icon: Truck },
];

export function Nav() {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b-2 border-field/20 bg-cream/95 backdrop-blur sticky top-0 z-50 shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="bg-field rounded-sm p-1.5">
            <Sprout size={18} className="text-cream" />
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="font-display text-xl uppercase tracking-widest text-field">Agro</span>
            <span className="font-display text-xl uppercase tracking-widest text-harvest">Link</span>
          </div>
          <span className="hidden sm:block font-mono text-[10px] text-field-muted uppercase tracking-widest border border-field/20 px-1.5 py-0.5 ml-1">
            Angola
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-1.5 font-mono text-sm uppercase tracking-wider text-ink/60 hover:text-field hover:bg-field/5 px-3 py-2 transition-colors rounded-sm"
            >
              <link.icon size={14} />
              {link.label}
            </Link>
          ))}

          <div className="h-5 w-px bg-field/20 mx-2" />

          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-field/8 border border-field/20 px-3 py-1.5 rounded-sm">
                <User size={12} className="text-field" />
                <span className="font-mono text-xs uppercase tracking-wider text-field">
                  {user.nome.split(" ")[0]}
                </span>
              </div>
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 border border-earth/30 text-earth px-3 py-1.5 text-xs uppercase tracking-wider font-mono hover:bg-earth hover:text-cream transition-colors rounded-sm"
              >
                <LogOut size={12} /> Saír
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="font-mono text-sm uppercase tracking-wider text-field/80 hover:text-field px-3 py-2 transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="bg-field text-cream px-4 py-2 text-sm font-mono uppercase tracking-wider hover:bg-field-light transition-colors rounded-sm"
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
