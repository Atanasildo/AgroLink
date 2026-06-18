// URL do backend - hardcoded para garantir funcionamento em produção
const API_URL = "https://agrolink-api-67zk.onrender.com/api/v1";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : "Erro na API");
    this.status = status;
    this.detail = detail;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Retry robusto: até 8 tentativas em 70s — cobre cold start do Render free tier (~50-60s)
  let res!: Response;
  let lastErr: unknown = null;
  const delays = [0, 5000, 10000, 10000, 10000, 10000, 10000, 5000]; // ~60s total
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) await new Promise((r) => setTimeout(r, delays[attempt]));
    try {
      res = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(8000), // 8s por tentativa
      });
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      console.error(`[apiRequest] Tentativa ${attempt + 1} falhou:`, e);
    }
  }
  if (lastErr !== null) {
    console.error(`[apiRequest] Todas as ${delays.length} tentativas falharam:`, lastErr);
    throw new ApiError(0, "O servidor está a iniciar. Aguarde uns momentos e tente novamente.");
  }

  if (!res.ok) {
    let detail: unknown;
    try {
      const json = await res.json();
      detail = json.detail ?? json;
    } catch {
      detail = res.statusText;
    }
    
    // Log especial para 500s
    if (res.status === 500) {
      console.error(`[apiRequest] Erro 500 em ${method} ${path}:`, detail);
    }
    
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// ---------- Tipos ----------

export type UserRole =
  | "agricultor"
  | "comprador"
  | "transportador"
  | "proprietario_maquinas"
  | "admin";

export interface User {
  id: string;
  nome: string;
  email: string;
  telefone?: string | null;
  role: UserRole;
  provincia?: string | null;
  municipio?: string | null;
  bio?: string | null;
  foto_perfil_url?: string | null;
  email_verificado: boolean;
  telefone_verificado: boolean;
  ativo: boolean;
  criado_em: string;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Product {
  id: string;
  nome: string;
  descricao?: string | null;
  categoria: string;
  preco: string;
  quantidade: string;
  unidade: string;
  imagens?: string[] | null;
  provincia: string;
  municipio: string;
  agricultor_id: string;
  ativo: boolean;
  criado_em: string;
}

export interface TransportRoute {
  id: string;
  veiculo_id: string;
  transportador_id: string;
  origem: string;
  destino: string;
  data: string;
  preco_por_tonelada: string;
  capacidade_total_toneladas: string;
  capacidade_disponivel_toneladas: string;
  criado_em: string;
}

export interface TransportRequestItem {
  id: string;
  agricultor_id: string;
  rota_id?: string | null;
  produto: string;
  peso_toneladas: string;
  origem: string;
  destino: string;
  data: string;
  observacoes?: string | null;
  status: string;
  valor_total?: string | null;
  comissao_percentual?: string | null;
  valor_comissao?: string | null;
  valor_liquido_transportador?: string | null;
  criado_em: string;
}

// ---------- Máquinas ----------

export type MachineType = "trator" | "colheitadeira" | "arado" | "plantadora" | "irrigacao" | "outros";
export type MachineRentalStatus = "pendente" | "confirmado" | "em_andamento" | "concluido" | "cancelado";

export interface Machine {
  id: string;
  nome: string;
  descricao?: string | null;
  tipo: MachineType;
  preco_diaria: number;
  provincia?: string | null;
  municipio?: string | null;
  imagens?: string[] | null;
  proprietario_id: string;
  disponivel: boolean;
  criado_em: string;
}

export interface MachineRental {
  id: string;
  maquina_id: string;
  locatario_id: string;
  agricultor_id?: string; // alias
  data_inicio: string;
  data_fim: string;
  status: MachineRentalStatus;
  valor_total?: string | null;
  comissao_percentual?: string | null;
  valor_comissao?: string | null;
  valor_liquido_proprietario?: string | null;
  criado_em: string;
}

// ---------- Avaliações ----------

export interface Rating {
  id: string;
  avaliador_id: string;
  avaliado_id: string;
  nota: number;
  confianca?: number | null;
  qualidade?: number | null;
  pontualidade?: number | null;
  atendimento?: number | null;
  comentario?: string | null;
  transacao_tipo?: string | null;
  transacao_id?: string | null;
  criado_em: string;
}

export interface UserRatingSummary {
  media_geral: number;
  total_avaliacoes: number;
}

// ---------- Preços ----------

export type CommodityType = "milho" | "feijao" | "mandioca" | "soja" | "hortalicas";
export interface PriceRecord {
  id: string;
  produto: CommodityType;
  provincia: string;
  preco_kg: string;
  fonte?: string | null;
  criado_em: string;
}

// ---------- Chat ----------

export type MessageType = "texto" | "imagem" | "localizacao";

export interface ChatMessage {
  id: string;
  remetente_id: string;
  destinatario_id: string;
  conteudo: string;
  tipo: MessageType;
  lido: boolean;
  criado_em: string;
}

export interface ConversationSummary {
  outro_utilizador_id: string;
  ultima_mensagem: ChatMessage | null;
  mensagens_nao_lidas: number;
}

// ---------- Mapa ----------

export type MapEntityType = "fazenda" | "produto" | "maquina" | "transportador" | "cooperativa";

export interface MapLocation {
  id: string;
  tipo: MapEntityType;
  referencia_id?: string | null;
  nome: string;
  descricao?: string | null;
  latitude: string;
  longitude: string;
  provincia?: string | null;
  municipio?: string | null;
  utilizador_id?: string | null;
  criado_em: string;
}

// ---------- Auth ----------

export function login(email: string, senha: string) {
  return apiRequest<Token>("/auth/login", { method: "POST", body: { email, senha } });
}

export function register(payload: {
  nome: string;
  email: string;
  telefone?: string;
  role: UserRole;
  provincia?: string;
  municipio?: string;
  senha: string;
}) {
  return apiRequest<User>("/auth/register", { method: "POST", body: payload });
}

export function getMe(token: string) {
  return apiRequest<User>("/auth/me", { token });
}

export function changePassword(token: string, senha_atual: string, senha_nova: string) {
  return apiRequest<{ detail: string }>("/auth/change-password", {
    method: "POST",
    token,
    body: { senha_atual, senha_nova },
  });
}

// ---------- Marketplace ----------

export function myProducts(token: string) {
  return apiRequest<Product[]>("/products/me", { token });
}

export function getProduct(productId: string) {
  return apiRequest<Product>(`/products/${productId}`);
}

export function updateProduct(token: string, productId: string, payload: Partial<Product>) {
  return apiRequest<Product>(`/products/${productId}`, { method: "PUT", body: payload, token });
}

export function deleteProduct(token: string, productId: string) {
  return apiRequest<void>(`/products/${productId}`, { method: "DELETE", token });
}

export function listProducts(params: Record<string, string | undefined> = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "") as [string, string][]
  ).toString();
  return apiRequest<Product[]>(`/products/${query ? `?${query}` : ""}`);
}

