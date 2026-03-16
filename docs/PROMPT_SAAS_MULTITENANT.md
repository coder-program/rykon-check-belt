# SaaS Multi-Tenant — Status da Implementacao

**Sistema**: rykon-check-belt
**Objetivo**: Transformar o sistema single-tenant (TeamCruz) em plataforma SaaS para multiplas academias
**Estrategia**: Schema-per-Tenant no PostgreSQL — cada academia com schema isolado
**Ultimo update**: hoje

---

## Status Geral

| # | Tarefa | Status |
|---|--------|--------|
| 1 | SQL — tabela `public.tenants` + seed TeamCruz + Rykon Fit | FEITO (rodado no DBeaver) |
| 2 | TenantModule (entity, service, controller, module) | FEITO |
| 3 | TenantMiddleware (resolve tenant por header/subdominio/query) | FEITO |
| 4 | `@CurrentTenant()` decorator | FEITO |
| 5 | Remover `schema: 'teamcruz'` das 75 entidades TypeORM | FEITO |
| 6 | Remover `searchPath` hardcoded do `app.module.ts` | FEITO |
| 7 | Registrar `TenantModule` + `TenantMiddleware` no `AppModule` | FEITO |
| 8 | `JwtPayload` + metodo `login()` com `tenantSlug` / `tenantSchema` | FEITO |
| 9 | Script de provisionamento `provision-tenant.ts` (Rykon Fit) | FEITO |
| 10 | Frontend: `middleware.ts` — subdominio routing Next.js | FEITO |
| 11 | Frontend: `hooks/useTenant.ts` — hook de config por tenant | FEITO |
| 12 | Frontend: `lib/api.ts` — header `X-Tenant-ID` automatico | FEITO |
| 13 | CORS `*.rykon.com.br` + `X-Tenant-ID` em `allowedHeaders` | FEITO |
| 14 | Excluir migrations do tsconfig.build.json (0 erros TS) | FEITO |
| 13 | Provisionar schema Rykon Fit no banco (rodar script) | PENDENTE |
| 14 | Testar backend com TeamCruz (nao pode quebrar) | PENDENTE |
| 15 | CORS no backend para aceitar subdominios `*.rykon.com.br` | PENDENTE |
| 16 | Vercel: configurar wildcard domain `*.rykon.com.br` | PENDENTE |

---

## Arquivos criados / modificados

### Backend

| Arquivo | O que faz |
|---------|-----------|
| `backend/src/tenants/entities/tenant.entity.ts` | Entidade Tenant no schema public — UNICA com schema explicito |
| `backend/src/tenants/tenant.service.ts` | Busca tenant por slug com cache em memoria, expoe config publica |
| `backend/src/tenants/tenant.controller.ts` | GET /tenants e GET /tenants/:slug/config (sem auth) |
| `backend/src/tenants/tenant.module.ts` | Modulo @Global() — TenantService injetavel em qualquer lugar |
| `backend/src/common/middleware/tenant.middleware.ts` | Resolve tenant por: 1 header X-Tenant-ID, 2 subdominio, 3 ?tenant=, 4 fallback teamcruz |
| `backend/src/common/decorators/current-tenant.decorator.ts` | @CurrentTenant(), @CurrentTenant('slug'), @CurrentTenant('schema') |
| `backend/src/scripts/provision-tenant.ts` | Cria schema, copia tabelas, registra em public.tenants, seed de faixas |
| `backend/src/app.module.ts` | searchPath removido; TenantModule adicionado; TenantMiddleware como PRIMEIRO middleware |
| `backend/src/auth/auth.service.ts` | JwtPayload agora carrega tenantSlug e tenantSchema; login() aceita esses params |
| `backend/src/auth/auth.controller.ts` | Passa req.tenantSlug e req.tenantSchema para authService.login() |
| **75 entidades TypeORM** | schema: 'teamcruz' removido de todas — TypeORM resolve via search_path |

### Frontend

| Arquivo | O que faz |
|---------|-----------|
| `frontend/middleware.ts` | Extrai tenant do subdominio, seta header x-tenant-slug e cookie tenant-slug |
| `frontend/hooks/useTenant.ts` | Hook useTenant() — le cookie, busca GET /tenants/:slug/config, retorna { tenant, loading } |
| `frontend/lib/api.ts` | Header X-Tenant-ID adicionado automaticamente em toda requisicao |

