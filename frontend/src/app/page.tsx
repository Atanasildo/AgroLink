"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wheat, Truck, Tractor, ArrowRight, Sprout,
  MapPin, Users, TrendingUp, CheckCircle2, Leaf,
  ShieldCheck, CreditCard, Navigation, Star,
  ChevronRight, Play
} from "lucide-react";
import { RouteDiagram } from "@/components/RouteDiagram";

const HERO_IMAGES = [
  {
    url: "https://images.pexels.com/photos/974314/pexels-photo-974314.jpeg?auto=compress&cs=tinysrgb&w=1600",
    caption: "Campos agrícolas de Angola"
  },
  {
    url: "https://images.pexels.com/photos/547264/pexels-photo-547264.jpeg?auto=compress&cs=tinysrgb&w=1600",
    caption: "Colheita de milho"
  },
  {
    url: "https://images.pexels.com/photos/1112080/pexels-photo-1112080.jpeg?auto=compress&cs=tinysrgb&w=1600",
    caption: "Maquinaria agrícola moderna"
  },
  {
    url: "https://images.pexels.com/photos/2933243/pexels-photo-2933243.jpeg?auto=compress&cs=tinysrgb&w=1600",
    caption: "Campos verdes"
  },
  {
    url: "https://images.pexels.com/photos/2382665/pexels-photo-2382665.jpeg?auto=compress&cs=tinysrgb&w=1600",
    caption: "Agricultura familiar"
  },
  {
    url: "https://images.pexels.com/photos/1537726/pexels-photo-1537726.jpeg?auto=compress&cs=tinysrgb&w=1600",
    caption: "Plantações de cana-de-açúcar"
  },
  {
    url: "https://images.pexels.com/photos/1408221/pexels-photo-1408221.jpeg?auto=compress&cs=tinysrgb&w=1600",
    caption: "Campos de girassol"
  },
  {
    url: "https://images.pexels.com/photos/1379636/pexels-photo-1379636.jpeg?auto=compress&cs=tinysrgb&w=1600",
    caption: "Produtos frescos do campo"
  }
];

const PRODUCT_IMAGES = [
  { url: "https://images.pexels.com/photos/547264/pexels-photo-547264.jpeg?auto=compress&cs=tinysrgb&w=600", label: "Milho" },
  { url: "https://images.pexels.com/photos/1092730/pexels-photo-1092730.jpeg?auto=compress&cs=tinysrgb&w=600", label: "Feijão" },
  { url: "https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg?auto=compress&cs=tinysrgb&w=600", label: "Tomate" },
  { url: "https://images.pexels.com/photos/947879/pexels-photo-947879.jpeg?auto=compress&cs=tinysrgb&w=600", label: "Ananás" },
  { url: "https://images.pexels.com/photos/1093038/pexels-photo-1093038.jpeg?auto=compress&cs=tinysrgb&w=600", label: "Banana" },
  { url: "https://images.pexels.com/photos/918643/pexels-photo-918643.jpeg?auto=compress&cs=tinysrgb&w=600", label: "Manga" },
  { url: "https://tse4.mm.bing.net/th/id/OIP.kQeYzG1pXw5lo2W6Alb5xwHaE8?r=0&rs=1&pid=ImgDetMain&o=7&rm=3", label: "Girassol" },
  { url: "https://tse1.explicit.bing.net/th/id/OIP.AGRe_LKujjWmV4sSTbt4RQHaE5?r=0&rs=1&pid=ImgDetMain&o=7&rm=3", label: "Batata-doce" },
  { url: "https://images.pexels.com/photos/1295572/pexels-photo-1295572.jpeg?auto=compress&cs=tinysrgb&w=600", label: "Amendoim" },
  { url: "https://911pharma.com/upload/O_poder_nutritivo_do_Abacate_Parte1_h_12282022113715-PM.jpg", label: "Abacate" },
  { url: "https://media.istockphoto.com/id/1197326147/es/foto/ca%C3%B1a-de-az%C3%BAcar-plantada-para-producir-az%C3%BAcar-y-alimentos-industria-alimentaria-campos-de-ca%C3%B1a.jpg?s=170667a&w=0&k=20&c=uDagOxlT-UBbtqRgpXmQHYpo6U=", label: "Cana-de-açúcar" },
  { url: "https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=600", label: "Café" },
  { url: "https://images.pexels.com/photos/1300972/pexels-photo-1300972.jpeg?auto=compress&cs=tinysrgb&w=600", label: "Hortaliças" },
  { url: "https://images.pexels.com/photos/2255801/pexels-photo-2255801.jpeg?auto=compress&cs=tinysrgb&w=600", label: "Soja" },
];