export function createProduct(token: string, payload: Partial<Product>) {
  return apiRequest<Product>("/products/", { method: "POST", body: payload, token });
}

// ---------- Transporte ----------

export function searchRoutes(params: Record<string, string | undefined> = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "") as [string, string][]
  ).toString();
  return apiRequest<TransportRoute[]>(`/transport/routes${query ? `?${query}` : ""}`);
}

export function createTransportRequest(
  token: string,
  payload: {
    produto: string;
    peso_toneladas: number;
    origem: string;
    destino: string;
    data: string;
    observacoes?: string;
    rota_id?: string;
  }
) {
  return apiRequest<TransportRequestItem>("/transport/requests", { method: "POST", body: payload, token });
}

// ---------- Pagamentos (referência Multicaixa sandbox) ----------

export interface PaymentReference {
  id: string;
  utilizador_id: string;
  referencia_id?: string | null;
  tipo: string;
  valor: string;
  status: "pendente" | "pago" | "falhado" | "reembolsado";
  referencia_externa?: string | null;
  entidade?: string | null;
  referencia?: string | null;
  validade?: string | null;
  criado_em: string;
}

export function getTransportPaymentReference(token: string, requestId: string) {
  return apiRequest<PaymentReference>(`/payments/transport/${requestId}`, { token });
}

