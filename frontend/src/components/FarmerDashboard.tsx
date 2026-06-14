"use client";

import { useEffect, useState, FormEvent } from "react";
import { Leaf, Plus, Trash2, Pencil, Save, X, Package } from "lucide-react";
import {
  Product,
  myProducts, createProduct, updateProduct, deleteProduct,
  ApiError,
} from "@/lib/api";
import { ImageUpload } from "./ImageUpload";

const categorias = [
  { value: "cereais",     label: "🌾 Cereais" },
  { value: "leguminosas", label: "🫘 Leguminosas" },
  { value: "tuberculos",  label: "🥔 Tubérculos" },
  { value: "hortalicas",  label: "🥬 Hortaliças" },
  { value: "frutas",      label: "🍊 Frutas" },
  { value: "outros",      label: "📦 Outros" },
];

const unidades = ["kg", "tonelada", "saco", "unidade", "litro"];

function formatKz(value?: string | number | null) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(Number(value)) + " Kz";
}

export function FarmerDashboard({ token }: { token: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      setProducts(await myProducts(token));
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [token]);

  if (loading) {
    return (
      <div className="text-center py-16">
        <Leaf size={28} className="text-field/30 mx-auto mb-2 animate-pulse" />
        <p className="font-mono text-sm text-ink/40">A carregar o seu painel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="border-b border-field/15 pb-6">
        <p className="label-eyebrow mb-1">Painel do Agricultor</p>
        <h2 className="text-3xl text-field">Os seus produtos</h2>
        <p className="font-body text-ink/50 mt-1">
          Gira o seu catálogo — publique, edite preços e remova produtos do mercado.
        </p>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl text-field flex items-center gap-2">
            <Package size={18} className="text-harvest" />
            Meus Produtos ({products.length})
          </h3>
          <button
            onClick={() => setShowForm(v => !v)}
            className="btn-primary rounded-sm text-xs"
          >
            <Plus size={14} />
            {showForm ? "Cancelar" : "Publicar produto"}
          </button>
        </div>

        {showForm && (
          <ProductForm token={token} onSuccess={() => { setShowForm(false); loadAll(); }} />
        )}

        {products.length === 0 && !showForm ? (
          <div className="field-card text-center py-10 rounded-sm">
            <Leaf size={28} className="text-field/25 mx-auto mb-3" />
            <p className="font-display text-xl text-field mb-1">Sem produtos publicados</p>
            <p className="font-body text-ink/45 text-sm">Publique o seu primeiro produto para aparecer no mercado.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {products.map(p => (
              <ProductManagerCard key={p.id} product={p} token={token} onChanged={loadAll} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ---- Product Form ----
function ProductForm({ token, onSuccess, initial }: {
  token: string;
  onSuccess: () => void;
  initial?: Product;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [categoria, setCategoria] = useState(initial?.categoria ?? "cereais");
  const [preco, setPreco] = useState(initial?.preco?.toString() ?? "");
  const [quantidade, setQuantidade] = useState(initial?.quantidade?.toString() ?? "");
  const [unidade, setUnidade] = useState(initial?.unidade ?? "kg");
  const [provincia, setProvincia] = useState(initial?.provincia ?? "");
  const [municipio, setMunicipio] = useState(initial?.municipio ?? "");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [imagens, setImagens] = useState<string[]>(initial?.imagens ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        nome, categoria: categoria as Product["categoria"],
        preco: Number(preco) as unknown as string,
        quantidade: Number(quantidade) as unknown as string,
        unidade: unidade as Product["unidade"],
        provincia, municipio,
        descricao: descricao || undefined,
        imagens: imagens.length > 0 ? imagens : undefined,
      };
      if (initial) {
        await updateProduct(token, initial.id, payload);
      } else {
        await createProduct(token, payload);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Erro ao guardar produto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="field-card rounded-sm mb-4">
      <p className="label-eyebrow mb-4">{initial ? "Editar produto" : "Publicar novo produto"}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Nome do produto</span>
          <input required value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Milho Branco" className="field-input rounded-sm" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Categoria</span>
          <select value={categoria} onChange={e => setCategoria(e.target.value)} className="field-input rounded-sm">
            {categorias.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Unidade</span>
          <select value={unidade} onChange={e => setUnidade(e.target.value)} className="field-input rounded-sm">
            {unidades.map(u => <option key={u}>{u}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Preço (Kz)</span>
          <input required type="number" min="1" step="0.01" value={preco} onChange={e => setPreco(e.target.value)} className="field-input rounded-sm" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Quantidade disponível</span>
          <input required type="number" min="0.01" step="0.01" value={quantidade} onChange={e => setQuantidade(e.target.value)} className="field-input rounded-sm" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Província</span>
          <input required value={provincia} onChange={e => setProvincia(e.target.value)} placeholder="Ex: Huambo" className="field-input rounded-sm" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Município</span>
          <input required value={municipio} onChange={e => setMunicipio(e.target.value)} placeholder="Ex: Caála" className="field-input rounded-sm" />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Descrição (opcional)</span>
          <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2} className="field-input rounded-sm resize-none" />
        </label>
        <div className="sm:col-span-2">
          <ImageUpload images={imagens} onChange={setImagens} maxImages={3} label="Fotos do produto" />
        </div>
      </div>
      {error && <p className="text-earth font-body text-sm mt-3">{error}</p>}
      <div className="mt-4">
        <button type="submit" disabled={loading} className="btn-harvest rounded-sm disabled:opacity-50">
          <Save size={14} />
          {loading ? "A guardar..." : initial ? "Guardar alterações" : "Publicar produto"}
        </button>
      </div>
    </form>
  );
}

// ---- Product Manager Card ----
function ProductManagerCard({ product, token, onChanged }: {
  product: Product;
  token: string;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Tem a certeza que quer remover este produto do mercado?")) return;
    setDeleting(true);
    try {
      await deleteProduct(token, product.id);
      onChanged();
    } catch { setDeleting(false); }
  }

  if (editing) {
    return (
      <div className="field-card rounded-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-xs uppercase tracking-wider text-ink/50">A editar</p>
          <button onClick={() => setEditing(false)} className="text-ink/40 hover:text-field transition-colors">
            <X size={16} />
          </button>
        </div>
        <ProductForm
          token={token}
          initial={product}
          onSuccess={() => { setEditing(false); onChanged(); }}
        />
      </div>
    );
  }

  return (
    <div className="field-card rounded-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-display text-base text-field mb-0.5">{product.nome}</p>
          <span className="crop-tag text-xs">{product.categoria}</span>
          <div className="flex flex-wrap gap-3 font-mono text-xs text-ink/50 mt-2">
            <span className="text-harvest font-bold">{formatKz(product.preco)}/{product.unidade}</span>
            <span className="flex items-center gap-1">
              <Package size={11} /> {Number(product.quantidade).toLocaleString("pt-AO")} {product.unidade}
            </span>
            <span>📍 {product.municipio}, {product.provincia}</span>
          </div>
          {product.descricao && (
            <p className="font-body text-xs text-ink/45 mt-2 leading-relaxed line-clamp-2">{product.descricao}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <button onClick={() => setEditing(true)} className="text-ink/40 hover:text-field transition-colors" title="Editar">
            <Pencil size={14} />
          </button>
          <button onClick={handleDelete} disabled={deleting} className="text-earth/60 hover:text-earth transition-colors disabled:opacity-40" title="Remover">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
