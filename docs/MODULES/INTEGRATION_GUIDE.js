// ============================================================================
// GUIA DE INTEGRAÇÃO - MÓDULO 3: TRANSPORTE RURAL
// AgroLink - Especificação Técnica Completa
// ============================================================================

/**
 * ESTRUTURA DE INTEGRAÇÃO
 * 
 * Este documento detalha como integrar o componente TransportModule.jsx
 * com o backend FastAPI, incluindo:
 * - Endpoints REST para CRUD de transportes
 * - WebSocket para rastreamento GPS em tempo real
 * - Cálculos de comissão automáticos
 * - Notificações push
 */

// ============================================================================
// 1. ENDPOINTS REST - API FastAPI
// ============================================================================

/**
 * BASE_URL = http://localhost:8000/api/v1
 */

// ---- PEDIDOS DE TRANSPORTE ----

/**
 * POST /transport/requests
 * Criar novo pedido de transporte
 * 
 * Request:
 * {
 *   "origin": "Kilamba, Luanda",
 *   "destination": "Viana, Luanda",
 *   "product_id": "prod_001",
 *   "quantity": 5,
 *   "unit": "toneladas",
 *   "weight": 5000,  // em kg
 *   "scheduled_date": "2024-06-14T14:00:00",
 *   "notes": "Produto frágil, manusear com cuidado"
 * }
 * 
 * Response:
 * {
 *   "id": "TRN001",
 *   "status": "pendente",
 *   "farmer_id": "farm_001",
 *   "price_quote": 125000,
 *   "commission": {
 *     "percentage": 5,
 *     "amount": 6250,
 *     "for_platform": 6250,
 *     "for_transporter": 118750
 *   },
 *   "created_at": "2024-06-14T10:30:00"
 * }
 */

/**
 * GET /transport/requests/{request_id}
 * Obter detalhes de um pedido específico
 * 
 * Response: Objeto completo do pedido com transportador associado
 */

/**
 * GET /transport/requests?status=pendente&farmer_id=farm_001
 * Listar pedidos com filtros
 * 
 * Query Parameters:
 * - status: "pendente", "aceite", "em_andamento", "concluido", "cancelado"
 * - farmer_id: ID do agricultor
 * - transporter_id: ID do transportador
 * - skip: 0
 * - limit: 20
 * 
 * Response: Array de pedidos
 */

/**
 * PUT /transport/requests/{request_id}
 * Atualizar pedido (apenas agricultor ou admin)
 * 
 * Request:
 * {
 *   "status": "cancelado",
 *   "notes": "Produtor não pode cumprir com horário"
 * }
 */

// ---- ACEITAÇÃO E GERENCIAMENTO DE PEDIDOS ----

/**
 * POST /transport/requests/{request_id}/accept
 * Transportador aceita um pedido
 * 
 * Request:
 * {
 *   "transporter_id": "TRPT001",
 *   "vehicle_id": "VEH001",
 *   "estimated_eta": "14:45"
 * }
 * 
 * Response:
 * {
 *   "status": "aceite",
 *   "transporter": {...},
 *   "vehicle": {...},
 *   "payment_reserved": true,
 *   "commission_reserved": 6250
 * }
 */

/**
 * POST /transport/requests/{request_id}/cancel
 * Cancelar pedido (agricultor ou transportador)
 * 
 * Request:
 * {
 *   "reason": "Mudança de planos",
 *   "refund_percentage": 100
 * }
 */

// ---- RASTREAMENTO E LOCALIZAÇÃO ----

/**
 * GET /transport/requests/{request_id}/tracking
 * Obter últimas coordenadas GPS do transporte
 * 
 * Response:
 * {
 *   "id": "TRN001",
 *   "status": "em_andamento",
 *   "current_location": {
 *     "latitude": -8.8550,
 *     "longitude": 13.2100,
 *     "speed": 45,
 *     "direction": "NE",
 *     "timestamp": "2024-06-14T13:45:30"
 *   },
 *   "eta": "14:45",
 *   "load_points": [
 *     {
 *       "sequence": 1,
 *       "location": {...},
 *       "status": "completed",
 *       "completed_at": "11:00"
 *     },
 *     {
 *       "sequence": 2,
 *       "location": {...},
 *       "status": "in_progress",
 *       "estimated_completion": "14:00"
 *     }
 *   ]
 * }
 */

/**
 * GET /transport/requests/{request_id}/route-history
 * Obter histórico completo de rota
 * 
 * Response:
 * {
 *   "total_distance": 15.3,
 *   "waypoints": [
 *     { "lat": ..., "lng": ..., "timestamp": "..." },
 *     ...
 *   ]
 * }
 */

