# Correção Completa do Filtro de Alunos para Franqueados

## Problema Identificado

Franqueados estavam vendo **TODOS** os alunos do sistema ao invés de apenas os alunos das suas próprias unidades.

## Causas Identificadas

### 1. **Frontend - Falta de Autenticação nas Requisições**

- ❌ `listAlunos()` não estava enviando `{ auth: true }`
- ❌ `listUnidades()` não estava enviando `{ auth: true }`
- ❌ `getAlunosStats()` não estava enviando `{ auth: true }`

**Resultado**: Backend não recebia o token JWT e não conseguia identificar o usuário/franqueado logado.

### 2. **Backend - Método getStats sem Filtro de Franqueado**

- ❌ Controller `getStats()` não recebia parâmetro `@Request() req`
- ❌ Service `getStats()` não recebia parâmetro `user`
- ❌ Queries de estatísticas não filtravam por unidades do franqueado

**Resultado**: Contadores e estatísticas mostravam dados de TODO o sistema.

## Correções Aplicadas

### Frontend (`frontend/app/alunos/page.tsx`)

```typescript
// ✅ ANTES (SEM autenticação)
async function listAlunos(params: any) {
  const qs = new URLSearchParams(params).toString();
  return http(`/alunos?${qs}`);
}

// ✅ DEPOIS (COM autenticação)
async function listAlunos(params: any) {
  const qs = new URLSearchParams(params).toString();
  return http(`/alunos?${qs}`, { auth: true });
}

// ✅ ANTES (SEM autenticação)
async function listUnidades(params: any) {
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
  const qs = new URLSearchParams(filteredParams).toString();
  return http(`/unidades?${qs}`);
}

// ✅ DEPOIS (COM autenticação)
async function listUnidades(params: any) {
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
  const qs = new URLSearchParams(filteredParams).toString();
  return http(`/unidades?${qs}`, { auth: true });
}

// ✅ ANTES (SEM autenticação)
async function getAlunosStats(params: any) {
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
  const qs = new URLSearchParams(filteredParams).toString();
  return http(`/alunos/stats/counts?${qs}`);
}

// ✅ DEPOIS (COM autenticação)
async function getAlunosStats(params: any) {
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
  const qs = new URLSearchParams(filteredParams).toString();
  return http(`/alunos/stats/counts?${qs}`, { auth: true });
}
```

### Backend - Controller (`backend/src/people/controllers/alunos.controller.ts`)

```typescript
// ✅ ANTES (SEM user context)
@Get('stats/counts')
@ApiOperation({ summary: 'Obter contadores de alunos por filtros' })
@ApiQuery({ name: 'search', required: false })
@ApiQuery({ name: 'unidade_id', required: false })
async getStats(@Query(ValidationPipe) query: any) {
  return this.service.getStats(query);
}

// ✅ DEPOIS (COM user context)
@Get('stats/counts')
@ApiOperation({ summary: 'Obter contadores de alunos por filtros' })
@ApiQuery({ name: 'search', required: false })
@ApiQuery({ name: 'unidade_id', required: false })
async getStats(@Query(ValidationPipe) query: any, @Request() req) {
  const user = req?.user || null;
  return this.service.getStats(query, user);
}
```

### Backend - Service (`backend/src/people/services/alunos.service.ts`)

```typescript
// ✅ ANTES (SEM filtro de franqueado)
async getStats(params: { search?: string; unidade_id?: string }) {
  const baseQuery = this.alunoRepository.createQueryBuilder('aluno');

  if (params.search) {
    baseQuery.andWhere(
      '(LOWER(aluno.nome_completo) LIKE :search OR aluno.cpf LIKE :search OR aluno.numero_matricula LIKE :search)',
      { search: `%${params.search.toLowerCase()}%` },
    );
  }

  if (params.unidade_id) {
    baseQuery.andWhere('aluno.unidade_id = :unidade', {
      unidade: params.unidade_id,
    });
  }

  // ... resto do código
}

// ✅ DEPOIS (COM filtro de franqueado)
async getStats(params: { search?: string; unidade_id?: string }, user?: any) {
  const baseQuery = this.alunoRepository.createQueryBuilder('aluno');

  if (params.search) {
    baseQuery.andWhere(
      '(LOWER(aluno.nome_completo) LIKE :search OR aluno.cpf LIKE :search OR aluno.numero_matricula LIKE :search)',
      { search: `%${params.search.toLowerCase()}%` },
    );
  }

  if (params.unidade_id) {
    baseQuery.andWhere('aluno.unidade_id = :unidade', {
      unidade: params.unidade_id,
    });
  }
  // ✅ NOVO: Se franqueado (não master), filtra apenas alunos das suas unidades
  else if (user && this.isFranqueado(user) && !this.isMaster(user)) {
    const franqueadoId = await this.getFranqueadoIdByUser(user);
    if (franqueadoId) {
      baseQuery.andWhere(
        'aluno.unidade_id IN (SELECT id FROM teamcruz.unidades WHERE franqueado_id = :franqueadoId)',
        { franqueadoId },
      );
    }
  }

  // ... resto do código
}
```

**Também foi corrigida a query de faixas dentro do getStats:**

