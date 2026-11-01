"use client";

import { useEffect, useState, FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, X, Leaf } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError, Product, listProducts, getUser, User } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { FarmerDashboard } from "@/components/FarmerDashboard";
import Link from "next/link";

const categorias = [
  { value: "", label: "Todas as categorias" },
  { value: "cereais",      label: "🌾 Cereais" },
  { value: "leguminosas",  label: "🫘 Leguminosas" },
  { value: "tuberculos",   label: "🥔 Tubérculos" },
  { value: "hortalicas",   label: "🥬 Hortaliças" },
  { value: "frutas",       label: "🍊 Frutas" },
  { value: "outros",       label: "📦 Outros" },
];

function MarketplaceInner() {
  const { user, token } = useAuth();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [provincia, setProvincia] = useState("");
  const [precoMax, setPrecoMax] = useState("");

  // Filtro por agricultor vindo do perfil público
  const [agricultorId, setAgricultorId] = useState<string | null>(null);
  const [agricultorNome, setAgricultorNome] = useState<string | null>(null);

  // Inicializar filtro agricultorId a partir do query param
  useEffect(() => {
    const aid = searchParams.get("agricultor_id");
    if (aid) {
      setAgricultorId(aid);
      getUser(aid)
        .then((u) => setAgricultorNome(u.nome))
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProducts(aid?: string | null) {
    setLoading(true);
    setError(null);
    try {
      const data = await listProducts({
        nome: nome || undefined,
        categoria: categoria || undefined,
        provincia: provincia || undefined,
        preco_max: precoMax || undefined,
        agricultor_id: (aid !== undefined ? aid : agricultorId) || undefined,
      });
      setProducts(data);
    } catch {
      setError("Não foi possível carregar os produtos. Verifique se o backend está em execução.");
    } finally {
      setLoading(false);
    }
  }

  // Carregar quando agricultorId estiver definido (ou vazio)
  useEffect(() => {
    loadProducts(agricultorId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agricultorId]);

  function handleSearch(e: FormEvent) { e.preventDefault(); loadProducts(); }

  function clearAgricultorFilter() {
    setAgricultorId(null);
    setAgricultorNome(null);
    // Limpar URL sem reload
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/marketplace");
    }
    loadProducts(null);
  }

  return (
    <div>
      {/* Page header */}
      <div className="border-b border-field/15 bg-sky-light">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl text-field">Mercado Agrícola</h1>
            <p className="font-body text-ink/55 mt-1">
              Produtos frescos directamente dos agricultores angolanos
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
        {/* Painel do agricultor */}
        {user?.role === "agricultor" && token && (
          <div className="mb-14">
            <FarmerDashboard token={token} />
            <div className="border-b border-field/15 mt-14 mb-2" />
            <p className="label-eyebrow mt-6 mb-6">Catálogo público do mercado</p>
          </div>
        )}

        {/* Banner filtro por agricultor */}
        {agricultorId && agricultorNome && (
          <div className="flex items-center justify-between gap-3 bg-field/8 border border-field/20 rounded-sm px-4 py-3 mb-6">
            <p className="font-mono text-xs text-field">
              A mostrar produtos de <strong>{agricultorNome}</strong>
            </p>
            <div className="flex items-center gap-3">
              <Link href={`/perfil/${agricultorId}`} className="font-mono text-xs text-field/60 hover:text-field underline-offset-2 hover:underline">
                Ver perfil
              </Link>
              <button onClick={clearAgricultorFilter} className="font-mono text-xs text-earth hover:text-earth/80 flex items-center gap-1">
                <X size={12} /> Ver todos
              </button>
            </div>
          </div>
        )}

        {/* Filtros */}
        <form onSubmit={handleSearch} className="field-card mb-10 rounded-sm">
          <p className="label-eyebrow mb-4">Filtrar produtos</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-2 lg:col-span-2">
              <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Produto</span>
              <input value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Ex: Milho, Feijão, Mandioca..."
                className="field-input rounded-sm" />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Categoria</span>
              <select value={categoria} onChange={e => setCategoria(e.target.value)}
                className="field-input rounded-sm">
                {categorias.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Província</span>
              <input value={provincia} onChange={e => setProvincia(e.target.value)}
                placeholder="Ex: Huambo"
                className="field-input rounded-sm" />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Preço máx. (Kz)</span>
              <input type="number" value={precoMax} onChange={e => setPrecoMax(e.target.value)}
                placeholder="Sem limite"
                className="field-input rounded-sm" />
            </label>
            <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-3">
              <button type="submit" className="btn-primary rounded-sm">
                <Search size={16} /> Pesquisar
              </button>
              {(nome || categoria || provincia || precoMax) && (
                <button type="button" onClick={() => { setNome(""); setCategoria(""); setProvincia(""); setPrecoMax(""); setTimeout(() => loadProducts(), 0); }}
                  className="btn-secondary rounded-sm text-xs">
                  <X size={13} /> Limpar filtros
                </button>
              )}
            </div>
          </div>
        </form>

        {error && (
          <div className="flex items-start gap-3 border border-earth/25 bg-earth/8 text-earth px-4 py-3 rounded-sm mb-6">
            <span className="text-lg mt-0.5">⚠️</span>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider font-bold mb-0.5">Erro ao carregar</p>
              <p className="font-body text-sm">{error}</p>
              <button onClick={() => loadProducts()} className="font-mono text-xs underline mt-1 hover:no-underline">
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-card animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="skeleton-img" />
                <div className="p-4 flex flex-col gap-3">
                  <div className="skeleton-text w-3/4" />
                  <div className="skeleton-text-sm w-full" />
                  <div className="skeleton-text-sm w-1/2" />
                  <div className="skeleton h-9 w-full mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state field-card rounded-sm">
            <div className="empty-state-icon">
              <Leaf size={28} className="text-field/50" />
            </div>
            <p className="empty-state-title">Nenhum produto encontrado</p>
            <p className="empty-state-desc">
              {agricultorId
                ? "Este agricultor ainda não tem produtos publicados."
                : "Tente ajustar os filtros ou remova a pesquisa para ver todos os produtos disponíveis."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
            {products.map((p, i) => (
              <div key={p.id} style={{ animationDelay: `${i * 40}ms` }} className="animate-fade-in">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={null}>
      <MarketplaceInner />
    </Suspense>
  );
}