export function simulateConfirmPayment(token: string, paymentId: string) {
  return apiRequest<PaymentReference>(`/payments/${paymentId}/simulate-confirm`, { method: "POST", token });
}

export function myTransportRequests(token: string) {
  return apiRequest<TransportRequestItem[]>("/transport/requests/me", { token });
}

// Transporter-specific
export interface Vehicle {
  id: string;
  tipo: string;
  capacidade_toneladas: string;
  matricula: string;
  provincia: string;
  municipio: string;
  imagens?: string[] | null;
  disponivel: boolean;
  proprietario_id: string;
  criado_em: string;
}

export function myVehicles(token: string) {
  return apiRequest<Vehicle[]>("/transport/vehicles/me", { token });
}

export function createVehicle(token: string, payload: {
  tipo: string;
  capacidade_toneladas: number;
  matricula: string;
  provincia: string;
  municipio: string;
  imagens?: string[];
}) {
  return apiRequest<Vehicle>("/transport/vehicles", { method: "POST", body: payload, token });
}

export function deleteVehicle(token: string, vehicleId: string) {
  return apiRequest<void>(`/transport/vehicles/${vehicleId}`, { method: "DELETE", token });
}

export function updateVehicle(token: string, vehicleId: string, payload: { disponivel?: boolean }) {
  return apiRequest<Vehicle>(`/transport/vehicles/${vehicleId}`, { method: "PUT", body: payload, token });
}

export function myRoutes(token: string) {
  return apiRequest<TransportRoute[]>("/transport/routes/me", { token });
}

export function createRoute(token: string, payload: {
  veiculo_id: string;
  origem: string;
  destino: string;
  data: string;
  capacidade_total_toneladas: number;
  preco_por_tonelada: number;
}) {
  return apiRequest<TransportRoute>("/transport/routes", { method: "POST", body: payload, token });
}

export function updateRoute(token: string, routeId: string, payload: { data?: string; preco_por_tonelada?: number }) {
  return apiRequest<TransportRoute>(`/transport/routes/${routeId}`, { method: "PUT", body: payload, token });
}

export function deleteRoute(token: string, routeId: string) {
  return apiRequest<void>(`/transport/routes/${routeId}`, { method: "DELETE", token });
}

export function incomingTransportRequests(token: string) {
  return apiRequest<TransportRequestItem[]>("/transport/requests/incoming", { token });
}

export function acceptTransportRequest(token: string, requestId: string) {
  return apiRequest<TransportRequestItem>(`/transport/requests/${requestId}/accept`, { method: "POST", token });
}

export function updateRequestStatus(token: string, requestId: string, status: string) {
  return apiRequest<TransportRequestItem>(`/transport/requests/${requestId}/status`, { method: "PATCH", body: { status }, token });
}



// ---------- Utilizadores ----------

export function getUser(userId: string) {
  return apiRequest<User>(`/users/${userId}`);
}

export function searchUsers(params: { q?: string; role?: string; limit?: number }, token?: string) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.role) qs.set("role", params.role);
  if (params.limit) qs.set("limit", String(params.limit));
  return apiRequest<User[]>(`/users/?${qs.toString()}`, { token });
}

