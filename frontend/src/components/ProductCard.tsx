"use client";

import { Product } from "@/lib/api";
import { MapPin, Package, Phone, MessageSquare, ShoppingCart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

function formatKz(value: string | number) {
  return new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(Number(value)) + " Kz";
}

export function ProductCard({ product }: { product: Product }) {
  const { user } = useAuth();
  const [showContact, setShowContact] = useState(false);

  const canInteract = user && user.role !== "agricultor";

  return (
    <div className="field-card flex flex-col gap-3 hover:border-field/40 transition-colors rounded-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg text-field leading-tight">{product.nome}</p>
          <span className="crop-tag mt-1">{product.categoria}</span>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-mono text-xl text-harvest font-bold">{formatKz(product.preco)}</p>
          <p className="font-mono text-xs text-ink/50">/{product.unidade}</p>
        </div>
      </div>

      {product.descricao && (
        <p className="font-body text-sm text-ink/60 leading-relaxed line-clamp-3">{product.descricao}</p>
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

      {/* Buyer / transport / machine-owner actions */}
      {canInteract && !showContact && (
        <button
          onClick={() => setShowContact(true)}
          className="mt-1 w-full btn-primary rounded-sm text-xs justify-center"
        >
          <ShoppingCart size={13} /> Tenho interesse
        </button>
      )}

      {canInteract && showContact && (
        <div className="mt-1 bg-field/5 border border-field/15 rounded-sm p-3 space-y-2">
          <p className="font-mono text-xs text-ink/50 uppercase tracking-wider">Contactar vendedor</p>
          <p className="font-body text-sm text-field">
            Para comprar este produto, contacte diretamente o agricultor:
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
            <button
              onClick={() => setShowContact(false)}
              className="btn-secondary rounded-sm text-xs"
            >
              Fechar
            </button>
          </div>
          <p className="font-mono text-xs text-ink/40">
            📍 {product.municipio}, {product.provincia}
          </p>
        </div>
      )}

      {!user && (
        <a href="/login" className="mt-1 w-full btn-secondary rounded-sm text-xs justify-center text-center block">
          Entrar para contactar vendedor
        </a>
      )}
    </div>
  );
}