const pillars = [
  {
    icon: Wheat,
    eyebrow: "Módulo 01",
    title: "Mercado Agrícola",
    description: "Agricultores publicam produtos com preço, quantidade e localização. Compradores pesquisam por categoria, província e município.",
    href: "/marketplace",
    cta: "Ver produtos",
    color: "text-harvest",
    bg: "bg-harvest/10 border-harvest/30",
    img: "https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    icon: Truck,
    eyebrow: "Módulo 02 · Prioridade",
    title: "Transporte Rural",
    description: "O coração do AgroLink. Agricultores solicitam transporte, transportadores publicam rotas com capacidade disponível, e várias cargas partilham o mesmo veículo.",
    href: "/transporte",
    cta: "Solicitar transporte",
    color: "text-field",
    bg: "bg-field/10 border-field/30",
    img: "https://images.pexels.com/photos/1427541/pexels-photo-1427541.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    icon: Tractor,
    eyebrow: "Módulo 03",
    title: "Aluguel de Máquinas",
    description: "Tratores, colheitadeiras, pulverizadores e sistemas de irrigação disponíveis por dia, com reserva e aprovação do proprietário.",
    href: "/maquinas",
    cta: "Ver máquinas",
    color: "text-earth",
    bg: "bg-earth/10 border-earth/30",
    img: "https://images.pexels.com/photos/96715/pexels-photo-96715.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
];

const stats = [
  { icon: Users, value: "18 Províncias", label: "Cobertura nacional" },
  { icon: TrendingUp, value: "5%", label: "Comissão de transporte" },
  { icon: MapPin, value: "GPS", label: "Rastreamento em tempo real" },
  { icon: CheckCircle2, value: "10%", label: "Comissão de máquinas" },
];

const advantages = [
  {
    icon: Navigation,
    title: "GPS em Tempo Real",
    desc: "Rastreie o seu transporte em tempo real — veja exactamente onde está a sua carga no mapa.",
    color: "text-sky-600"
  },
  {
    icon: ShieldCheck,
    title: "Diferencial vs Uber Freight",
    desc: "AgroLink foi feito para Angola: partilha de carga, rotas rurais, preços em Kwanzas e suporte local.",
    color: "text-field"
  },
  {
    icon: CreditCard,
    title: "Pagamento Integrado",
    desc: "Pague directamente na plataforma com multicaixa, transferência ou referência. Seguro e rápido.",
    color: "text-harvest"
  },
  {
    icon: Star,
    title: "Avaliações Verificadas",
    desc: "Cada agricultor, transportador e vendedor tem avaliações reais de outros utilizadores da plataforma.",
    color: "text-earth"
  },
];

export default function HomePage() {
  const [heroIndex, setHeroIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [scrollY, setScrollY] = useState(0);

  // Auto-slide hero images
  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setHeroIndex(i => (i + 1) % HERO_IMAGES.length);
        setFade(true);
      }, 400);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Parallax
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="dark-section-wrapper">

      {/* ── HERO com imagens reais animadas ─────────────────── */}
      <section className="relative overflow-hidden" style={{ minHeight: "90vh" }}>
        {/* Background slideshow */}
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            opacity: fade ? 1 : 0,
            backgroundImage: `url(${HERO_IMAGES[heroIndex].url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: `translateY(${scrollY * 0.3}px)`,
          }}
        />
        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Animated grain overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Image indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {HERO_IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => { setFade(false); setTimeout(() => { setHeroIndex(i); setFade(true); }, 300); }}
              className={`transition-all duration-300 rounded-full ${i === heroIndex ? "w-6 h-2 bg-harvest" : "w-2 h-2 bg-white/40 hover:bg-white/70"}`}
            />
          ))}
        </div>

        {/* Caption */}
        <div className="absolute bottom-10 right-6 z-10">
          <span className="font-mono text-xs text-white/40 uppercase tracking-wider">
            {HERO_IMAGES[heroIndex].caption}
          </span>
        </div>

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-32 flex flex-col justify-center" style={{ minHeight: "90vh" }}>
          <div className="flex items-center gap-2 mb-6 animate-pulse">
            <Leaf size={16} className="text-harvest" />
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-harvest">
              Plataforma AgriTech & LogTech · Angola
            </p>
          </div>

          <h1 className="text-white text-5xl sm:text-6xl md:text-8xl leading-[1.0] mb-6 max-w-3xl font-display uppercase tracking-wide">
            Da fazenda
            <br />
            à mesa,
            <br />
            <span className="text-harvest" style={{ textShadow: "0 0 40px rgba(200,131,42,0.5)" }}>
              sem perder
            </span>
            <br />
            a carga.
          </h1>

          <p className="max-w-xl text-white/75 font-body text-base sm:text-lg mb-10">
            Marketplace agrícola, logística rural e aluguel de máquinas numa única
            plataforma — conectando agricultores, compradores, transportadores e
            cooperativas em todas as 18 províncias.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <Link href="/register" className="bg-harvest text-black px-6 py-3 font-mono text-sm uppercase tracking-wider inline-flex items-center justify-center gap-2 hover:bg-harvest/90 transition-all hover:scale-105 rounded-sm font-bold">
              <Sprout size={16} /> Criar conta gratuita
            </Link>
            <Link
              href="/transporte"
              className="border border-white/30 text-white px-6 py-3 font-mono text-sm uppercase tracking-wider inline-flex items-center justify-center gap-2 hover:border-harvest hover:text-harvest transition-all rounded-sm backdrop-blur-sm"
            >
              <Play size={16} /> Ver rotas de transporte
            </Link>
          </div>

          {/* Floating stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
            {stats.map((s) => (
              <div key={s.label} className="bg-black/40 backdrop-blur-md border border-white/10 rounded-sm p-3 hover:border-harvest/50 transition-colors">
                <p className="font-display text-lg text-harvest">{s.value}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/50 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUTOS em destaque (carousel visual) ───────────── */}
      <section className="bg-cream border-b border-field/15 overflow-hidden py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 mb-6">
          <p className="label-eyebrow">Produtos frescos do campo</p>
        </div>
        <div className="flex gap-4 px-4 sm:px-6 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          {PRODUCT_IMAGES.map((p, i) => (
            <Link
              key={i}
              href="/marketplace"
              className="flex-shrink-0 group relative overflow-hidden rounded-sm"
              style={{ width: 180, height: 220 }}
            >
              <img
                src={p.url}
                alt={p.label}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-3 left-3">
                <p className="font-display text-white text-sm uppercase tracking-wider">{p.label}</p>
                <p className="font-mono text-xs text-harvest flex items-center gap-1 mt-0.5">
                  Ver preços <ChevronRight size={10} />
                </p>
              </div>
            </Link>
          ))}
          <Link
            href="/marketplace"
            className="flex-shrink-0 flex flex-col items-center justify-center rounded-sm border-2 border-dashed border-field/30 hover:border-harvest transition-colors"
            style={{ width: 180, height: 220 }}
          >
            <Wheat size={28} className="text-field/40 mb-2" />
            <p className="font-mono text-xs text-ink/50 uppercase tracking-wider text-center px-4">Ver todos os produtos</p>
          </Link>
        </div>
      </section>

      {/* ── MÓDULOS com imagens reais ─────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <p className="label-eyebrow mb-3">O que o AgroLink oferece</p>
        <h2 className="text-2xl sm:text-4xl mb-3 text-field">Três módulos, uma plataforma</h2>
        <p className="font-body text-ink/55 mb-12 max-w-xl">
          Cada módulo resolve um problema real do agronegócio angolano, integrado
          numa plataforma única com pagamentos e avaliações.
        </p>

        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {pillars.map((p) => (
            <Link key={p.title} href={p.href} className={`group field-card flex flex-col rounded-sm border ${p.bg} hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden p-0`}>
              {/* Module image */}
              <div className="relative h-40 overflow-hidden">
                <img
                  src={p.img}
                  alt={p.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute top-3 left-3">
                  <span className="font-mono text-xs uppercase tracking-wider text-white/70 bg-black/30 px-2 py-0.5 rounded-sm backdrop-blur-sm">
                    {p.eyebrow}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3">
                  <div className={`inline-flex p-2 rounded-sm bg-cream/90`}>
                    <p.icon size={20} strokeWidth={1.5} className={p.color} />
                  </div>
                </div>
              </div>
              {/* Content */}
              <div className="p-5 flex flex-col flex-1">
                <h3 className={`text-xl mb-2 ${p.color}`}>{p.title}</h3>
                <p className="font-body text-sm text-ink/65 flex-1 mb-4">{p.description}</p>
                <span className={`font-mono text-xs uppercase tracking-wider ${p.color} inline-flex items-center gap-1 group-hover:gap-2 transition-all`}>
                  {p.cta} <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── GPS + DIFERENCIAIS ─────────────────────────────────── */}
      <section className="bg-field/5 border-y border-field/15 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="label-eyebrow mb-3">Por que escolher o AgroLink</p>
          <h2 className="text-2xl sm:text-4xl mb-12 text-field">Feito para a agricultura angolana</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {advantages.map((a) => (
              <div key={a.title} className="bg-cream border border-field/15 rounded-sm p-5 hover:border-field/40 transition-colors hover:shadow-md">
                <div className={`mb-4 p-2.5 rounded-sm bg-field/5 inline-flex`}>
                  <a.icon size={22} className={a.color} />
                </div>
                <h3 className={`text-base mb-2 ${a.color} font-display uppercase tracking-wide`}>{a.title}</h3>
                <p className="font-body text-sm text-ink/60 leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EXEMPLO DE ROTA ──────────────────────────────────── */}
      <section className="dark-section bg-field relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(255,255,255,0.15) 28px, rgba(255,255,255,0.15) 30px)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-harvest mb-4">Partilha de carga</p>
            <h2 className="text-cream text-3xl sm:text-5xl mb-6">Reduza custos partilhando o caminhão</h2>
            <p className="text-cream/70 font-body mb-8">
              Em vez de pagar um caminhão inteiro, partilhe a capacidade com outros agricultores na mesma rota. 
              O AgroLink calcula automaticamente o custo proporcional à tonelagem.
            </p>
            <Link href="/transporte" className="bg-harvest text-black px-6 py-3 font-mono text-sm uppercase tracking-wider inline-flex items-center gap-2 hover:bg-harvest/90 transition-all rounded-sm font-bold">
              <Truck size={16} /> Ver rotas disponíveis
            </Link>
          </div>
          <div className="border border-cream/15 bg-cream/5 backdrop-blur p-6 sm:p-8 rounded-sm">
            <p className="label-eyebrow text-harvest mb-6">Exemplo · Compartilhamento de carga</p>
            <div className="text-cream [&_.stamp]:border-harvest [&_.stamp]:text-harvest [&_svg]:text-cream">
              <RouteDiagram
                origem="Caála"
                destino="Huambo"
                capacidadeTotal={10}
                capacidadeDisponivel={7}
              />
            </div>
            <p className="mt-6 text-sm text-cream/55 font-body">
              Um caminhão com 10 toneladas já tem 3 reservadas — restam 7 toneladas
              disponíveis para outros agricultores na mesma rota.
            </p>
          </div>
        </div>
      </section>

      {/* ── PAGAMENTO (Fake) + COMISSÃO ──────────────────────── */}
      <section className="dark-section bg-earth relative overflow-hidden">
        {/* Farm image background */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "url(https://images.pexels.com/photos/974314/pexels-photo-974314.jpeg?auto=compress&cs=tinysrgb&w=1200)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "grayscale(100%)"
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20">
          <p className="label-eyebrow text-harvest mb-4">Transparência financeira</p>
          <h2 className="text-cream text-2xl sm:text-4xl mb-10">Como funciona o pagamento</h2>

          {/* Payment flow fake UI */}
          <div className="bg-cream/5 border border-cream/15 backdrop-blur rounded-sm p-6 mb-8 max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-wider text-cream/50 mb-4 flex items-center gap-2">
              <CreditCard size={14} className="text-harvest" />
              Simulação de pagamento — AgroLink Pay
            </p>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between items-center py-2 border-b border-cream/10">
                <span className="text-cream/60">Serviço</span>
                <span className="text-cream">Transporte Caála → Huambo</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-cream/10">
                <span className="text-cream/60">Carga</span>
                <span className="text-cream">3 toneladas de Milho</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-cream/10">
                <span className="text-cream/60">Subtotal</span>
                <span className="text-cream">30.000 Kz</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-cream/10">
                <span className="text-harvest">Comissão AgroLink (5%)</span>
                <span className="text-harvest">1.500 Kz</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-cream text-base font-bold">Total a pagar</span>
                <span className="text-cream text-xl font-bold">31.500 Kz</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {["Multicaixa Express", "Transferência", "Referência"].map(m => (
                <div key={m} className="border border-cream/20 bg-cream/5 py-2 px-3 text-center rounded-sm">
                  <p className="font-mono text-xs text-cream/60">{m}</p>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full bg-harvest text-black py-3 font-mono text-sm uppercase tracking-wider font-bold rounded-sm hover:bg-harvest/90 transition-colors flex items-center justify-center gap-2">
              <CreditCard size={16} /> Pagar agora (Demo)
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 font-mono">
            <div className="border border-cream/15 bg-cream/5 p-6 rounded-sm">
              <p className="text-xs uppercase tracking-wider text-cream/50 mb-2">Valor do transporte</p>
              <p className="text-3xl text-cream">100.000 Kz</p>
              <div className="mt-3 h-px bg-cream/10" />
              <p className="text-xs text-cream/40 mt-2 font-body">Valor acordado entre agricultor e transportador</p>
            </div>
            <div className="border border-harvest/30 bg-harvest/10 p-6 rounded-sm">
              <p className="text-xs uppercase tracking-wider text-harvest/70 mb-2">Comissão AgroLink (5%)</p>
              <p className="text-3xl text-harvest">5.000 Kz</p>
              <div className="mt-3 h-px bg-harvest/20" />
              <p className="text-xs text-harvest/50 mt-2 font-body">Mantém a plataforma activa</p>
            </div>
            <div className="border border-sky/30 bg-sky/10 p-6 rounded-sm">
              <p className="text-xs uppercase tracking-wider text-sky/70 mb-2">Recebido pelo transportador</p>
              <p className="text-3xl text-sky">95.000 Kz</p>
              <div className="mt-3 h-px bg-sky/20" />
              <p className="text-xs text-sky/50 mt-2 font-body">Calculado e confirmado antes da viagem</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL com imagem de fundo ───────────────────── */}
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0"
          style={{
            backgroundImage: "url(https://images.pexels.com/photos/2933243/pexels-photo-2933243.jpeg?auto=compress&cs=tinysrgb&w=1200)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <Sprout size={40} className="text-harvest mx-auto mb-6" />
          <h2 className="text-white text-3xl sm:text-5xl mb-4 font-display uppercase tracking-wide">
            Pronto para começar?
          </h2>
          <p className="text-white/70 font-body text-lg mb-10">
            Junte-se a milhares de agricultores, transportadores e compradores que já usam o AgroLink em Angola.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="bg-harvest text-black px-8 py-4 font-mono text-sm uppercase tracking-wider inline-flex items-center justify-center gap-2 hover:bg-harvest/90 transition-all rounded-sm font-bold text-base hover:scale-105">
              <Sprout size={18} /> Criar conta gratuita
            </Link>
            <Link href="/marketplace" className="border border-white/30 text-white px-8 py-4 font-mono text-sm uppercase tracking-wider inline-flex items-center justify-center gap-2 hover:border-harvest hover:text-harvest transition-all rounded-sm">
              <Wheat size={18} /> Ver marketplace
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-field/15 bg-cream-dark">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-field rounded-sm p-1.5">
              <Sprout size={16} className="text-cream" />
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="font-display text-xl uppercase tracking-widest text-field">Agro</span>
              <span className="font-display text-xl uppercase tracking-widest text-harvest">Link</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            {[
              { href: "/marketplace", label: "Marketplace" },
              { href: "/transporte", label: "Transporte" },
              { href: "/maquinas", label: "Máquinas" },
              { href: "/precos", label: "Preços" },
              { href: "/mapa", label: "Mapa GPS" },
            ].map(l => (
              <Link key={l.href} href={l.href} className="font-mono text-xs uppercase tracking-wider text-ink/50 hover:text-field transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-1 md:text-right">
            <p className="font-mono text-xs uppercase tracking-wider text-ink/40">
              Plataforma AgriTech & LogTech de Angola
            </p>
            <p className="font-mono text-xs text-ink/30">
              © {new Date().getFullYear()} AgroLink · Todos os direitos reservados
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
