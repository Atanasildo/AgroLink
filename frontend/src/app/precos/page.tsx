"use client";

import { useEffect, useState } from "react";
import { TrendingUp, BarChart2, MapPin, RefreshCw } from "lucide-react";
import { CommodityType, PriceRecord, comparePrices, latestPrices } from "@/lib/api";

const PRODUTOS: { value: CommodityType; label: string; emoji: string }[] = [
  { value: "milho",      label: "Milho",      emoji: "🌽" },
  { value: "feijao",     label: "Feijão",     emoji: "🫘" },
  { value: "mandioca",   label: "Mandioca",   emoji: "🥔" },
  { value: "soja",       label: "Soja",       emoji: "🌱" },
  { value: "hortalicas", label: "Hortaliças", emoji: "🥬" },
];

const PROVINCIAS = [
  "Bengo","Benguela","Bié","Cabinda","Cuando Cubango",
  "Cuanza Norte","Cuanza Sul","Cunene","Huambo","Huíla",
  "Luanda","Lunda Norte","Lunda Sul","Malanje","Moxico",
  "Namibe","Uíge","Zaire",
];

function fmt(val: string | number) {
  return Number(val).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function produtoLabel(p: CommodityType) { return PRODUTOS.find((x) => x.value === p)?.label ?? p; }
function produtoEmoji(p: CommodityType) { return PRODUTOS.find((x) => x.value === p)?.emoji ?? "📦"; }

export default function PrecosPage() {
  const [tab, setTab] = useState<"latest" | "compare">("latest");
  const [produto, setProduto] = useState<CommodityType>("milho");
  const [provincia, setProvincia] = useState("");
  const [records, setRecords] = useState<PriceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const data = tab === "latest"
        ? await latestPrices({ produto, provincia: provincia || undefined })
        : await comparePrices({ produto });
      setRecords(data);
    } catch { setError("Erro ao carregar preços. Tente novamente."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [tab, produto, provincia]); // eslint-disable-line react-hooks/exhaustive-deps

  const maxPreco = records.length > 0 ? Math.max(...records.map((r) => Number(r.preco_kg))) : 1;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-harvest/10 border border-harvest/30 rounded-sm p-2">
            <TrendingUp size={20} className="text-harvest" />
          </div>
          <h1 className="font-display text-xl sm:text-2xl uppercase tracking-widest text-ink">
            Preços Agrícolas
          </h1>
        </div>
        <p className="font-mono text-xs sm:text-sm text-ink/50 uppercase tracking-wider">
          Referências de mercado actualizadas por província
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-field/20 overflow-x-auto">
        {[
          { key: "latest",  label: "Preços Actuais",   icon: TrendingUp },
          { key: "compare", label: "Comparar Regiões", icon: BarChart2 },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as "latest" | "compare")}
            className={`flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider px-3 sm:px-4 py-2.5 border-b-2 transition-colors -mb-px whitespace-nowrap ${
              tab === key ? "border-field text-field" : "border-transparent text-ink/50 hover:text-ink/70"
            }`}
          >
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-6">
        {/* Product buttons — scrollable on mobile */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap">
          {PRODUTOS.map((p) => (
            <button
              key={p.value}
              onClick={() => setProduto(p.value)}
              className={`font-mono text-xs uppercase tracking-wider px-3 py-1.5 border transition-colors rounded-sm whitespace-nowrap shrink-0 ${
                produto === p.value
                  ? "bg-field text-cream border-field"
                  : "border-field/30 text-ink/60 hover:border-field/60"
              }`}
            >
              {p.emoji} {p.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-center">
          {tab === "latest" && (
            <select
              value={provincia}
              onChange={(e) => setProvincia(e.target.value)}
              className="flex-1 sm:flex-none font-mono text-xs uppercase tracking-wider border border-field/30 bg-cream px-3 py-1.5 text-ink/70 rounded-sm focus:outline-none focus:border-field"
            >
              <option value="">Todas as províncias</option>
              {PROVINCIAS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider border border-field/30 px-3 py-1.5 text-field hover:bg-field/5 transition-colors rounded-sm shrink-0"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 border border-earth/30 bg-earth/5 px-4 py-3 font-mono text-sm text-earth">{error}</div>
      )}
      {loading && (
        <div className="text-center py-16 font-mono text-sm text-ink/40 uppercase tracking-widest animate-pulse">
          A carregar preços…
        </div>
      )}
      {!loading && !error && records.length === 0 && (
        <div className="text-center py-16 border border-field/10">
          <TrendingUp size={32} className="mx-auto text-field/20 mb-3" />
          <p className="font-mono text-sm text-ink/40 uppercase tracking-widest">Sem registos de preços para esta seleção</p>
        </div>
      )}

      {!loading && records.length > 0 && (
        <>
          {tab === "compare" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={14} className="text-field" />
                <span className="font-mono text-xs uppercase tracking-wider text-ink/50">
                  Comparação por região — {produtoEmoji(produto)} {produtoLabel(produto)} (Kz/kg)
                </span>
              </div>
              {records.slice().sort((a, b) => Number(b.preco_kg) - Number(a.preco_kg)).map((r) => {
                const pct = (Number(r.preco_kg) / maxPreco) * 100;
                return (
                  <div key={r.id} className="flex items-center gap-2 sm:gap-3">
                    <span className="font-mono text-xs text-ink/60 w-24 sm:w-32 shrink-0 text-right truncate">{r.provincia}</span>
                    <div className="flex-1 bg-field/10 rounded-sm h-7 relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-field/40 rounded-sm transition-all duration-700" style={{ width: `${pct}%` }} />
                      <span className="absolute inset-0 flex items-center px-3 font-mono text-xs font-bold text-field">{fmt(r.preco_kg)} Kz</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {records.map((r) => (
                <div key={r.id} className="border border-field/20 bg-cream p-4 hover:border-field/40 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-2xl">{produtoEmoji(r.produto)}</span>
                      <p className="font-display text-sm uppercase tracking-widest text-ink mt-1">{produtoLabel(r.produto)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xl font-bold text-field">{fmt(r.preco_kg)}</p>
                      <p className="font-mono text-[10px] text-ink/40 uppercase">Kz / kg</p>
                    </div>
                  </div>
                  <div className="border-t border-field/10 pt-3 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={11} className="text-field/50" />
                      <span className="font-mono text-xs text-ink/60">{r.provincia}</span>
                    </div>
                    {r.fonte && <p className="font-mono text-[10px] text-ink/40 truncate">Fonte: {r.fonte}</p>}
                    <p className="font-mono text-[10px] text-ink/30">{new Date(r.criado_em).toLocaleDateString("pt-AO")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-8 border border-field/10 bg-field/3 px-4 py-3">
        <p className="font-mono text-xs text-ink/40 uppercase tracking-wider">
          ℹ️ Preços indicativos recolhidos de mercados locais. Os valores podem variar consoante qualidade, época e condições de mercado.
        </p>
      </div>
    </main>
  );
}
