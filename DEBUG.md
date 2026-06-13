# 🔍 Documento de Diagnóstico - AgroLink

**Data:** 13 de Junho de 2026  
**Status:** Em desenvolvimento - Múltiplos problemas identificados

---

## ✅ O que está funcionando

- ✅ **Marketplace** — produtos carregam sem erros
- ✅ **Página de Perfil** — mostra dados básicos do utilizador
- ✅ **Autenticação** — login/register funcionam
- ✅ **Frontend (Vercel)** — compilação OK

---

## 🔴 Problemas Identificados

### 1. **Error 500 em `/api/v1/machines/`**
**Sintomas:**
- Página de máquinas fica travada carregando
- Console: `GET .../api/v1/machines/ net::ERR_FAILED 500`
- CORS bloqueado (resultado do 500 sem headers)

**Causa provável:**
- Problema na BD (tabela `machines` ou relacionamentos)
- Ou erro em `list_machines()` no CRUD

**Para debugar:**
```bash
# Acede a este endpoint para testar:
curl https://agrolink-api-67zk.onrender.com/api/v1/diagnostic/db
curl https://agrolink-api-67zk.onrender.com/api/v1/diagnostic/tables
```

**Fixes aplicados:**
- Frontend: Desabilitar temporariamente listagem de máquinas
- Mostrar mensagem "Em manutenção"

---

### 2. **Error 500 em `/api/v1/ratings/users/{id}/summary`**
**Sintomas:**
- Ratings não carregam
- Console: `GET .../ratings/users/{id}/summary net::ERR_FAILED 500`

**Causa provável:**
- Tabela `ratings` pode não existir ou ter schema diferente
- Ou erro em `get_rating_summary()` no CRUD

**Fixes aplicados:**
- Frontend: Remover seção de ratings (estava bloqueando página)
- Mostrar aviso "Ratings em manutenção"

---

### 3. **Render Free Tier - Cold Start**
**Sintomas:**
- Backend demora 30-60s a acordar após inatividade
- Primeiras requests falham

**Fixes aplicados:**
- Frontend: Retry automático (8 tentativas em 70s)
- Wakeup preventivo no `/health`
- Auto-retry com banner de progresso

---

## 📋 Checklist de Próximos Passos

### Fase 1: Debugar Backend (CRÍTICO)
- [ ] Aceder aos logs do Render (`dashboard.render.com → agrolink-api → Logs`)
- [ ] Verificar se tabela `machines` existe e tem dados
- [ ] Verificar se tabela `ratings` existe e tem schema correto
- [ ] Testar endpoints de diagnóstico:
  ```
  /api/v1/diagnostic/db
  /api/v1/diagnostic/tables
  /api/v1/diagnostic/machines-count
  /api/v1/diagnostic/ratings-count
  ```

### Fase 2: Corrigir Backend
- [ ] Corrigir erro 500 em `/api/v1/machines/`
- [ ] Corrigir erro 500 em `/api/v1/ratings/`
- [ ] Testar endpoints via Swagger (`/docs`)
- [ ] Fazer seed de dados se BD estiver vazia

### Fase 3: Reabilitar Frontend
- [ ] Desabilipar workaround em `src/app/maquinas/page.tsx`
- [ ] Reimplementar seção de ratings em `src/app/perfil/[id]/page.tsx`
- [ ] Testar todas as páginas

---

## 🛠️ Endpoints de Diagnóstico Disponíveis

**GET** `/api/v1/diagnostic/health` — Health check simples  
**GET** `/api/v1/diagnostic/db` — Testa conexão à BD  
**GET** `/api/v1/diagnostic/tables` — Lista todas as tabelas  
**GET** `/api/v1/diagnostic/users-count` — Conta utilizadores  
**GET** `/api/v1/diagnostic/ratings-count` — Conta ratings  
**GET** `/api/v1/diagnostic/python-version` — Info do Python  

---

## 📊 Status das Páginas

| Página | Status | Problema | Workaround |
|--------|--------|----------|-----------|
| Home | ✅ OK | — | — |
| Login/Register | ✅ OK | — | — |
| Marketplace | ✅ OK | — | — |
| Perfil | ✅ OK | Ratings desabilitado | Mostra aviso |
| Máquinas | ⚠️ Em Manutenção | 500 em list_machines | Placeholder |
| Transporte | ❓ Não testado | — | — |

---

## 🔧 Commits Realizados

- **3717f5a** — Melhorar tratamento de erros 500 + CORS
- **f0f114c** — Criar diagnóstico + desabilitar ratings
- **6d1eae0** — Corrigir sintaxe JSX no perfil
- **[current]** — Desabilitar máquinas + criar DEBUG.md

---

## 📞 Contacto

Erros 500 → Verificar logs no Render  
CORS → Verificar se headers estão na resposta  
Timeout → Provavelmente cold start do Render (aguardar 60s)

