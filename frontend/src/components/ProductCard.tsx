import { Product } from "@/lib/api";
import { MapPin, Package } from "lucide-react";

export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="field-card flex flex-col gap-3 hover:border-field/40 transition-colors rounded-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg text-field leading-tight">{product.nome}</p>
          <span className="crop-tag mt-1">{product.categoria}</span>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-mono text-xl text-harvest font-bold">
            {Number(product.preco).toLocaleString("pt-AO")} Kz
          </p>
          <p className="font-mono text-xs text-ink/50">/{product.unidade}</p>
        </div>
      </div>

      {product.descricao && (
        <p className="font-body text-sm text-ink/60 leading-relaxed">{product.descricao}</p>
      )}

      <div className="h-px bg-field/10" />

      <div className="flex flex-wrap gap-3 text-xs font-mono text-ink/50">
        <span className="flex items-center gap-1">
          <MapPin size={11} className="text-field" />
          {product.municipio}, {product.provincia}
        </span>
        <span className="flex items-center gap-1">
          <Package size={11} className="text-harvest" />
          {Number(product.quantidade).toLocaleString("pt-AO")} {product.unidade} disponíveis
        </span>
      </div>
    </div>
  );
}
