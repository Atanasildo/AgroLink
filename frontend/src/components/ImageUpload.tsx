"use client";

/**
 * Componente reutilizável de upload de imagens.
 * - Aceita até `maxImages` imagens (default: 3)
 * - Converte para base64 e armazena como array de strings
 * - Mostra preview com botão de remoção
 * - Aceita jpg, png, webp até 2 MB por imagem
 */

import { useRef, useState } from "react";
import { Camera, X, ImagePlus } from "lucide-react";

interface ImageUploadProps {
  images: string[];           // array de base64 strings
  onChange: (imgs: string[]) => void;
  maxImages?: number;
  label?: string;
}

export function ImageUpload({ images, onChange, maxImages = 3, label = "Fotos" }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    setError(null);

    const remaining = maxImages - images.length;
    if (remaining <= 0) {
      setError(`Máximo de ${maxImages} imagem(ns) atingido.`);
      return;
    }

    const toProcess = Array.from(files).slice(0, remaining);
    const results: string[] = [];

    for (const file of toProcess) {
      if (!file.type.startsWith("image/")) {
        setError("Apenas imagens são permitidas (jpg, png, webp).");
        continue;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError("Cada imagem deve ter menos de 2 MB.");
        continue;
      }
      const base64 = await toBase64(file);
      results.push(base64);
    }

    if (results.length > 0) {
      onChange([...images, ...results]);
    }

    // reset input so the same file can be selected again
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-xs uppercase tracking-wider text-ink/50">
        {label} {images.length > 0 && `(${images.length}/${maxImages})`}
      </span>

      <div className="flex flex-wrap gap-2 items-start">
        {/* Thumbnails */}
        {images.map((src, i) => (
          <div key={i} className="relative w-20 h-20 rounded-sm overflow-hidden border border-field/20 bg-ink/5 flex-shrink-0">
            <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 transition-colors"
              aria-label="Remover foto"
            >
              <X size={11} />
            </button>
          </div>
        ))}

        {/* Add button */}
        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-field/30 hover:border-field/60 rounded-sm text-field/50 hover:text-field/80 transition-colors bg-field/3 hover:bg-field/8 flex-shrink-0"
          >
            <ImagePlus size={18} />
            <span className="font-mono text-[9px] uppercase tracking-wider">Adicionar</span>
          </button>
        )}
      </div>

      {error && <p className="text-earth font-body text-xs">{error}</p>}
      <p className="font-mono text-[10px] text-ink/35">JPG, PNG ou WEBP · máx. 2 MB por imagem</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  );
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
