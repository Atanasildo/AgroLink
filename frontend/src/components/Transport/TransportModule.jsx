'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Phone, Clock, Truck, AlertCircle, CheckCircle, XCircle, Navigation, DollarSign, Star, Users, Route, ChevronDown, Filter, Search } from 'lucide-react';

// ============================================================================
// MÓDULO 3 - TRANSPORTE RURAL COMPLETO (AgroLink)
// ============================================================================

export default function TransportModule() {
  const [userRole, setUserRole] = useState('farmer'); // 'farmer' ou 'transporter'
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'history', 'create'
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [liveTracking, setLiveTracking] = useState({});
  const [expandedOrder, setExpandedOrder] = useState(null);
  const wsRef = useRef(null);

  // ========== INICIALIZAR WEBSOCKETS PARA TEMPO REAL ==========
  useEffect(() => {
    // Simular conexão WebSocket
    wsRef.current = {
      onmessage: null,
      send: (data) => console.log('WebSocket:', data),
      close: () => {}
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // ========== DADOS MOCKADOS ==========
  useEffect(() => {
    const mockOrders = [
      {
        id: 'TRN001',
        status: 'em_andamento',
        farmer: {
          name: 'João Silva',
          phone: '+244 923 456 789',
          avatar: '👨‍🌾'
        },
        product: 'Milho',
        quantity: 5,
        unit: 'toneladas',
        origin: { lat: -8.8383, lng: 13.2344, address: 'Kilamba, Luanda' },
        destination: { lat: -8.9161, lng: 13.1939, address: 'Viana, Luanda' },
        distance: 15.3,
        weight: 5000,
        price: 125000,
        commission: {
          percentaje: 5,
          amount: 6250,
          forPlatform: 6250,
          forTransporter: 118750
        },
        eta: '14:45',
        transporter: {
          id: 'TRPT001',
          name: 'Transportes Kamba',
          rating: 4.8,
          reviews: 156,
          phone: '+244 923 111 222',
          vehicle: {
            type: 'Caminhão 10t',
            plate: 'LU-25-AB',
            capacity: 10000,
            capacity_used: 5000
          },
          location: { lat: -8.8550, lng: 13.2100, speed: 45, direction: 'NE' },
          earnings_today: 450000
        },
        createdAt: '2024-06-14T10:30:00',
        acceptedAt: '2024-06-14T10:45:00',
        estimatedDelivery: '2024-06-14T14:45:00',
        loadPoints: [
          { sequence: 1, lat: -8.8383, lng: 13.2344, status: 'completed', time: '11:00' },
          { sequence: 2, lat: -8.8500, lng: 13.2250, status: 'in_progress', time: '14:00' },
          { sequence: 3, lat: -8.9161, lng: 13.1939, status: 'pending', time: '14:45' }
        ]
      },
      {
        id: 'TRN002',
        status: 'pendente',
        farmer: {
          name: 'Maria Santos',
          phone: '+244 923 654 321',
          avatar: '👩‍🌾'
        },
        product: 'Feijão',
        quantity: 3,
        unit: 'toneladas',
        origin: { lat: -8.8200, lng: 13.2500, address: 'Benfica, Luanda' },
        destination: { lat: -8.9400, lng: 13.1800, address: 'Kilamba Kiaxi, Luanda' },
        distance: 18.5,
        weight: 3000,
        price: 90000,
        commission: {
          percentaje: 5,
          amount: 4500,
          forPlatform: 4500,
          forTransporter: 85500
        },
        eta: null,
        transporter: null,
        createdAt: '2024-06-14T11:15:00',
        acceptedAt: null,
        estimatedDelivery: null,
        loadPoints: []
      },
      {
        id: 'TRN003',
        status: 'concluido',
        farmer: {
          name: 'António Costa',
          phone: '+244 923 789 456',
          avatar: '👨‍🌾'
        },
        product: 'Mandioca',
        quantity: 8,
        unit: 'toneladas',
        origin: { lat: -8.8450, lng: 13.2100, address: 'Maculusso, Luanda' },
        destination: { lat: -8.9300, lng: 13.1700, address: 'Cazenga, Luanda' },
        distance: 22.1,
        weight: 8000,
        price: 160000,
        commission: {
          percentaje: 5,
          amount: 8000,
          forPlatform: 8000,
          forTransporter: 152000
        },
        eta: '12:30',
        transporter: {
          id: 'TRPT002',
          name: 'Mega Transportes',
          rating: 4.5,
          reviews: 89,
          phone: '+244 923 222 333',
          vehicle: {
            type: 'Carrinha 5t',
            plate: 'LU-28-CD',
            capacity: 5000,
            capacity_used: 3000
          }
        },
        createdAt: '2024-06-13T09:00:00',
        acceptedAt: '2024-06-13T09:30:00',
        completedAt: '2024-06-13T12:30:00',
        loadPoints: []
      }
    ];

    // Simular atualização de localização em tempo real
    const locationInterval = setInterval(() => {
      setLiveTracking(prev => {
        const updated = { ...prev };
        if (mockOrders[0].transporter) {
          updated[mockOrders[0].id] = {
            ...mockOrders[0].transporter.location,
            lat: mockOrders[0].transporter.location.lat + (Math.random() - 0.5) * 0.001,
            lng: mockOrders[0].transporter.location.lng + (Math.random() - 0.5) * 0.001,
            speed: 40 + Math.random() * 20,
            timestamp: new Date().toLocaleTimeString()
          };
        }
        return updated;
      });
    }, 5000);

    setOrders(mockOrders);
    return () => clearInterval(locationInterval);
  }, []);

  // ========== FUNÇÕES DE CÁLCULO ==========
  const calculateETA = (distance, avgSpeed = 50) => {
    const hours = Math.floor(distance / avgSpeed);
    const minutes = Math.round((distance % avgSpeed) / avgSpeed * 60);
    return `${hours}h ${minutes}m`;
  };

  const formatPrice = (value) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA'
    }).format(value);
  };

  // ========== COMPONENTE: CARD DE PEDIDO PENDENTE ==========
  const PendingOrderCard = ({ order }) => (
    <div className="bg-white rounded-lg border border-orange-200 p-4 hover:shadow-md transition mb-3">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-800">Pedido #{order.id}</h3>
          <p className="text-sm text-gray-500">Criado há {getTimeDiff(order.createdAt)}</p>
        </div>
        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold">
          Pendente
        </span>
      </div>

      <div className="bg-orange-50 p-3 rounded-lg mb-3 border-l-4 border-orange-400">
        <p className="text-sm font-semibold text-orange-900">⏱️ Nenhum transportador aceitou ainda</p>
        <p className="text-xs text-orange-700 mt-1">
          {order.quantity} {order.unit} de {order.product} esperando por aceição
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
        <div className="flex items-start gap-2">
          <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-gray-500 text-xs">Origem</p>
            <p className="font-semibold text-gray-700">{order.origin.address}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-gray-500 text-xs">Destino</p>
            <p className="font-semibold text-gray-700">{order.destination.address}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-gray-200">
        <div className="text-sm">
          <p className="text-gray-500">Valor oferecido</p>
          <p className="font-bold text-gray-800">{formatPrice(order.price)}</p>
        </div>
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          Ver Transportadores
        </button>
      </div>
    </div>
  );

  // ========== COMPONENTE: CARD DE RASTREAMENTO EM TEMPO REAL ==========
  const LiveTrackingCard = ({ order }) => {
    const tracking = liveTracking[order.id];

    return (
      <div className="bg-white rounded-lg border border-green-200 p-4 hover:shadow-md transition mb-3">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold text-gray-800">Pedido #{order.id}</h3>
            <p className="text-sm text-gray-500">{order.product} - {order.quantity} {order.unit}</p>
          </div>
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Em Transporte
          </span>
        </div>

        {/* MAPA SIMPLIFICADO */}
        <div className="relative bg-gradient-to-b from-blue-50 to-blue-100 rounded-lg p-4 mb-3 h-40 flex items-center justify-center">
          <div className="text-center">
            <Navigation size={32} className="mx-auto mb-2 text-blue-600 animate-spin" />
            <p className="text-sm font-semibold text-blue-900">GPS Ao Vivo</p>
            {tracking && (
              <p className="text-xs text-blue-700 mt-1">
                Velocidade: {tracking.speed.toFixed(0)} km/h | Atualizado: {tracking.timestamp}
              </p>
            )}
          </div>
        </div>

        {/* INFO DO TRANSPORTADOR */}
        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck size={20} className="text-blue-600" />
              <div>
                <p className="text-sm font-semibold text-gray-800">{order.transporter.name}</p>
                <p className="text-xs text-gray-500">{order.transporter.vehicle.plate}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <Star size={14} className="text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-semibold">{order.transporter.rating}</span>
              </div>
              <p className="text-xs text-gray-500">{order.transporter.reviews} avaliações</p>
            </div>
          </div>
        </div>

        {/* ROTA COM PONTOS DE CARGA */}
        <div className="bg-blue-50 rounded-lg p-3 mb-3">
          <p className="text-xs font-semibold text-gray-600 mb-2">Rota do Transporte</p>
          <div className="space-y-2">
            {order.loadPoints.map((point, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                {point.status === 'completed' && <CheckCircle size={16} className="text-green-500" />}
                {point.status === 'in_progress' && <Navigation size={16} className="text-blue-500 animate-pulse" />}
                {point.status === 'pending' && <AlertCircle size={16} className="text-gray-300" />}
                <span className={`flex-grow ${point.status === 'in_progress' ? 'font-semibold text-blue-600' : 'text-gray-600'}`}>
                  Ponto {point.sequence} - {point.status === 'completed' ? 'Carregado' : point.status === 'in_progress' ? 'Carregando' : 'Aguardando'}
                </span>
                <span className="text-xs text-gray-500">{point.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ETA E CONTATO */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Chegada Estimada</p>
            <p className="text-lg font-bold text-green-600">{order.eta}</p>
            <p className="text-xs text-gray-500">{order.distance.toFixed(1)} km</p>
          </div>
          <div>
            <button className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 mb-2">
              <Phone size={16} />
              Ligar Transportador
            </button>
            <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-semibold text-sm">
              Enviar Mensagem
            </button>
          </div>
        </div>

        {/* BREAKDOWN DE COMISSÃO */}
        <details className="border-t border-gray-200 pt-3">
          <summary className="text-sm font-semibold text-gray-700 cursor-pointer flex items-center gap-2">
            <ChevronDown size={16} />
            Detalhes de Comissão
          </summary>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Valor Total</span>
              <span className="font-semibold">{formatPrice(order.price)}</span>
            </div>
            <div className="flex justify-between text-orange-600">
              <span>Comissão AgroLink ({order.commission.percentaje}%)</span>
              <span className="font-semibold">-{formatPrice(order.commission.amount)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200 text-green-600 font-semibold">
              <span>Valor para Transportador</span>
              <span>{formatPrice(order.commission.forTransporter)}</span>
            </div>
          </div>
        </details>
      </div>
    );
  };

  // ========== COMPONENTE: PAINEL DO TRANSPORTADOR ==========
  const TransporterDashboard = ({ order }) => {
    return (
      <div className="space-y-4">
        {/* HEADER COM GANHOS */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-lg p-4 text-white">
            <p className="text-sm opacity-90">Ganhos Hoje</p>
            <p className="text-2xl font-bold">{formatPrice(order.transporter.earnings_today)}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg p-4 text-white">
            <p className="text-sm opacity-90">Carga Atual</p>
            <p className="text-2xl font-bold">
              {(order.transporter.vehicle.capacity_used / order.transporter.vehicle.capacity * 100).toFixed(0)}%
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg p-4 text-white">
            <p className="text-sm opacity-90">Capacidade Livre</p>
            <p className="text-lg font-bold">
              {order.transporter.vehicle.capacity - order.transporter.vehicle.capacity_used} kg
            </p>
          </div>
        </div>

        {/* PEDIDO ATUAL */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Pedido em Execução</h3>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 pb-3 border-b border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users size={24} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">{order.farmer.name}</p>
                <p className="text-xs text-gray-500">{order.product} - {order.quantity} {order.unit}</p>
                <button className="text-xs text-blue-600 hover:text-blue-700 font-semibold mt-1">
                  Contatar Agricultor
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-1">Origem</p>
                <p className="font-semibold text-gray-700 text-sm">{order.origin.address}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Destino</p>
                <p className="font-semibold text-gray-700 text-sm">{order.destination.address}</p>
              </div>
            </div>

            {/* GANHO DO TRANSPORTADOR DESTACADO */}
            <div className="bg-green-50 rounded-lg p-3 border-l-4 border-green-500">
              <p className="text-xs text-gray-600 mb-1">Seu Ganho Neste Transporte</p>
              <p className="text-2xl font-bold text-green-600">{formatPrice(order.commission.forTransporter)}</p>
              <p className="text-xs text-gray-500 mt-1">Depois de {order.commission.percentaje}% de comissão da plataforma</p>
            </div>

            {/* BARRA DE CARGA */}
            <div>
              <p className="text-xs text-gray-600 mb-2">Utilização de Capacidade</p>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-green-400 to-green-600 h-full transition-all"
                  style={{
                    width: `${(order.transporter.vehicle.capacity_used / order.transporter.vehicle.capacity * 100)}%`
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {order.transporter.vehicle.capacity_used} / {order.transporter.vehicle.capacity} kg
              </p>
            </div>

            <button className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold">
              ✓ Marcar como Entregue
            </button>
          </div>
        </div>

        {/* COMPARTILHAMENTO DE CARGA */}
        <div className="bg-white rounded-lg border border-blue-200 p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Users size={18} className="text-blue-600" />
            Compartilhamento de Carga
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Ainda há espaço para {order.transporter.vehicle.capacity - order.transporter.vehicle.capacity_used} kg
          </p>
          <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-semibold text-sm">
            Publicar Espaço Disponível
          </button>
        </div>
      </div>
    );
  };

  // ========== COMPONENTE: HISTÓRICO DE PEDIDOS ==========
  const HistoryView = () => {
    const completedOrders = orders.filter(o => o.status === 'concluido');
    
    return (
      <div className="space-y-3">
        {completedOrders.map(order => (
          <div 
            key={order.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition cursor-pointer"
            onClick={() => setSelectedOrder(order)}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-gray-800">#{order.id}</h3>
                <p className="text-sm text-gray-500">
                  {order.product} • {order.farmer.name}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-sm font-semibold text-green-600">Entregue</span>
                </div>
                <p className="text-xs text-gray-500">{formatPrice(order.price)}</p>
              </div>
            </div>
            <div className="text-xs text-gray-600 flex items-center gap-2">
              <Clock size={14} />
              Entregue às {order.eta}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ========== HELPER FUNCTION ==========
  const getTimeDiff = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now - then) / 1000 / 60); // minutos
    if (diff < 60) return `${diff}m`;
    return `${Math.floor(diff / 60)}h`;
  };

  // ========== RENDERIZAR ==========
  const activeOrders = orders.filter(o => o.status === 'em_andamento' || o.status === 'pendente');
  const pendingOrders = orders.filter(o => o.status === 'pendente');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🚚 Transporte Rural</h1>
          <p className="text-gray-600">Gerencie transportes com rastreamento em tempo real</p>
        </div>

        {/* SELECTOR DE PAPEL */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setUserRole('farmer')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              userRole === 'farmer'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            👨‍🌾 Agricultor
          </button>
          <button
            onClick={() => setUserRole('transporter')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              userRole === 'transporter'
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            🚛 Transportador
          </button>
        </div>

        {/* ABAS */}
        {userRole === 'farmer' && (
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-3 font-semibold border-b-2 transition ${
                activeTab === 'active'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-800'
              }`}
            >
              Ativos ({activeOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-3 font-semibold border-b-2 transition ${
                activeTab === 'pending'
                  ? 'text-orange-600 border-orange-600'
                  : 'text-gray-600 border-transparent hover:text-gray-800'
              }`}
            >
              Pendentes ({pendingOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-3 font-semibold border-b-2 transition ${
                activeTab === 'history'
                  ? 'text-green-600 border-green-600'
                  : 'text-gray-600 border-transparent hover:text-gray-800'
              }`}
            >
              Histórico
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-3 font-semibold border-b-2 transition ${
                activeTab === 'create'
                  ? 'text-purple-600 border-purple-600'
                  : 'text-gray-600 border-transparent hover:text-gray-800'
              }`}
            >
              Novo Pedido
            </button>
          </div>
        )}

        {/* CONTEÚDO */}
        <div>
          {userRole === 'farmer' && activeTab === 'active' && (
            <div>
              {activeOrders.filter(o => o.status === 'em_andamento').length > 0 ? (
                activeOrders.filter(o => o.status === 'em_andamento').map(order => (
                  <LiveTrackingCard key={order.id} order={order} />
                ))
              ) : (
                <div className="text-center py-12">
                  <Truck size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-600 font-semibold">Nenhum transporte ativo no momento</p>
                </div>
              )}
            </div>
          )}

          {userRole === 'farmer' && activeTab === 'pending' && (
            <div>
              {pendingOrders.length > 0 ? (
                pendingOrders.map(order => (
                  <PendingOrderCard key={order.id} order={order} />
                ))
              ) : (
                <div className="text-center py-12">
                  <AlertCircle size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-600 font-semibold">Nenhum pedido pendente</p>
                </div>
              )}
            </div>
          )}

          {userRole === 'farmer' && activeTab === 'history' && <HistoryView />}

          {userRole === 'farmer' && activeTab === 'create' && (
            <CreateTransportRequest orders={orders} />
          )}

          {userRole === 'transporter' && (
            <TransporterDashboard order={orders[0]} />
          )}
        </div>

        {/* MODAL DE DETALHES */}
        {selectedOrder && (
          <DetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
        )}
      </div>
    </div>
  );
}

// ========== COMPONENTE: CRIAR NOVO PEDIDO ==========
function CreateTransportRequest({ orders }) {
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    product: '',
    quantity: '',
    weight: '',
    date: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Pedido criado com sucesso! Transportadores começarão a aparecer em breve.');
    setFormData({ origin: '', destination: '', product: '', quantity: '', weight: '', date: '', notes: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Solicitar Novo Transporte</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <input
          type="text"
          placeholder="Origem (ex: Kilamba, Luanda)"
          required
          value={formData.origin}
          onChange={(e) => setFormData({...formData, origin: e.target.value})}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <input
          type="text"
          placeholder="Destino (ex: Viana, Luanda)"
          required
          value={formData.destination}
          onChange={(e) => setFormData({...formData, destination: e.target.value})}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <select
          required
          value={formData.product}
          onChange={(e) => setFormData({...formData, product: e.target.value})}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Selecione o Produto</option>
          <option value="milho">Milho</option>
          <option value="feijao">Feijão</option>
          <option value="mandioca">Mandioca</option>
          <option value="soja">Soja</option>
          <option value="hortalicas">Hortaliças</option>
        </select>
        <input
          type="number"
          placeholder="Quantidade (toneladas)"
          required
          value={formData.quantity}
          onChange={(e) => setFormData({...formData, quantity: e.target.value})}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <input
          type="number"
          placeholder="Peso (kg)"
          required
          value={formData.weight}
          onChange={(e) => setFormData({...formData, weight: e.target.value})}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <input
          type="datetime-local"
          required
          value={formData.date}
          onChange={(e) => setFormData({...formData, date: e.target.value})}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <textarea
        placeholder="Observações adicionais..."
        rows="3"
        value={formData.notes}
        onChange={(e) => setFormData({...formData, notes: e.target.value})}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      <button
        type="submit"
        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 rounded-lg transition"
      >
        Publicar Pedido de Transporte
      </button>
    </form>
  );
}

// ========== COMPONENTE: MODAL DE DETALHES ==========
function DetailModal({ order, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Detalhes do Pedido #{order.id}</h2>
          <button onClick={onClose} className="text-2xl hover:opacity-80">×</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Produto</p>
              <p className="font-semibold text-gray-800">{order.product}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Quantidade</p>
              <p className="font-semibold text-gray-800">{order.quantity} {order.unit}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Origem</p>
              <p className="font-semibold text-gray-800">{order.origin.address}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Destino</p>
              <p className="font-semibold text-gray-800">{order.destination.address}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Valor Total</p>
              <p className="font-bold text-blue-600 text-lg">{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(order.price)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <p className="font-semibold text-green-600">{order.status}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