export function updateMyProfile(
  token: string,
  payload: Partial<{
    nome: string;
    telefone: string;
    provincia: string;
    municipio: string;
    bio: string;
    foto_perfil_url: string;
  }>
) {
  return apiRequest<User>("/users/me", { method: "PUT", body: payload, token });
}

// Promove a conta autenticada a admin, usando a chave secreta ADMIN_SETUP_KEY do backend
export function promoteToAdmin(token: string, chave: string) {
  return apiRequest<User>("/users/me/promote-admin", { method: "POST", body: { chave }, token });
}

export function myMachines(token: string) {
  return apiRequest<Machine[]>("/machines/me", { token });
}

export function updateMachine(token: string, machineId: string, payload: Partial<Machine>) {
  return apiRequest<Machine>(`/machines/${machineId}`, { method: "PUT", body: payload, token });
}

export function deleteMachine(token: string, machineId: string) {
  return apiRequest<void>(`/machines/${machineId}`, { method: "DELETE", token });
}

// ---------- Máquinas ----------

export function listMachines(params: Record<string, string | undefined> = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "") as [string, string][]
  ).toString();
  return apiRequest<Machine[]>(`/machines/${query ? `?${query}` : ""}`);
}

export function createMachine(token: string, payload: Partial<Machine>) {
  return apiRequest<Machine>("/machines/", { method: "POST", body: payload, token });
}

export function createMachineRental(
  token: string,
  machineId: string,
  payload: { data_inicio: string; data_fim: string }
) {
  return apiRequest<MachineRental>(`/machines/${machineId}/rentals`, { method: "POST", body: payload, token });
}

export function myMachineRentals(token: string) {
  return apiRequest<MachineRental[]>("/machines/rentals/me", { token });
}

export function updateMachineRentalStatus(token: string, rentalId: string, status: MachineRentalStatus) {
  return apiRequest<MachineRental>(`/machines/rentals/${rentalId}/status`, {
    method: "PATCH",
    body: { status },
    token,
  });
}

// ---------- Avaliações ----------

export function getUserRatings(userId: string) {
  return apiRequest<Rating[]>(`/ratings/users/${userId}`);
}

export function getUserRatingSummary(userId: string) {
  return apiRequest<UserRatingSummary>(`/ratings/users/${userId}/summary`);
}

export function createRating(
  token: string,
  payload: {
    avaliado_id: string;
    nota: number;
    confianca?: number;
    qualidade?: number;
    pontualidade?: number;
    atendimento?: number;
    comentario?: string;
    transacao_tipo?: string;
    transacao_id?: string;
  }
) {
  return apiRequest<Rating>("/ratings/", { method: "POST", body: payload, token });
}

// ---------- Preços ----------

export function latestPrices(params: Record<string, string | undefined> = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "") as [string, string][]
  ).toString();
  return apiRequest<PriceRecord[]>(`/prices/latest${query ? `?${query}` : ""}`);
}

export function priceHistory(params: Record<string, string | undefined> = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "") as [string, string][]
  ).toString();
  return apiRequest<PriceRecord[]>(`/prices/history${query ? `?${query}` : ""}`);
}

export function comparePrices(params: Record<string, string | undefined> = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "") as [string, string][]
  ).toString();
  return apiRequest<PriceRecord[]>(`/prices/compare${query ? `?${query}` : ""}`);
}

// ---------- Mapa ----------

export function listMapLocations(params: Record<string, string | undefined> = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "") as [string, string][]
  ).toString();
  return apiRequest<MapLocation[]>(`/map/locations${query ? `?${query}` : ""}`);
}

export function createMapLocation(token: string, payload: Partial<MapLocation>) {
  return apiRequest<MapLocation>("/map/locations", { method: "POST", body: payload, token });
}

// ---------- Chat ----------

export function listConversations(token: string) {
  return apiRequest<ConversationSummary[]>("/chat/conversations", { token });
}

export function getConversation(token: string, otherUserId: string) {
  return apiRequest<ChatMessage[]>(`/chat/conversations/${otherUserId}`, { token });
}