// ---- AVALIAÇÕES E COMISSÕES ----

/**
 * POST /transport/requests/{request_id}/rate
 * Avaliar transporte (agricultor ou transportador)
 * 
 * Request:
 * {
 *   "rating": 5,
 *   "criteria": {
 *     "trust": 5,
 *     "quality": 5,
 *     "punctuality": 5,
 *     "service": 5
 *   },
 *   "comment": "Excelente serviço!"
 * }
 */

/**
 * GET /transport/requests/{request_id}/commission-details
 * Obter detalhes da comissão
 * 
 * Response:
 * {
 *   "total_value": 125000,
 *   "service_fee_percentage": 5,
 *   "service_fee_amount": 6250,
 *   "transporter_receives": 118750,
 *   "payment_status": "pending",
 *   "payment_method": "bank_transfer",
 *   "expected_payout_date": "2024-06-16"
 * }
 */

// ---- TRANSPORTADORES ----

/**
 * POST /transporters/register
 * Registrar novo transportador
 * 
 * Request:
 * {
 *   "name": "Transportes Kamba",
 *   "phone": "+244 923 111 222",
 *   "email": "kamba@transport.ao",
 *   "identification": "123456789",
 *   "vehicles": [
 *     {
 *       "type": "Caminhão 10t",
 *       "capacity": 10000,
 *       "plate": "LU-25-AB",
 *       "registration": "REG123"
 *     }
 *   ]
 * }
 */

/**
 * GET /transporters/nearby?lat=-8.8383&lng=13.2344&radius=50
 * Buscar transportadores próximos (para sugestão)
 * 
 * Query Parameters:
 * - lat: latitude
 * - lng: longitude
 * - radius: raio em km
 * - available: true/false
 * 
 * Response: Array de transportadores ordenados por proximidade
 */

/**
 * GET /transporters/{transporter_id}/earnings
 * Dashboard de ganhos do transportador
 * 
 * Query Parameters:
 * - period: "today", "week", "month"
 * 
 * Response:
 * {
 *   "total_earnings": 1350000,
 *   "today": 450000,
 *   "completed_trips": 12,
 *   "average_rating": 4.8,
 *   "active_shipments": 2,
 *   "capacity_utilization": 75,
 *   "vehicle_breakdown": [...]
 * }
 */

/**
 * POST /transporters/{transporter_id}/publish-route
 * Publicar rota aberta para compartilhamento de carga
 * 
 * Request:
 * {
 *   "vehicle_id": "VEH001",
 *   "origin": "Kilamba",
 *   "destination": "Viana",
 *   "departure_time": "2024-06-14T15:00:00",
 *   "available_capacity": 5000,
 *   "price_per_tonelada": 25000
 * }
 */

/**
 * POST /transporters/{transporter_id}/vehicles
 * Registrar novo veículo
 * 
 * Request:
 * {
 *   "type": "Trator de carga",
 *   "capacity": 3000,
 *   "plate": "LU-30-XY",
 *   "registration_number": "REG456",
 *   "insurance_valid_until": "2025-06-14"
 * }
 */

// ---- PAGAMENTOS ----

/**
 * POST /payments/create
 * Criar transação de pagamento
 * 
 * Request:
 * {
 *   "transport_request_id": "TRN001",
 *   "amount": 125000,
 *   "payment_method": "multicaixa",
 *   "farmer_id": "farm_001"
 * }
 * 
 * Response:
 * {
 *   "payment_id": "PAY001",
 *   "status": "pending",
 *   "redirect_url": "https://multicaixa.ao/pay/...",
 *   "amount": 125000
 * }
 */

/**
 * GET /payments/{payment_id}/status
 * Verificar status de pagamento
 */

/**
 * POST /payments/{payment_id}/confirm
 * Confirmar pagamento após aprovação Multicaixa
 */

/**
 * POST /payments/payout
 * Transferir valores para conta do transportador
 * 
 * Request:
 * {
 *   "transporter_id": "TRPT001",
 *   "amount": 118750,
 *   "bank_account": "000123456789"
 * }
 */

// ============================================================================
// 2. WEBSOCKET - RASTREAMENTO EM TEMPO REAL
// ============================================================================

/**
 * CONEXÃO:
 * ws://localhost:8000/ws/transport/{request_id}/{user_id}
 * 
 * AUTENTICAÇÃO:
 * Header: Authorization: Bearer {jwt_token}
 */

/**
 * EVENTOS QUE O SERVIDOR ENVIA:
 */

// Atualização de localização GPS
const wsLocationUpdate = {
  type: 'location_update',
  data: {
    request_id: 'TRN001',
    latitude: -8.8550,
    longitude: 13.2100,
    speed: 45,
    direction: 'NE',
    timestamp: '2024-06-14T13:45:30'
  }
};

