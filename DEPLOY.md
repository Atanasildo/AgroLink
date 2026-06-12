# Guia de Deploy — AgroLink

## Visão geral
| Parte     | Serviço  | URL                                        |
|-----------|----------|--------------------------------------------|
| Backend   | Render   | https://agrolink-api.onrender.com          |
| Frontend  | Vercel   | https://agro-link-eight.vercel.app         |

---

## 1. Backend → Render

### Passos
1. Aceda a **https://render.com** e entre com GitHub
2. Clique em **"New +"** → **"Blueprint"**
3. Conecte o repositório **Atanasildo/AgroLink**
4. O Render detecta o `render.yaml` e cria automaticamente:
   - O serviço web `agrolink-api` (FastAPI via Docker)
   - A base de dados PostgreSQL `agrolink-db`
5. Aguarde o deploy (~5 min). Quando ficar verde, copie a URL do serviço.

### Verificação
- `https://agrolink-api.onrender.com/health` → `{"status": "ok"}`
- `https://agrolink-api.onrender.com/docs` → Swagger UI

> ⚠️ **Plano gratuito**: o serviço "dorme" após 15 min sem uso e demora ~30s a acordar.

---

## 2. Frontend → Vercel

### Passos
1. Aceda a **https://vercel.com** e entre com GitHub
2. Clique em **"New Project"** → importe **Atanasildo/AgroLink**
3. Em **"Configure Project"**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
4. Em **"Environment Variables"**, adicione **obrigatoriamente**:
   ```
   NEXT_PUBLIC_API_URL = https://agrolink-api.onrender.com/api/v1
   ```
   > ⚠️ Sem esta variável o site tenta ligar a `localhost` e não funciona!
5. Clique em **"Deploy"**

### Se já está deployado e não funciona
1. No dashboard do Vercel → **Settings** → **Environment Variables**
2. Adicione (ou corrija): `NEXT_PUBLIC_API_URL` = `https://agrolink-api.onrender.com/api/v1`
3. Vá a **Deployments** → clique nos **3 pontos** do último deploy → **Redeploy**

---

## 3. Desenvolvimento local

### Pré-requisitos
- Docker Desktop instalado
- Node.js 18+

### Backend
```bash
git clone https://github.com/Atanasildo/AgroLink.git
cd AgroLink
docker compose up --build
```
API disponível em: http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```
Frontend em: http://localhost:3000

---

## Arquitectura
```
GitHub (Atanasildo/AgroLink)
├── backend/    → Render (FastAPI + PostgreSQL)
├── frontend/   → Vercel (Next.js)
└── render.yaml → Configuração automática do Render
```
