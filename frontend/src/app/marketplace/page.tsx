"use client";

import { useEffect, useState, FormEvent } from "react";
import { Search, Plus, X, Leaf } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError, Product, createProduct, listProducts } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { FarmerDashboard } from "@/components/FarmerDashboard";

const categorias = [
  { value: "", label: "Todas as categorias" },
  { value: "cereais",      label: "🌾 Cereais" },
  { value: "leguminosas",  label: "🫘 Leguminosas" },
  { value: "tuberculos",   label: "🥔 Tubérculos" },
  { value: "hortalicas",   label: "🥬 Hortaliças" },
  { value: "frutas",       label: "🍊 Frutas" },
  { value: "outros",       label: "📦 Outros" },
];

export default function MarketplacePage() {
  const { user, token } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [provincia, setProvincia] = useState("");
  const [precoMax, setPrecoMax] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function loadProducts() {
    setLoading(true);
    setError(null);
    try {
      const data = await listProducts({
        nome: nome || undefined,
        categoria: categoria || undefined,
        provincia: provincia || undefined,
        preco_max: precoMax || undefined,
      });
      setProducts(data);
    } catch {
      setError("Não foi possível carregar os produtos. Verifique se o backend está em execução.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadProducts(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function handleSearch(e: FormEvent) { e.preventDefault(); loadProducts(); }

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
          {user?.role === "agricultor" && (
            <span /> // Gerido pelo painel abaixo
          )}
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

        {showForm && token && (
          <PublishProductForm token={token} onPublished={() => { setShowForm(false); loadProducts(); }} />
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
            <div className="sm:col-span-2 lg:col-span-4">
              <button type="submit" className="btn-primary rounded-sm">
                <Search size={16} /> Pesquisar
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="flex items-start gap-3 border border-earth/25 bg-earth/8 text-earth px-4 py-3 rounded-sm mb-6">
            <span className="text-lg mt-0.5">⚠️</span>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider font-bold mb-0.5">Erro ao carregar</p>
              <p className="font-body text-sm">{error}</p>
              <button onClick={loadProducts} className="font-mono text-xs underline mt-1 hover:no-underline">
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
              Tente ajustar os filtros ou remova a pesquisa para ver todos os produtos disponíveis.
            </p>
            {(nome || categoria || provincia || precoMax) && (
              <button
                onClick={() => { setNome(""); setCategoria(""); setProvincia(""); setPrecoMax(""); setTimeout(loadProducts, 0); }}
                className="btn-secondary rounded-sm mt-5 text-xs"
              >
                <X size={13} /> Limpar filtros
              </button>
            )}
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

function PublishProductForm({ token, onPublished }: { token: string; onPublished: () => void }) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("cereais");
  const [preco, setPreco] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [unidade, setUnidade] = useState("kg");
  const [provincia, setProvincia] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createProduct(token, {
        nome, descricao: descricao || undefined, categoria,
        preco: Number(preco) as unknown as string,
        quantidade: Number(quantidade) as unknown as string,
        unidade, provincia, municipio,
      });
      onPublished();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Não foi possível publicar o produto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="field-card mb-10 rounded-sm border-harvest/30">
      <p className="label-eyebrow mb-5">Publicar novo produto</p>
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-2 lg:col-span-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Nome do produto</span>
          <input required value={nome} onChange={e => setNome(e.target.value)}
            placeholder="Ex: Milho Branco" className="field-input rounded-sm" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Categoria</span>
          <select value={categoria} onChange={e => setCategoria(e.target.value)} className="field-input rounded-sm">
            {categorias.filter(c => c.value).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Unidade</span>
          <select value={unidade} onChange={e => setUnidade(e.target.value)} className="field-input rounded-sm">
            {["kg", "tonelada", "saco", "unidade", "litro"].map(u => <option key={u}>{u}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Preço (Kz)</span>
          <input required type="number" min="0.01" step="0.01" value={preco}
            onChange={e => setPreco(e.target.value)} className="field-input rounded-sm" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Quantidade</span>
          <input required type="number" min="0.01" step="0.01" value={quantidade}
            onChange={e => setQuantidade(e.target.value)} className="field-input rounded-sm" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Província</span>
          <input required value={provincia} onChange={e => setProvincia(e.target.value)}
            placeholder="Ex: Huambo" className="field-input rounded-sm" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Município</span>
          <input required value={municipio} onChange={e => setMunicipio(e.target.value)}
            placeholder="Ex: Caála" className="field-input rounded-sm" />
        </label>
        <label className="flex flex-col gap-2 lg:col-span-4">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Descrição (opcional)</span>
          <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3}
            className="field-input rounded-sm" />
        </label>
        {error && <p className="text-earth font-body text-sm lg:col-span-4">{error}</p>}
        <div className="lg:col-span-4">
          <button type="submit" disabled={loading} className="btn-harvest rounded-sm disabled:opacity-50">
            {loading ? "A publicar..." : "Publicar produto"}
          </button>
        </div>
      </form>
    </div>
  );
}
