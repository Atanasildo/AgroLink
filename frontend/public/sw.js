// public/sw.js
// ============================================================================
// SERVICE WORKER - NOTIFICAÇÕES PUSH
// AgroLink - Transporte Rural
// ============================================================================

const CACHE_NAME = 'agrolink-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/js/app.js'
];

// ============================================================================
// INSTALAÇÃO
// ============================================================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// ============================================================================
// ATIVAÇÃO
// ============================================================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ============================================================================
// NOTIFICAÇÕES PUSH
// ============================================================================

/**
 * Tipos de notificações que podem ser recebidas:
 */

self.addEventListener('push', event => {
  if (!event.data) {
    console.log('Push recebido sem dados');
    return;
  }

  const data = event.data.json();
  
  const notificationOptions = {
    body: data.body || 'Nova notificação AgroLink',
    icon: '/images/agrolink-icon-192x192.png',
    badge: '/images/agrolink-badge-72x72.png',
    tag: data.id || 'agrolink-notification',
    requireInteraction: data.requireInteraction || false,
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.id,
      transporte_id: data.transport_id,
      action: data.action
    }
  };

  // Diferentes tipos de notificações
  switch (data.type) {
    case 'transportador_aceita':
      notificationOptions.title = '✓ Transportador Encontrado!';
      notificationOptions.body = `${data.transporter_name} aceitou seu pedido de transporte`;
      notificationOptions.icon = '/images/icons/truck-check.png';
      notificationOptions.badge = '/images/icons/truck-check-small.png';
      notificationOptions.tag = `transport-${data.transport_id}`;
      break;

    case 'proximo_chegada':
      notificationOptions.title = '📍 Chegada Iminente';
      notificationOptions.body = `${data.transporter_name} está a ${data.minutes_away} minutos de distância`;
      notificationOptions.icon = '/images/icons/location.png';
      notificationOptions.requireInteraction = true;
      break;

    case 'entrega_concluida':
      notificationOptions.title = '✓ Entrega Concluída!';
      notificationOptions.body = `Seu pedido foi entregue com sucesso`;
      notificationOptions.icon = '/images/icons/check-circle.png';
      break;

    case 'avaliar':
      notificationOptions.title = '⭐ Avaliar Transporte';
      notificationOptions.body = `Por favor, avalie o transportador ${data.transporter_name}`;
      notificationOptions.requireInteraction = true;
      break;

    case 'pedido_novo':
      notificationOptions.title = '📦 Novo Pedido Disponível';
      notificationOptions.body = `${data.quantity} ${data.unit} de ${data.product} de ${data.origin} para ${data.destination}`;
      notificationOptions.icon = '/images/icons/package.png';
      break;

    case 'pagamento_recebido':
      notificationOptions.title = '💰 Pagamento Recebido!';
      notificationOptions.body = `Você recebeu ${data.amount} pela entrega completa`;
      notificationOptions.icon = '/images/icons/money.png';
      break;

    case 'cancelamento':
      notificationOptions.title = '❌ Transporte Cancelado';
      notificationOptions.body = data.reason || 'O transporte foi cancelado';
      notificationOptions.icon = '/images/icons/cancel.png';
      break;

    default:
      notificationOptions.title = 'AgroLink - Transporte Rural';
  }

  event.waitUntil(
    self.registration.showNotification(notificationOptions.title, notificationOptions)
  );
});

// ============================================================================
// CLIQUE EM NOTIFICAÇÃO
// ============================================================================

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const data = event.notification.data;
  let urlToOpen = '/';

  // Redirecionar para a página apropriada baseado no tipo
  if (data.transport_id) {
    urlToOpen = `/transport/${data.transport_id}`;
  } else if (data.action === 'rate') {
    urlToOpen = `/transport/${data.transport_id}/rate`;
  }

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      // Verificar se já existe uma aba com a página
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Caso contrário, abrir uma nova aba
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ============================================================================
// FETCH COM CACHE
// ============================================================================

self.addEventListener('fetch', event => {
  // GET requests apenas
  if (event.request.method !== 'GET') {
    return;
  }

  // Estratégia: Cache first, fallback to network
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request).then(response => {
          // Não cachear se não é uma resposta válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clonar a resposta
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // Fallback offline - retornar página de offline
        return caches.match('/offline.html');
      })
  );
});

// ============================================================================
// MENSAGENS DO CLIENTE
// ============================================================================

self.addEventListener('message', event => {
  const data = event.data;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME);
  }

  if (data.type === 'PING') {
    event.ports[0].postMessage({ success: true });
  }
});

// ============================================================================
// SINCRONIZAÇÃO BACKGROUND (Para quando reconectar à internet)
// ============================================================================

self.addEventListener('sync', event => {
  if (event.tag === 'sync-transport-data') {
    event.waitUntil(
      // Sincronizar dados de transporte
      fetch('/api/v1/transport/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
        .then(response => response.json())
        .then(data => {
          // Notificar clientes que sincronizou
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'SYNC_COMPLETE',
                data: data
              });
            });
          });
        })
        .catch(error => {
          console.error('Erro ao sincronizar:', error);
          // Retry mais tarde
          return Promise.reject(error);
        })
    );
  }
});

console.log('Service Worker carregado e ativo');
