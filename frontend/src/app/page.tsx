import Link from "next/link";
import {
  Wheat, Truck, Tractor, ArrowRight, Sprout,
  MapPin, Users, TrendingUp, CheckCircle2, Leaf
} from "lucide-react";
import { RouteDiagram } from "@/components/RouteDiagram";

const pillars = [
  {
    icon: Wheat,
    eyebrow: "Módulo 01",
    title: "Mercado Agrícola",
    description:
      "Agricultores publicam produtos com preço, quantidade e localização. Compradores pesquisam por categoria, província e município.",
    href: "/marketplace",
    cta: "Ver produtos",
    color: "text-harvest",
    bg: "bg-harvest/10 border-harvest/30",
  },
  {
    icon: Truck,
    eyebrow: "Módulo 02 · Prioridade",
    title: "Transporte Rural",
    description:
      "O coração do AgroLink. Agricultores solicitam transporte, transportadores publicam rotas com capacidade disponível, e várias cargas partilham o mesmo veículo.",
    href: "/transporte",
    cta: "Solicitar transporte",
    color: "text-field",
    bg: "bg-field/10 border-field/30",
  },
  {
    icon: Tractor,
    eyebrow: "Módulo 03",
    title: "Aluguel de Máquinas",
    description:
      "Tratores, colheitadeiras, pulverizadores e sistemas de irrigação disponíveis por dia, com reserva e aprovação do proprietário.",
    href: "/transporte",
    cta: "Em breve",
    color: "text-earth",
    bg: "bg-earth/10 border-earth/30",
  },
];

const stats = [
  { icon: Users, value: "18 Províncias", label: "Cobertura nacional" },
  { icon: TrendingUp, value: "5%", label: "Comissão de transporte" },
  { icon: MapPin, value: "GPS", label: "Rastreamento em tempo real" },
  { icon: CheckCircle2, value: "10%", label: "Comissão de máquinas" },
];

export default function HomePage() {
  return (
    <div className="dark-section-wrapper">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="dark-section bg-field relative overflow-hidden">
        {/* Padrão de fileiras de campo */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(255,255,255,0.15) 28px, rgba(255,255,255,0.15) 30px)",
          }}
        />
        {/* Sombra lateral decorativa */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-field-DEFAULT/40 to-transparent hidden lg:block" />

        <div className="relative mx-auto max-w-6xl px-6 py-24">
          <div className="flex items-center gap-2 mb-6">
            <Leaf size={16} className="text-harvest" />
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-harvest">
              Plataforma AgriTech & LogTech · Angola
            </p>
          </div>

          <h1 className="text-cream text-5xl md:text-7xl leading-[1.05] mb-6 max-w-3xl">
            Da fazenda
            <br />
            à mesa,
            <br />
            <span className="text-harvest">sem perder</span>
            <br />
            a carga.
          </h1>

          <p className="max-w-xl text-cream/70 font-body text-lg mb-10">
            Marketplace agrícola, logística rural e aluguel de máquinas numa única
            plataforma — conectando agricultores, compradores, transportadores e
            cooperativas em todas as 18 províncias.
          </p>

          <div className="flex flex-wrap gap-4 mb-16">
            <Link href="/register" className="btn-harvest rounded-sm">
              <Sprout size={16} /> Criar conta gratuita
            </Link>
            <Link
              href="/transporte"
              className="border border-cream/30 text-cream px-5 py-2.5 font-mono text-sm uppercase tracking-wider inline-flex items-center gap-2 hover:border-harvest hover:text-harvest transition-colors rounded-sm"
            >
              Ver rotas de transporte <ArrowRight size={16} />
            </Link>
          </div>

          {/* Diagrama de exemplo */}
          <div className="border border-cream/15 bg-cream/5 backdrop-blur p-8 max-w-2xl rounded-sm">
            <p className="label-eyebrow text-harvest mb-6">
              Exemplo · Compartilhamento de carga
            </p>
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

      {/* ── STATS ────────────────────────────────────────────── */}
      <section className="border-b border-field/15 bg-sky-light">
        <div className="mx-auto max-w-6xl px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="bg-field/10 p-2.5 rounded-sm flex-shrink-0">
                <s.icon size={18} className="text-field" />
              </div>
              <div>
                <p className="font-display text-lg text-field">{s.value}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink/50">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── MÓDULOS ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="label-eyebrow mb-3">O que o AgroLink oferece</p>
        <h2 className="text-3xl md:text-4xl mb-3">Três módulos, uma plataforma</h2>
        <p className="font-body text-ink/55 mb-12 max-w-xl">
          Cada módulo resolve um problema real do agronegócio angolano, integrado
          numa plataforma única com pagamentos e avaliações.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.title} className={`field-card flex flex-col rounded-sm border ${p.bg}`}>
              <p className="label-eyebrow mb-4">{p.eyebrow}</p>
              <div className={`mb-4 p-2.5 rounded-sm bg-cream inline-flex w-fit`}>
                <p.icon size={24} strokeWidth={1.5} className={p.color} />
              </div>
              <h3 className={`text-2xl mb-3 ${p.color}`}>{p.title}</h3>
              <p className="font-body text-sm text-ink/65 flex-1 mb-6">{p.description}</p>
              <Link
                href={p.href}
                className={`font-mono text-xs uppercase tracking-wider ${p.color} inline-flex items-center gap-1 hover:gap-2 transition-all`}
              >
                {p.cta} <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMISSÃO ─────────────────────────────────────────── */}
      <section className="dark-section bg-earth">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="label-eyebrow text-harvest mb-4">Transparência financeira</p>
          <h2 className="text-cream text-3xl md:text-4xl mb-8">
            Como funciona a comissão
          </h2>
          <div className="grid gap-4 md:grid-cols-3 font-mono">
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
