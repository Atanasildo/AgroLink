# AgroLink — Web (Next.js)

Frontend web responsivo do AgroLink, construído com Next.js (App Router) + TypeScript + Tailwind CSS.

## Identidade visual

O design parte da metáfora de uma **guia de carga / waybill**: cartões com bordas perfuradas,
linhas de rota tracejadas, carimbos circulares e tipografia industrial — refletindo o módulo de
Transporte Rural, prioridade máxima do produto.

- **Cores**: `paper` (papel de manifesto), `soil` (tinta escura), `clay` (carimbo/rota), `gold`
  (destaque), `leaf` (valores líquidos/agro).
- **Tipografia**: Big Shoulders Display (títulos), Inter (corpo), JetBrains Mono (dados, rótulos).

## Páginas implementadas

- `/` — Landing page com diagrama de rota e exemplo de cálculo de comissão
- `/login` e `/register` — Autenticação (todos os perfis de utilizador)
- `/marketplace` — Pesquisa de produtos com filtros + publicação (agricultores)
- `/transporte` — Busca de rotas, solicitação de transporte e acompanhamento de status/comissão

## Como executar

```bash
npm install
cp .env.example .env.local   # ajuste NEXT_PUBLIC_API_URL se necessário
npm run dev
```

A aplicação assume que o backend está disponível em `http://localhost:8000/api/v1`
(ver `../backend`).

## Notas

- Vulnerabilidades remanescentes do `npm audit` no Next.js 14.2.x relacionadas a Server
  Components / Image Optimizer só são resolvidas na major 15 (requer React 19). Como este
  projeto não usa `next/image` nem Server Actions, o risco prático é baixo — mas vale planear
  a migração para Next 15 no roadmap.
- Autenticação usa `sessionStorage` para o access token (sessão por aba/janela). Para
  produção, considerar refresh automático via `refresh_token` e cookies httpOnly.

## Próximos passos

- Páginas de perfil, chat (WebSocket), aluguel de máquinas, mapa (Leaflet/OpenStreetMap) e
  painel administrativo.