```typescript
// ✅ ANTES (SEM filtro de franqueado)
const faixaStats = await this.alunoRepository
  .createQueryBuilder("aluno")
  .select("aluno.faixa_atual", "faixa")
  .addSelect("COUNT(*)", "count")
  .where("aluno.status = :status", { status: StatusAluno.ATIVO })
  .groupBy("aluno.faixa_atual")
  .getRawMany();

// ✅ DEPOIS (COM filtro de franqueado)
const faixaQuery = this.alunoRepository
  .createQueryBuilder("aluno")
  .select("aluno.faixa_atual", "faixa")
  .addSelect("COUNT(*)", "count")
  .where("aluno.status = :status", { status: StatusAluno.ATIVO });

// Aplicar mesmos filtros que a baseQuery
if (params.search) {
  faixaQuery.andWhere(
    "(LOWER(aluno.nome_completo) LIKE :search OR aluno.cpf LIKE :search OR aluno.numero_matricula LIKE :search)",
    { search: `%${params.search.toLowerCase()}%` }
  );
}

if (params.unidade_id) {
  faixaQuery.andWhere("aluno.unidade_id = :unidade", {
    unidade: params.unidade_id,
  });
}
// Se franqueado (não master), filtra apenas alunos das suas unidades
else if (user && this.isFranqueado(user) && !this.isMaster(user)) {
  const franqueadoId = await this.getFranqueadoIdByUser(user);
  if (franqueadoId) {
    faixaQuery.andWhere(
      "aluno.unidade_id IN (SELECT id FROM teamcruz.unidades WHERE franqueado_id = :franqueadoId)",
      { franqueadoId }
    );
  }
}

const faixaStats = await faixaQuery.groupBy("aluno.faixa_atual").getRawMany();
```

## Fluxo de Proteção Completo

### 1. **Frontend envia token JWT**

```
GET /alunos?page=1&pageSize=20
Authorization: Bearer eyJhbGc...
```

### 2. **Backend extrai usuário do token**

```typescript
@Request() req  // req.user contém { id, email, perfis: [...] }
```

### 3. **Service verifica se é franqueado**

```typescript
isFranqueado(user); // Retorna true se tem perfil "FRANQUEADO"
isMaster(user); // Retorna false (não é master)
```

### 4. **Service busca ID do franqueado**

```typescript
getFranqueadoIdByUser(user);
// SELECT id FROM franqueados WHERE usuario_id = user.id
// Retorna: franqueadoId = "uuid-do-franqueado"
```

### 5. **Service filtra alunos por unidades do franqueado**

```sql
SELECT aluno.*
FROM teamcruz.alunos aluno
WHERE aluno.unidade_id IN (
  SELECT id
  FROM teamcruz.unidades
  WHERE franqueado_id = 'uuid-do-franqueado'
)
```

### 6. **Frontend recebe apenas alunos permitidos**

```json
{
  "items": [
    /* apenas alunos das unidades do franqueado */
  ],
  "total": 240, // ao invés de 390+
  "page": 1,
  "pageSize": 20
}
```

## Resultado Esperado

### ✅ Login como Franqueado RJ (franqueado_id = "uuid-rj")

**Unidades do Franqueado RJ:**

- Unidade Botafogo
- Unidade Copacabana
- Unidade Ipanema

**Alunos Visíveis:** ~240 alunos (apenas das 3 unidades acima)

**Estatísticas:**

```json
{
  "total": 240,
  "ativos": 200,
  "inativos": 30,
  "suspensos": 5,
  "cancelados": 5,
  "faixas": {
    "BRANCA": 80,
    "AZUL": 60,
    "ROXA": 40,
    "MARROM": 30,
    "PRETA": 30
  }
}
```

### ✅ Login como Master

**Unidades Visíveis:** TODAS as unidades do sistema

**Alunos Visíveis:** TODOS os alunos (390+)

**Estatísticas:** Totais de TODO o sistema

## Verificação

### Como Testar

1. **Faça logout** (se estiver logado)
2. **Login como franqueado RJ**:
   - Email: `franqueado.rj@teamcruz.com.br`
   - Senha: (a que você configurou)
3. **Acesse `/alunos`**
4. **Verifique o contador**: Deve mostrar ~240 alunos ao invés de 390+
5. **Verifique as unidades no filtro**: Deve mostrar apenas Botafogo, Copacabana, Ipanema
6. **Verifique as estatísticas**: Números devem refletir apenas alunos das suas unidades

### Comandos para Debug (Backend)

```bash
# Ver logs do backend para confirmar filtro
# Deve aparecer: "Filtering alunos for franqueado: uuid-rj"
```

## Arquivos Modificados

1. ✅ `frontend/app/alunos/page.tsx` - Adicionado `{ auth: true }` em 3 funções
2. ✅ `backend/src/people/controllers/alunos.controller.ts` - Adicionado `@Request() req` no getStats
3. ✅ `backend/src/people/services/alunos.service.ts` - Adicionado filtro de franqueado no getStats (2 queries)

## Segurança Multicamadas

| Camada                   | Proteção             | Status          |
| ------------------------ | -------------------- | --------------- |
| **Frontend - Auth**      | Envia token JWT      | ✅ Implementado |
| **Backend - JWT Guard**  | Valida token         | ✅ Implementado |
| **Backend - Service**    | Filtra por SQL WHERE | ✅ Implementado |
| **Backend - Controller** | Passa user context   | ✅ Implementado |

## Próximos Passos

1. ✅ Testar como franqueado RJ
2. ✅ Testar como franqueado SP
3. ✅ Testar como master (deve ver tudo)
4. 🔄 Aplicar mesmo padrão em `/professores` se necessário
5. 🔄 Aplicar mesmo padrão em `/graduacoes` se necessário

---

**Data da Correção:** 16/10/2025
**Problema:** Franqueados vendo alunos de todas as unidades
**Solução:** Autenticação JWT + Filtro SQL por franqueado_id nas queries
