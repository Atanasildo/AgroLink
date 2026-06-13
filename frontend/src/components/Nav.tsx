"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Sprout, Truck, ShoppingBasket, LogOut, User,
  Tractor, TrendingUp, Map, MessageCircle, Users, Menu, X, ShieldCheck,
} from "lucide-react";

const links = [
  { href: "/marketplace",  label: "Mercado",    icon: ShoppingBasket },
  { href: "/transporte",   label: "Transporte", icon: Truck },
  { href: "/maquinas",     label: "Máquinas",   icon: Tractor },
  { href: "/precos",       label: "Preços",     icon: TrendingUp },
  { href: "/mapa",         label: "Mapa GPS",   icon: Map },
  { href: "/social",       label: "Comunidade", icon: Users },
  { href: "/chat",         label: "Chat",       icon: MessageCircle, showBadge: true },
];

export function Nav() {
  const { user, signOut, unreadCount } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="border-b-2 border-field/20 bg-cream/95 backdrop-blur sticky top-0 z-50 shadow-sm">
        <div className="flex items-center px-4 py-3 w-full gap-3">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0" onClick={() => setMobileOpen(false)}>
            <div className="bg-field rounded-sm p-1.5">
              <Sprout size={16} className="text-cream" />
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="font-display text-lg uppercase tracking-widest text-field">Agro</span>
              <span className="font-display text-lg uppercase tracking-widest text-harvest">Link</span>
            </div>
          </Link>

          {/* Desktop nav — centered */}
          <nav className="hidden md:flex flex-1 items-center justify-center gap-0.5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-ink/60 hover:text-field hover:bg-field/5 px-2.5 py-2 transition-colors rounded-sm whitespace-nowrap"
              >
                <link.icon size={13} />
                {link.label}
                {link.showBadge && unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-mono font-bold rounded-full flex items-center justify-center px-1 leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            ))}
            {/* Admin link — visível apenas para role "admin" */}
            {user?.role === "admin" && (
              <Link
                href="/admin"
                className="relative flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-red-700 hover:text-red-800 hover:bg-red-50 px-2.5 py-2 transition-colors rounded-sm whitespace-nowrap border border-red-200"
              >
                <ShieldCheck size={13} />
                Admin
              </Link>
            )}
          </nav>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            {user ? (
              <>
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
              </>
            ) : (
              <>
                <Link href="/login" className="font-mono text-xs uppercase tracking-wider text-field/80 hover:text-field px-2 py-2 transition-colors">
                  Entrar
                </Link>
                <Link href="/register" className="bg-field text-cream px-3 py-2 text-xs font-mono uppercase tracking-wider hover:bg-field-light transition-colors rounded-sm whitespace-nowrap">
                  Criar conta
                </Link>
              </>
            )}
          </div>

          {/* Mobile right: chat badge + hamburger */}
          <div className="flex md:hidden items-center gap-2 ml-auto">
            {/* Chat unread badge on mobile */}
            <Link href="/chat" className="relative p-1.5" onClick={() => setMobileOpen(false)}>
              <MessageCircle size={20} className="text-field/60" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="p-1.5 text-field/70 hover:text-field"
              aria-label="Menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col" style={{ top: "57px" }}>
          {/* backdrop */}
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} />
          {/* panel */}
          <div className="relative bg-cream border-b border-field/20 shadow-lg overflow-y-auto max-h-[calc(100vh-57px)]">
            <nav className="flex flex-col divide-y divide-field/10">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="relative flex items-center gap-3 px-5 py-4 font-mono text-sm uppercase tracking-wider text-ink/70 hover:bg-field/5 hover:text-field transition-colors"
                >
                  <link.icon size={18} className="text-field/50" />
                  {link.label}
                  {link.showBadge && unreadCount > 0 && (
                    <span className="ml-auto min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              ))}
              {/* Admin — apenas para role "admin" */}
              {user?.role === "admin" && (
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-5 py-4 font-mono text-sm uppercase tracking-wider text-red-700 hover:bg-red-50 transition-colors"
                >
                  <ShieldCheck size={18} className="text-red-500" />
                  Administração
                </Link>
              )}
            </nav>

            {/* Auth section in drawer */}
            <div className="border-t-2 border-field/15 px-5 py-4">
              {user ? (
                <div className="flex items-center justify-between">
                  <Link
                    href={`/perfil/${user.id}`}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5"
                  >
                    <div className="w-8 h-8 bg-field/15 border border-field/20 rounded-full flex items-center justify-center">
                      <span className="font-mono text-xs text-field font-bold">
                        {user.nome[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-mono text-xs uppercase tracking-wider text-ink font-bold">
                        {user.nome.split(" ")[0]}
                      </p>
                      <p className="font-mono text-[10px] text-ink/40 uppercase">{user.role}</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => { signOut(); setMobileOpen(false); }}
                    className="flex items-center gap-1.5 border border-earth/30 text-earth px-3 py-2 text-xs uppercase tracking-wider font-mono hover:bg-earth hover:text-cream transition-colors rounded-sm"
                  >
                    <LogOut size={13} /> Saír
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center border border-field/30 text-field font-mono text-sm uppercase tracking-wider py-3 hover:bg-field/5 transition-colors rounded-sm"
                  >
                    Entrar
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center bg-field text-cream font-mono text-sm uppercase tracking-wider py-3 hover:bg-field-light transition-colors rounded-sm"
                  >
                    Criar conta
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
