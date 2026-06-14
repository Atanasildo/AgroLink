# 🚚 AgroLink - Módulo 3: Transporte Rural Completo

## Visão Geral

Este é um módulo completo de transporte rural para a plataforma AgroLink, incluindo:

✅ **Rastreamento GPS em tempo real** com WebSocket
✅ **Cálculo automático de comissões** (5% retirada da plataforma)
✅ **Painel do transportador** com dashboard de ganhos
✅ **Notificações push** para eventos importantes
✅ **Chat em tempo real** entre agricultor e transportador
✅ **Compartilhamento de carga** para otimizar rotas
✅ **Avaliações e ratings** de ambas as partes
✅ **Integração Multicaixa** para pagamentos
✅ **ETA dinâmica** baseado em localização real
✅ **Interface responsiva** para desktop e mobile

---

## 📁 Estrutura de Arquivos

```
AgroLink-Transport-Module/
├── TransportModule.jsx              # Componente React principal
├── INTEGRATION_GUIDE.js             # Guia de integração com backend
├── service-worker.js                # Service Worker para notificações
├── migrations_transport_module.sql  # Schema do banco de dados
├── README.md                        # Este arquivo
└── examples/
    ├── api-examples.js              # Exemplos de chamadas API
    └── websocket-examples.js        # Exemplos WebSocket
```

---

## 🚀 Instalação e Setup

### 1. Frontend (React/Next.js)

```bash
# Copiar componente para o projeto
cp TransportModule.jsx src/components/transport/TransportModule.jsx

# Copiar service worker
cp service-worker.js public/sw.js

# Instalar dependências (se necessário)
npm install lucide-react
```

### 2. Banco de Dados (PostgreSQL)

```bash
# Executar migrations
psql -U postgres -d agrolink -f migrations_transport_module.sql

# Verificar se as tabelas foram criadas
psql -U postgres -d agrolink -c "\dt" | grep transport
```

### 3. Backend (FastAPI)

Certifique-se de que seu backend FastAPI tem:

```python
# requirements.txt
fastapi==0.104.0
websockets==12.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
geoalchemy2==0.14.1
pydantic==2.4.2
python-multipart==0.0.6
```

### 4. Variáveis de Ambiente

```env
# .env
DATABASE_URL=postgresql://user:password@localhost/agrolink
REDIS_URL=redis://localhost:6379
JWT_SECRET_KEY=your-secret-key
MULTICAIXA_API_KEY=your-api-key
MULTICAIXA_REDIRECT_URL=http://localhost:3000/payment-callback
VAPID_PUBLIC_KEY=your-public-vapid-key
VAPID_PRIVATE_KEY=your-private-vapid-key
```

---

## 🔌 API Endpoints Essenciais

### Criar Pedido de Transporte
```bash
POST /api/v1/transport/requests
{
  "origin": "Kilamba, Luanda",
  "destination": "Viana, Luanda",
  "product_id": "prod_001",
  "quantity": 5,
  "unit": "toneladas",
  "weight": 5000,
  "scheduled_date": "2024-06-14T14:00:00"
}
```

### Aceitar Pedido
```bash
POST /api/v1/transport/requests/{request_id}/accept
{
  "transporter_id": "TRPT001",
  "vehicle_id": "VEH001"
}
```

### Rastreamento em Tempo Real
```bash
GET /api/v1/transport/requests/{request_id}/tracking

WebSocket: ws://localhost:8000/ws/transport/{request_id}/{user_id}
```

### Obter Ganhos
```bash
GET /api/v1/transporters/{transporter_id}/earnings?period=today
```

---

## 🔄 Fluxo de um Transporte Completo

### 1. **Agricultor cria pedido** (Status: `pendente`)
```javascript
const order = await createTransportRequest({
  origin: "Kilamba, Luanda",
  destination: "Viana, Luanda",
  product: "Milho",
  quantity: 5,
  weight: 5000
});
```

### 2. **Notificação enviada a transportadores próximos**
- WebSocket broadcast para transportadores na região
- Notificação push: "Novo pedido de 5 toneladas"

### 3. **Transportador aceita** (Status: `aceite`)
- ETA é calculada
- Comissão é reservada
- Agricultor recebe notificação push

### 4. **Transporte inicia** (Status: `em_andamento`)
- GPS começa a ser rastreado
- Atualizações em tempo real a cada 5 segundos
- Chat é aberto para comunicação

### 5. **Chegada iminente** (Status: `em_entrega`)
- Notificação push: "Chegando em 5 minutos"
- Localização em tempo real disponível

### 6. **Entrega confirmada** (Status: `concluido`)
- Pagamento é processado
- Comissão é retida
- Avaliação é solicitada

### 7. **Ambas partes avaliam**
- Rating é atualizado
- Agricultor transfere pagamento via Multicaixa
- Transportador recebe valor (valor_total - comissão)

---

## 💰 Cálculo de Comissão (Exemplo)

```
Transporte de 5 toneladas, 15 km
Base: 125.000 Kz

├─ Agricultor paga: 125.000 Kz
├─ Comissão AgroLink (5%): 6.250 Kz
└─ Transportador recebe: 118.750 Kz
```

---

## 🎯 Features Principais

### 1. Rastreamento GPS em Tempo Real
- Localização atualizada a cada 5 segundos
- Histórico completo de rota
- Mapa interativo
- Velocidade e direção