### Banco / Infra

| Arquivo | O que faz |
|---------|-----------|
| `database/multitenant-setup.sql` | SQL pronto para DBeaver: cria public.tenants, registra TeamCruz e Rykon Fit |

---

## O que falta (em ordem de execucao)

### 1. Rodar SQL no DBeaver

Abrir `database/multitenant-setup.sql` e executar no banco do Railway.

```sql
-- Verificar depois:
SELECT id, slug, nome, schema_name, plano, ativo FROM public.tenants;
```

---

### 2. Provisionar o schema Rykon Fit no banco

```bash
cd backend
npx ts-node -r tsconfig-paths/register src/scripts/provision-tenant.ts rykonfit "Rykon Fit"
```

O script faz:
- CREATE SCHEMA IF NOT EXISTS rykonfit
- Copia todas as tabelas com LIKE teamcruz."tabela" INCLUDING ALL
- Registra em public.tenants
- Seed das faixas (copia do teamcruz)

---

### 3. Testar retrocompatibilidade TeamCruz

```bash
# Sem header = fallback teamcruz (NAO pode quebrar)
curl http://localhost:3000/alunos -H "Authorization: Bearer SEU_TOKEN"

# Com header explicito
curl http://localhost:3000/alunos -H "Authorization: Bearer SEU_TOKEN" -H "X-Tenant-ID: teamcruz"

# Login deve retornar tenantSlug no payload do JWT
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: teamcruz" \
  -d '{"username":"admin","password":"..."}'
```

---

### 4. Testar Rykon Fit isolado

```bash
# Dados do Rykon Fit devem estar separados (retorna vazio = schema proprio)
curl http://localhost:3000/alunos \
  -H "Authorization: Bearer TOKEN_RYKONFIT" \
  -H "X-Tenant-ID: rykonfit"
```

---

### 5. CORS para subdominios — editar backend/src/main.ts

```typescript
app.enableCors({
  origin: (origin, callback) => {
    const allowed =
      /^https?:\/\/(.*\.)?rykon\.com\.br$/.test(origin || '') ||
      /^https?:\/\/localhost/.test(origin || '');
    callback(null, allowed ? origin : false);
  },
  credentials: true,
});
```

---

### 6. Vercel — wildcard domain

No painel Vercel > Settings > Domains:
1. Adicionar *.rykon.com.br
2. No DNS: CNAME * apontando para cname.vercel-dns.com

Resultado:
- teamcruz.rykon.com.br  = frontend tenant=teamcruz
- rykonfit.rykon.com.br  = frontend tenant=rykonfit

---

## Como adicionar um novo tenant

```bash
# 1. Provisionar (uma linha)
npx ts-node -r tsconfig-paths/register src/scripts/provision-tenant.ts graciebarra "Gracie Barra"

# 2. Personalizar cores/logo via DBeaver
UPDATE public.tenants
SET logo_url = 'https://...', cor_primaria = '#003087', cor_secundaria = '#ffffff'
WHERE slug = 'graciebarra';

# 3. Criar admin do tenant
POST /auth/register com header X-Tenant-ID: graciebarra
```

---

## Arquitetura final

```
Internet
  teamcruz.rykon.com.br   -+
  rykonfit.rykon.com.br   -+-->  Vercel (Next.js)
  graciebarra.rykon.com.br-+        middleware.ts le subdominio
                                    cookie: tenant-slug=teamcruz
                                    header: X-Tenant-ID: teamcruz
                                         |
                                    Railway (NestJS)
                                      TenantMiddleware (PRIMEIRO)
                                         |
                                    PostgreSQL Railway
                                    - schema: public      = public.tenants
                                    - schema: teamcruz    = dados TeamCruz
                                    - schema: rykonfit    = dados Rykon Fit
                                    - schema: graciebarra = ...
```

---

## Armadilhas / lembretes

- **synchronize: false** — nunca ligar no TypeORM com multi-tenant
- **Tenant entity** e a UNICA com schema: 'public' — todas as outras sem schema definido
- **TenantMiddleware** deve ser registrado ANTES do AuditMiddleware no AppModule
- **GET /tenants/:slug/config** e publico — nao adicionar guard de auth
- **Migrations futuras** precisam rodar SET search_path TO slug, public por tenant separado
- **Cache** do TenantService e em memoria — ao atualizar tenant no banco chamar invalidateCache(slug)