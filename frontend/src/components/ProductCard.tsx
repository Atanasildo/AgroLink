"use client";

import { Product } from "@/lib/api";
import { MapPin, Package, MessageSquare, ShoppingCart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

function formatKz(value: string | number) {
  return new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(Number(value)) + " Kz";
}

// Map product categories/names to reliable images (CDN pexels, não requer referer)
function getProductImage(nome: string, categoria: string): string {
  const n = nome.toLowerCase();
  const c = categoria.toLowerCase();

  if (n.includes("milho") || c === "cereais")
    return "https://images.pexels.com/photos/547264/pexels-photo-547264.jpeg?auto=compress&cs=tinysrgb&w=400";
  if (n.includes("feijão") || n.includes("feijao") || c === "leguminosas")
    return "https://images.pexels.com/photos/6157051/pexels-photo-6157051.jpeg?auto=compress&cs=tinysrgb&w=400";
  if (n.includes("mandioca") || c === "tuberculos")
    return "https://images.pexels.com/photos/6157052/pexels-photo-6157052.jpeg?auto=compress&cs=tinysrgb&w=400";
  if (n.includes("tomate") || c === "hortalicas")
    return "https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg?auto=compress&cs=tinysrgb&w=400";
  if (n.includes("banana"))
    return "https://images.pexels.com/photos/2872755/pexels-photo-2872755.jpeg?auto=compress&cs=tinysrgb&w=400";
  if (n.includes("manga") || c === "frutas")
    return "https://images.pexels.com/photos/918643/pexels-photo-918643.jpeg?auto=compress&cs=tinysrgb&w=400";
  if (n.includes("soja"))
    return "https://images.pexels.com/photos/6157058/pexels-photo-6157058.jpeg?auto=compress&cs=tinysrgb&w=400";
  if (n.includes("arroz"))
    return "https://images.pexels.com/photos/4110251/pexels-photo-4110251.jpeg?auto=compress&cs=tinysrgb&w=400";
  if (n.includes("batata"))
    return "https://images.pexels.com/photos/144248/potatoes-vegetables-erdfrucht-bio-144248.jpeg?auto=compress&cs=tinysrgb&w=400";
  // Default farm
  return "https://images.pexels.com/photos/974314/pexels-photo-974314.jpeg?auto=compress&cs=tinysrgb&w=400";
}

export function ProductCard({ product }: { product: Product }) {
  const { user } = useAuth();
  const [showContact, setShowContact] = useState(false);
  const [imgError, setImgError] = useState(false);

  const canInteract = user && user.role !== "agricultor";
  // Prioridade: imagem real carregada pelo agricultor → imagem automática por categoria
  const autoImg = getProductImage(product.nome, product.categoria);
  const primaryImg = product.imagens && product.imagens.length > 0 ? product.imagens[0] : autoImg;
  const imgSrc = imgError ? autoImg : primaryImg;

  return (
    <div className="field-card flex flex-col gap-0 hover:border-field/40 transition-all duration-300 hover:shadow-md rounded-sm overflow-hidden p-0 group">
      {/* Product image */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={imgSrc}
          alt={product.nome}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute top-3 left-3">
          <span className="crop-tag bg-black/40 border-white/20 text-white backdrop-blur-sm">
            {product.categoria}
          </span>
        </div>
        <div className="absolute bottom-3 right-3 bg-harvest text-black px-2 py-1 rounded-sm font-mono font-bold text-sm">
          {formatKz(product.preco)}
          <span className="text-xs font-normal opacity-80">/{product.unidade}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <p className="font-display text-lg text-field leading-tight">{product.nome}</p>
          {product.descricao && (
            <p className="font-body text-sm text-ink/60 leading-relaxed line-clamp-2 mt-1">{product.descricao}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 text-xs font-mono text-ink/50">
          <span className="flex items-center gap-1">
            <MapPin size={11} className="text-field" />
            {product.municipio}, {product.provincia}
          </span>
          <span className="flex items-center gap-1">
            <Package size={11} className="text-harvest" />
            {Number(product.quantidade).toLocaleString("pt-AO")} {product.unidade}
          </span>
        </div>

        {/* Actions */}
        {canInteract && !showContact && (
          <button
            onClick={() => setShowContact(true)}
            className="mt-auto w-full btn-primary rounded-sm text-xs justify-center"
          >
            <ShoppingCart size={13} /> Tenho interesse
          </button>
        )}

        {canInteract && showContact && (
          <div className="mt-1 bg-field/5 border border-field/15 rounded-sm p-3 space-y-2">
            <p className="font-mono text-xs text-ink/50 uppercase tracking-wider">Contactar vendedor</p>
            <p className="font-body text-sm text-field">
              Para comprar este produto, contacte directamente o agricultor:
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Olá! Vi o seu anúncio de ${product.nome} (${formatKz(product.preco)}/${product.unidade}) no AgroLink. Tenho interesse em comprar. Podemos combinar?`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-harvest rounded-sm text-xs"
              >
                <MessageSquare size={13} /> WhatsApp
              </a>
              <button onClick={() => setShowContact(false)} className="btn-secondary rounded-sm text-xs">
                Fechar
              </button>
            </div>
            <p className="font-mono text-xs text-ink/40">
              📍 {product.municipio}, {product.provincia}
            </p>
          </div>
        )}

        {!user && (
          <a href="/login" className="mt-auto w-full btn-secondary rounded-sm text-xs justify-center text-center block">
            Entrar para contactar vendedor
          </a>
        )}
      </div>
    </div>
  );
}
