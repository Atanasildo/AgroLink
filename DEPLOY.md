# Guia de Deploy — AgroLink

## Visão geral
| Parte     | Serviço  | URL após deploy                        |
|-----------|----------|----------------------------------------|
| Backend   | Render   | https://agrolink-api.onrender.com      |
| Frontend  | Vercel   | https://agrolink.vercel.app            |

---

## 1. Backend → Render (gratuito)

### Passos
1. Aceda a **https://render.com** e crie uma conta (ou entre com GitHub)
2. Clique em **"New +"** → **"Blueprint"**
3. Conecte o repositório **Atanasildo/AgroLink**
4. O Render vai detectar o ficheiro `render.yaml` e criar automaticamente:
   - O serviço web `agrolink-api` (FastAPI via Docker)
   - A base de dados PostgreSQL `agrolink-db`
5. Aguarde o deploy (~5 min). Quando ficar verde, copie a URL do serviço (ex: `https://agrolink-api.onrender.com`)

### Verificação
Aceda a `https://agrolink-api.onrender.com/health` — deve retornar `{"status": "ok"}`
Aceda a `https://agrolink-api.onrender.com/docs` — Swagger UI com todos os endpoints

> ⚠️ **Plano gratuito do Render**: o serviço "dorme" após 15 min sem uso e demora ~30s a acordar no primeiro acesso.

---

## 2. Frontend → Vercel (gratuito)

### Passos
1. Aceda a **https://vercel.com** e entre com a sua conta GitHub
2. Clique em **"New Project"** → importe **Atanasildo/AgroLink**
3. Em **"Configure Project"**:
   - **Framework Preset**: Next.js (detectado automaticamente)
   - **Root Directory**: `frontend`
4. Em **"Environment Variables"**, adicione:
   ```
   NEXT_PUBLIC_API_URL = https://agrolink-api.onrender.com
   ```
5. Clique em **"Deploy"** (~2 min)
6. A Vercel fornecerá um URL tipo `https://agrolink.vercel.app`

### Verificação
Aceda ao URL e confirme que:
- A landing page carrega com o tema agrícola ✅
- O login/registo funcionam (precisam do backend activo) ✅

---

## 3. Executar localmente (desenvolvimento)

### Pré-requisitos
- [Docker Desktop](https://docker.com/products/docker-desktop) instalado
- Node.js 18+

### Backend + Banco de dados
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
copy .env.example .env.local   # Windows
# cp .env.example .env.local   # Mac/Linux
npm run dev
```
Frontend disponível em: http://localhost:3000

---

## 4. Executar migrações (primeira vez)
Após o backend estar em execução:
```bash
docker compose exec backend alembic upgrade head
```

---

## Arquitectura
```
GitHub (Atanasildo/AgroLink)
├── backend/          → Render (FastAPI + PostgreSQL)
├── frontend/         → Vercel (Next.js)
├── mobile/           → (Flutter — em desenvolvimento)
└── render.yaml       → Configuração automática do Render
```
