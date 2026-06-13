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
    }
  }
  if (lastErr !== null) {
    throw new ApiError(0, "O servidor está a iniciar (plano gratuito). Aguarde ~60s e tente novamente.");
  }
  if (!res.ok) {
    let detail: unknown;
    try {
      const json = await res.json();
      detail = json.detail ?? json;
    } catch {
      detail = res.statusText;
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

export type MachineType = "trator" | "colheitadeira" | "pulverizador" | "arado" | "sistema_irrigacao";
export type MachineRentalStatus = "pendente" | "aprovado" | "em_andamento" | "concluido" | "cancelado";

export interface Machine {
  id: string;
  nome: string;
  descricao?: string | null;
  tipo: MachineType;
  valor_diario: string;
  provincia?: string | null;
  municipio?: string | null;
  proprietario_id: string;
  disponivel: boolean;
  criado_em: string;
}

export interface MachineRental {
  id: string;
  maquina_id: string;
  agricultor_id: string;
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
  municipio?: string | null;
  preco_medio: string;
  unidade: string;
  data_referencia: string;
  criado_em: string;
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

// ---------- Marketplace ----------

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

export function myTransportRequests(token: string) {
  return apiRequest<TransportRequestItem[]>("/transport/requests/me", { token });
}

// ---------- Utilizadores ----------

export function getUser(userId: string) {
  return apiRequest<User>(`/users/${userId}`);
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