// Notificação de aceitação
const wsAcceptanceNotification = {
  type: 'request_accepted',
  data: {
    request_id: 'TRN001',
    transporter: {
      id: 'TRPT001',
      name: 'Transportes Kamba',
      rating: 4.8,
      vehicle: { plate: 'LU-25-AB', type: 'Caminhão' }
    },
    eta: '14:45'
  }
};

// Mudança de status
const wsStatusChange = {
  type: 'status_changed',
  data: {
    request_id: 'TRN001',
    old_status: 'aceite',
    new_status: 'em_andamento',
    timestamp: '2024-06-14T11:00:00'
  }
};

// Ponto de carga completado
const wsLoadPointCompleted = {
  type: 'load_point_completed',
  data: {
    request_id: 'TRN001',
    load_point_id: 'LP001',
    sequence: 1,
    completed_at: '2024-06-14T11:00:00'
  }
};

// Notificação de chegada iminente
const wsArrivalNotification = {
  type: 'arrival_imminent',
  data: {
    request_id: 'TRN001',
    minutes_until_arrival: 5,
    current_location: { lat: -8.9150, lng: 13.1950 }
  }
};

/**
 * EVENTOS QUE O CLIENTE ENVIA:
 */

// Solicitar atualização manual
client.send(JSON.stringify({
  type: 'request_update',
  data: { request_id: 'TRN001' }
}));

// Enviar mensagem no chat do transporte
client.send(JSON.stringify({
  type: 'chat_message',
  data: {
    request_id: 'TRN001',
    message: 'Estou chegando em 10 minutos',
    sender_id: 'farm_001',
    sender_type: 'farmer'
  }
}));

// ============================================================================
// 3. IMPLEMENTAÇÃO NO FRONTEND (React Hooks)
// ============================================================================

/**
 * Hook: useTransportTracking
 * Gerencia conexão WebSocket e atualizações de rastreamento
 */
export function useTransportTracking(requestId, userId, token) {
  const [location, setLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [status, setStatus] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket(
      `ws://localhost:8000/ws/transport/${requestId}/${userId}?token=${token}`
    );

    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket conectado');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'location_update':
          setLocation(message.data);
          break;
        case 'status_changed':
          setStatus(message.data.new_status);
          break;
        case 'eta_updated':
          setEta(message.data.eta);
          break;
        default:
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('Erro WebSocket:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    wsRef.current = ws;
    return () => ws.close();
  }, [requestId, userId, token]);

  return { location, eta, status, isConnected };
}

/**
 * Hook: useTransportOrders
 * Busca e gerencia lista de pedidos
 */
export function useTransportOrders(userType = 'farmer', token) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filters.status) query.append('status', filters.status);
      if (filters.skip) query.append('skip', filters.skip);
      if (filters.limit) query.append('limit', filters.limit);

      const response = await fetch(
        `http://localhost:8000/api/v1/transport/requests?${query}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Erro ao buscar pedidos');
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const createOrder = useCallback(async (formData) => {
    try {
      const response = await fetch(
        'http://localhost:8000/api/v1/transport/requests',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        }
      );

      if (!response.ok) throw new Error('Erro ao criar pedido');
      const newOrder = await response.json();
      setOrders([newOrder, ...orders]);
      return newOrder;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [token, orders]);

  const acceptOrder = useCallback(async (orderId, transporterId) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/transport/requests/${orderId}/accept`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ transporter_id: transporterId })
        }
      );

      if (!response.ok) throw new Error('Erro ao aceitar pedido');
      const updatedOrder = await response.json();
      
      // Atualizar lista local
      setOrders(orders.map(o => o.id === orderId ? updatedOrder : o));
      return updatedOrder;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [token, orders]);

  return { orders, loading, error, fetchOrders, createOrder, acceptOrder };
}

// ============================================================================
// 4. CÁLCULO DE COMISSÃO (Backend Logic)
// ============================================================================

/**
 * A comissão é calculada automaticamente no backend:
 * 
 * 1. Preço Base = distância * taxa_por_km + produto_peso * taxa_por_kg
 * 2. Comissão = Preço Base * 5%
 * 3. Para Agricultor = Preço Base (o agricultor paga a comissão)
 * 4. Para Transportador = Preço Base - Comissão
 * 
 * Exemplo:
 * - Transporte: 125.000 Kz
 * - Comissão (5%): 6.250 Kz
 * - Agricultor paga: 125.000 Kz
 * - Transportador recebe: 118.750 Kz
 * - AgroLink recebe: 6.250 Kz
 */

