// ============================================================================
// SERVICE WORKER - AgroLink PWA
// Cache inteligente para zonas rurais com má cobertura
// ============================================================================

const CACHE_VERSION = 'v3';
const STATIC_CACHE  = `agrolink-static-${CACHE_VERSION}`;
const API_CACHE     = `agrolink-api-${CACHE_VERSION}`;
const IMAGE_CACHE   = `agrolink-images-${CACHE_VERSION}`;

// Páginas e assets que são sempre cacheados na instalação
const STATIC_ASSETS = [
  '/',
  '/marketplace',
  '/transporte',
  '/maquinas',
  '/precos',
  '/mapa',
  '/offline',
  '/manifest.json',
];

// Endpoints da API que devem ser cacheados (stale-while-revalidate)
const API_CACHE_PATTERNS = [
  /\/api\/v1\/products/,
  /\/api\/v1\/transport\/routes/,
  /\/api\/v1\/prices/,
  /\/api\/v1\/transport\/requests\/me/,
  /\/api\/v1\/machines/,
];

// ── INSTALAÇÃO ───────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVAÇÃO ────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('agrolink-') && ![STATIC_CACHE, API_CACHE, IMAGE_CACHE].includes(k))
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Só interceptar GET
  if (request.method !== 'GET') return;

  // 1. Imagens → cache-first com TTL longo
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // 2. Endpoints da API → stale-while-revalidate
  if (API_CACHE_PATTERNS.some(p => p.test(url.pathname))) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }

  // 3. Assets estáticos Next.js (_next/static) → cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 4. Navegação (páginas HTML) → network-first, fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }
});

// ── ESTRATÉGIAS DE CACHE ──────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  // Servir cache imediatamente, actualizar em background
  if (cached) {
    fetchPromise; // fire-and-forget
    return cached;
  }

  // Sem cache — esperar pela rede
  const fresh = await fetchPromise;
  if (fresh) return fresh;

  // Sem rede e sem cache — resposta de erro útil
  return new Response(
    JSON.stringify({ detail: 'Sem ligação à internet. Os dados mais recentes não estão disponíveis.' }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  );
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback para página offline
    return caches.match('/offline') || new Response('<h1>Sem ligação</h1>', { headers: { 'Content-Type': 'text/html' } });
  }
}

// ── NOTIFICAÇÕES PUSH ─────────────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();

  const titles = {
    transportador_aceita: '✅ Transportador encontrado!',
    proximo_chegada:      '📍 Chegada iminente',
    entrega_concluida:    '✅ Entrega concluída!',
    pedido_novo:          '📦 Novo pedido disponível',
    pagamento_recebido:   '💰 Pagamento recebido!',
    cancelamento:         '❌ Pedido cancelado',
  };

  event.waitUntil(
    self.registration.showNotification(
      titles[data.type] || 'AgroLink',
      {
        body:  data.body || '',
        icon:  '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag:   data.id || 'agrolink',
        data:  { url: data.url || '/' },
      }
    )
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(cs => {
      for (const c of cs) {
        if (c.url === url && 'focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// ── BACKGROUND SYNC ───────────────────────────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-transport-data') {
    event.waitUntil(
      fetch('/api/v1/transport/sync', { method: 'POST' }).catch(() => {})
    );
  }
});

// ── MENSAGENS ─────────────────────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
  }
});