export function sendMessage(
  token: string,
  payload: { destinatario_id: string; conteudo: string; tipo?: MessageType }
) {
  return apiRequest<ChatMessage>("/chat/messages", { method: "POST", body: payload, token });
}

// ---------- Rede Social ----------

export type PostType = "duvida" | "dica" | "experiencia" | "noticia";

export interface PostAuthor {
  id: string;
  nome: string;
  role: UserRole;
  foto_perfil_url?: string | null;
}

export interface SocialPost {
  id: string;
  autor_id: string;
  conteudo: string;
  tipo: PostType;
  imagens?: string[] | null;
  criado_em: string;
  autor: PostAuthor;
  likes_count: number;
  comments_count: number;
  curtido_por_mim: boolean;
}

export interface SocialComment {
  id: string;
  post_id: string;
  autor_id: string;
  conteudo: string;
  criado_em: string;
  autor: PostAuthor;
}

export function listPosts(params: Record<string, string | undefined> = {}, token?: string | null) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "") as [string, string][]
  ).toString();
  return apiRequest<SocialPost[]>(`/social/posts${query ? `?${query}` : ""}`, { token });
}

export function createPost(token: string, payload: { conteudo: string; tipo: PostType; imagens?: string[] }) {
  return apiRequest<SocialPost>("/social/posts", { method: "POST", body: payload, token });
}

export function deletePost(token: string, postId: string) {
  return apiRequest<void>(`/social/posts/${postId}`, { method: "DELETE", token });
}

export function togglePostLike(token: string, postId: string) {
  return apiRequest<{ curtido: boolean; likes_count: number }>(`/social/posts/${postId}/like`, {
    method: "POST",
    token,
  });
}

export function listPostComments(postId: string) {
  return apiRequest<SocialComment[]>(`/social/posts/${postId}/comments`);
}

export function createComment(token: string, postId: string, conteudo: string) {
  return apiRequest<SocialComment>(`/social/posts/${postId}/comments`, {
    method: "POST",
    body: { conteudo },
    token,
  });
}

// ---------- Admin: Inserir Preço ----------

export interface PriceRecordCreate {
  produto: CommodityType;
  provincia: string;
  preco_kg: number;
  fonte?: string;
}

export function createPrice(token: string, payload: PriceRecordCreate) {
  return apiRequest<PriceRecord>("/prices/", { method: "POST", body: payload, token });
}

export function seedPrices(token: string) {
  return apiRequest<{ detail: string; count: number }>("/prices/seed", { method: "POST", token });
}

// ---------- Comprador: Pedidos de Transporte ----------

export function myBuyerTransportRequests(token: string) {
  return apiRequest<TransportRequestItem[]>("/transport/requests/me", { token });
}

export function cancelTransportRequest(token: string, requestId: string) {
  return apiRequest<TransportRequestItem>(`/transport/requests/${requestId}/status`, {
    method: "PATCH",
    body: { status: "cancelado" },
    token,
  });
}

// ---------- Denúncias ----------

export type ReportReason =
  | "fraude"
  | "produto_falso"
  | "comportamento_abusivo"
  | "spam"
  | "outro";

export interface Report {
  id: string;
  denunciante_id: string;
  denunciado_id: string;
  motivo: ReportReason;
  descricao?: string;
  criado_em: string;
}

export function createReport(
  token: string,
  payload: { denunciado_id: string; motivo: ReportReason; descricao?: string }
) {
  return apiRequest<Report>("/users/reports", { method: "POST", body: payload, token });
}

export function listReportsAdmin(token: string) {
  return apiRequest<
    {
      id: string;
      denunciante_id: string;
      denunciante_nome: string;
      denunciado_id: string;
      denunciado_nome: string;
      motivo: ReportReason;
      descricao?: string;
      criado_em: string;
    }[]
  >("/users/reports/admin/all", { token });
}