class CommissionCalculator {
  constructor(basePricePerKm = 500, basePricePerKg = 20) {
    this.basePricePerKm = basePricePerKm;
    this.basePricePerKg = basePricePerKg;
    this.commissionPercentage = 5; // 5%
  }

  calculate(distance, weight, additionalFees = 0) {
    const distanceCost = distance * this.basePricePerKm;
    const weightCost = weight * this.basePricePerKg;
    const basePrice = distanceCost + weightCost + additionalFees;

    const commissionAmount = basePrice * (this.commissionPercentage / 100);

    return {
      basePrice,
      commissionPercentage: this.commissionPercentage,
      commissionAmount,
      forPlatform: commissionAmount,
      forTransporter: basePrice - commissionAmount,
      breakdown: {
        distanceCost,
        weightCost,
        additionalFees
      }
    };
  }
}

// Uso:
const calculator = new CommissionCalculator();
const commission = calculator.calculate(15.3, 5000, 0);
console.log(commission);

// ============================================================================
// 5. NOTIFICAÇÕES PUSH
// ============================================================================

/**
 * Quando um evento importante acontece, o servidor envia notificação push:
 * 
 * - Transportador aceita pedido
 * - Transportador está próximo
 * - Entrega completada
 * - Avaliação pendente
 */

async function subscribeToNotifications(token) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications não suportadas');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.REACT_APP_PUBLIC_VAPID_KEY
    });

    // Enviar subscription para o backend
    await fetch('http://localhost:8000/api/v1/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(subscription)
    });

    console.log('Inscrição em notificações bem-sucedida');
  } catch (error) {
    console.error('Erro ao inscrever em notificações:', error);
  }
}

// ============================================================================
// 6. FLUXO COMPLETO DE UM TRANSPORTE
// ============================================================================

/**
 * PASSO 1: Agricultor cria pedido
 * POST /transport/requests
 * Status: "pendente"
 * 
 * PASSO 2: Sistema calcula preço e comissão
 * - Distância: 15.3 km
 * - Peso: 5000 kg
 * - Preço Base: 125.000 Kz
 * - Comissão: 6.250 Kz (5%)
 * 
 * PASSO 3: Notificação para transportadores próximos
 * WebSocket broadcast para todos os transportadores na região
 * 
 * PASSO 4: Transportador aceita pedido
 * POST /transport/requests/{id}/accept
 * Status: "aceite"
 * WebSocket: Notificação ao agricultor
 * 
 * PASSO 5: Transportador começa o transporte
 * Status: "em_andamento"
 * GPS começa a ser rastreado continuamente
 * WebSocket: Atualizações em tempo real
 * 
 * PASSO 6: Transportador chega ao destino
 * Status: "em_entrega"
 * Aguardando confirmação do agricultor
 * 
 * PASSO 7: Entrega confirmada
 * Status: "concluido"
 * Pagamento processado
 * Comissão retida
 * 
 * PASSO 8: Avaliação mútua
 * POST /transport/requests/{id}/rate
 * Ambos podem avaliar a transação
 * 
 * PASSO 9: Payout ao transportador
 * POST /payments/payout
 * Transferência bancária
 * Status: "pago"
 */

// ============================================================================
// 7. CHECKLIST DE IMPLEMENTAÇÃO
// ============================================================================

const implementationChecklist = {
  backend: [
    '✓ Modelo de transporte (SQLAlchemy)',
    '✓ Cálculo automático de comissão',
    '✓ Endpoints REST CRUD',
    '✓ WebSocket para rastreamento GPS',
    '✓ Integração Multicaixa para pagamentos',
    '✓ Sistema de notificações push',
    '✓ Autenticação JWT',
    '✓ Rate limiting',
    '✓ Logging e monitoring'
  ],
  
  frontend: [
    '✓ Página de pedidos (ativos e histórico)',
    '✓ Rastreamento GPS com mapa',
    '✓ Chat em tempo real',
    '✓ Dashboard do transportador',
    '✓ Cálculo de comissão visível',
    '✓ Formulário de novo pedido',
    '✓ Avaliações e ratings',
    '✓ Responsive design',
    '✓ Notificações push'
  ],
  
  testing: [
    '✓ Testes unitários backend',
    '✓ Testes integração API',
    '✓ Testes WebSocket',
    '✓ Testes de comissão',
    '✓ Testes pagamento (sandbox)',
    '✓ E2E tests'
  ],
  
  deployment: [
    '✓ Configuração SSL/TLS',
    '✓ Docker containers',
    '✓ CI/CD pipeline',
    '✓ Monitoramento',
    '✓ Backups automáticos'
  ]
};

export default implementationChecklist;
