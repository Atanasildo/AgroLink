# AgroLink

Plataforma AgriTech e LogTech que conecta agricultores, compradores, transportadores, proprietários de máquinas agrícolas e cooperativas em uma única solução digital — com foco prioritário no módulo de **Transporte Rural**.

## Visão Geral

O AgroLink combina:

- Marketplace Agrícola
- Plataforma de Logística Rural (prioridade máxima)
- Aluguel de Máquinas Agrícolas
- Rede Social Agrícola
- Sistema de Preços Agrícolas
- Mapa Agrícola Inteligente (OpenStreetMap)
- Chat em tempo real
- Pagamentos com retenção de comissão
- Avaliações

## Estrutura do Repositório

```
AgroLink/
├── backend/        # API FastAPI + PostgreSQL/PostGIS
├── frontend/       # Web responsivo (Next.js) - a desenvolver
├── mobile/         # App Android (Flutter) - a desenvolver
├── docs/           # Documentação e especificações
└── docker-compose.yml
```

## Stack Tecnológica

| Camada            | Tecnologia            |
|-------------------|------------------------|
| Frontend Mobile   | Flutter                |
| Frontend Web      | Next.js                |
| Backend           | FastAPI                |
| Banco de Dados    | PostgreSQL + PostGIS   |
| Autenticação      | JWT                    |
| Tempo Real        | WebSockets             |
| Armazenamento     | MinIO / AWS S3         |
| Notificações      | Firebase Cloud Messaging |
| Containerização   | Docker                 |

## Como executar o backend (desenvolvimento)

Pré-requisitos: Docker e Docker Compose instalados.

```bash
# Na raiz do projeto
docker compose up --build
```

Isso vai iniciar:
- `db`: PostgreSQL com extensão PostGIS habilitada
- `api`: API FastAPI em http://localhost:8000
- Documentação interativa (Swagger) em http://localhost:8000/docs

### Variáveis de ambiente

Copie `backend/.env.example` para `backend/.env` e ajuste os valores conforme necessário.

### Migrações de banco de dados (Alembic)

```bash
docker compose exec api alembic revision --autogenerate -m "mensagem"
docker compose exec api alembic upgrade head
```

## Módulos do Backend (MVP)

- **Autenticação** (`/api/v1/auth`): cadastro, login, refresh token, JWT
- **Usuários** (`/api/v1/users`): perfis (agricultor, comprador, transportador, proprietário de máquinas, admin)
- **Marketplace** (`/api/v1/products`): produtos agrícolas, filtros por categoria/província/município/preço
- **Transporte Rural** (`/api/v1/transport`): veículos, rotas, solicitações de transporte, comissão automática
- **Máquinas Agrícolas** (`/api/v1/machines`): equipamentos, reservas, comissão automática (10%)
- **Avaliações** (`/api/v1/ratings`): avaliações 1-5 estrelas entre utilizadores

## Próximos Passos

1. Implementar Chat (WebSockets)
2. Implementar Sistema de Preços Agrícolas
3. Implementar Mapa Agrícola (PostGIS + OpenStreetMap)
4. Implementar Pagamentos
5. Desenvolver Frontend Web (Next.js)
6. Desenvolver App Mobile (Flutter)
7. Painel Administrativo