### 2. Painel do Transportador
```javascript
{
  earnings_today: 450000,      // Ganhos acumulados
  active_shipments: 2,          // Transportes em andamento
  capacity_utilization: 75,     // % de carga
  average_rating: 4.8,          // Avaliação média
  available_capacity: 2500      // kg disponíveis
}
```

### 3. Compartilhamento de Carga
- Múltiplos agricultores no mesmo caminhão
- Otimização automática de rotas
- Custo reduzido para agricultores

### 4. Notificações Push
| Tipo | Trigger | Ação |
|------|---------|------|
| `transportador_aceita` | Aceitação do pedido | Abrir detalhe do transporte |
| `proximo_chegada` | ETA < 10 min | Mostrar localização |
| `entrega_concluida` | Status = completo | Avaliar transportador |
| `pagamento_recebido` | Payout concluído | Ver saldo |

---

## 🧪 Testes

### Teste Local com Mock Data
```javascript
// Dados estão hardcoded em TransportModule.jsx
// Basta abrir a página para ver dados de teste

const mockOrders = [
  { id: 'TRN001', status: 'em_andamento', ... },
  { id: 'TRN002', status: 'pendente', ... },
  { id: 'TRN003', status: 'concluido', ... }
];
```

### Testar WebSocket
```bash
# Terminal 1: Server
python -m uvicorn main:app --reload

# Terminal 2: Cliente WebSocket
wscat -c ws://localhost:8000/ws/transport/TRN001/farm_001
```

### Testar Notificações Push
```javascript
// No console do navegador
navigator.serviceWorker.ready.then(registration => {
  registration.showNotification('Teste', {
    body: 'Notificação de teste',
    tag: 'test'
  });
});
```

---

## 📊 Dashboard do Transportador

O painel mostra em tempo real:

```
┌─────────────────────────────────────────┐
│  💰 Ganhos Hoje: 450.000 Kz            │
│  📦 Carga Atual: 75%                    │
│  🎯 Capacidade Livre: 2.500 kg          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Pedido em Execução (TRN001)            │
│  👨‍🌾 João Silva - 5 ton de Milho         │
│  📍 Kilamba → Viana                     │
│  💵 Seu Ganho: 118.750 Kz               │
│  ✓ Marcar como Entregue                 │
└─────────────────────────────────────────┘
```

---

## 🔐 Segurança

### Autenticação
- JWT tokens obrigatórios para todos os endpoints
- Token deve estar em header `Authorization: Bearer {token}`

### Validações
- Apenas agricultor pode criar/cancelar seu pedido
- Apenas transportador aceito pode atualizar localização
- Comissão é validada automaticamente no backend

### Rate Limiting
- 100 requisições/minuto por usuário
- WebSocket máximo 1 conexão por pedido

### Dados Sensíveis
- Números de banco são criptografados
- Localização é deletada após 6 meses
- Histórico de chat é preservado

---

## 🐛 Troubleshooting

### WebSocket não conecta
```javascript
// Verificar se o servidor está rodando
curl http://localhost:8000/health

// Verificar token JWT
const token = localStorage.getItem('token');
console.log('Token válido?', token && token.length > 50);
```

### Notificações push não chegam
```javascript
// Verificar service worker
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs);
});

// Verificar permissão
console.log('Permissão:', Notification.permission);
```

### GPS não atualiza
```javascript
// Verificar se transportador tem GPS ativo
GET /api/v1/vehicles/{vehicle_id}
// Deve ter gps_tracking_active = true
```

---

## 📱 Suporte Mobile

O componente é totalmente responsivo:

```css
/* Mobile first */
@media (max-width: 640px) {
  /* Cards adaptados */
  /* Botões maiores */
  /* Mapa em tela cheia */
}
```

---

## 🎓 Exemplos de Uso

### Integração com Context API
```javascript
import TransportModule from '@/components/transport/TransportModule';

export default function App() {
  return (
    <TransportProvider>
      <TransportModule />
    </TransportProvider>
  );
}
```

### Com Redux
```javascript
const orders = useSelector(state => state.transport.orders);
const dispatch = useDispatch();

const handleCreate = (data) => {
  dispatch(createTransportRequest(data));
};
```

### Com React Query
```javascript
const { data: orders, isLoading } = useQuery(
  ['transport', 'active'],
  () => fetchTransportOrders('active')
);
```

---

## 🚀 Deploimento

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agrolink-transport
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: web
        image: agrolink-transport:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: agrolink-secrets
              key: database-url
```

---

## 📞 Suporte

Para dúvidas ou problemas:

1. Verificar logs: `docker logs agrolink-transport`
2. Testar API: `curl -H "Authorization: Bearer {token}" http://localhost:8000/api/v1/health`
3. Verificar banco: `psql -d agrolink -c "SELECT COUNT(*) FROM transport_requests;"`

---

## 📝 Licença

Este módulo faz parte do projeto AgroLink e segue a mesma licença.

---

## 🎉 Próximos Passos

1. ✅ Integrar com Módulo 8 (Mapa Agrícola)
2. ✅ Integrar com Módulo 4 (Aluguel de Máquinas)
3. ⏳ Implementar App Mobile Flutter
4. ⏳ Dashboard Analytics avançado
5. ⏳ IA para sugestão de rotas otimizadas

---

**Desenvolvido com ❤️ para AgroLink**

Última atualização: Junho 2024
