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

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "Sem ligação ao servidor. Verifique a sua ligação à internet.");
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
