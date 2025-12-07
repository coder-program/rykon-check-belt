# Fix: Autenticação em Endpoints - Frontend e Backend

## 🐛 Problema Identificado

Usuário com perfil FRANQUEADO estava vendo:

- Todos os alunos de todas as unidades (não apenas das suas)
- Todas as unidades de todas as franquias (não apenas as suas)
- Todos os professores de todas as unidades (não apenas das suas)

**Causa Raiz**: Os endpoints do frontend não estavam enviando o token de autenticação (`auth: true`), então o backend não conseguia identificar o usuário e aplicar os filtros.

## ✅ Correções Implementadas

### 1. Frontend - Adicionar Autenticação nos Endpoints

**Arquivo**: `frontend/lib/peopleApi.ts`

#### Antes:

```typescript
export async function listAlunos(params: any): Promise<PageResp<any>> {
  const qs = new URLSearchParams(params).toString();
  return http(`/alunos?${qs}`); //  SEM autenticação
}

export async function listUnidades(params: any): Promise<PageResp<any>> {
  const qs = new URLSearchParams(params).toString();
  return http(`/unidades?${qs}`); //  SEM autenticação
}

export async function listProfessores(params: any): Promise<PageResp<any>> {
  const qs = new URLSearchParams(params).toString();
  return http(`/professores?${qs}`); //  SEM autenticação
}
```

#### Depois:

```typescript
export async function listAlunos(params: any): Promise<PageResp<any>> {
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
  const qs = new URLSearchParams(
    filteredParams as Record<string, string>
  ).toString();
  return http(`/alunos?${qs}`, { auth: true }); // ✅ COM autenticação
}

export async function listUnidades(params: any): Promise<PageResp<any>> {
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
  const qs = new URLSearchParams(
    filteredParams as Record<string, string>
  ).toString();
  return http(`/unidades?${qs}`, { auth: true }); // ✅ COM autenticação
}

export async function listProfessores(params: any): Promise<PageResp<any>> {
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
  const qs = new URLSearchParams(
    filteredParams as Record<string, string>
  ).toString();
  return http(`/professores?${qs}`, { auth: true }); // ✅ COM autenticação
}
```

### 2. Backend - Adicionar Proteção em Professores

**Controller**: `backend/src/people/controllers/professores.controller.ts`

#### Antes:

```typescript
@Get()
list(@Query(ValidationPipe) query: any) {
  return this.service.list(query); //  Não passa usuário
}

@Get(':id')
get(@Param('id') id: string) {
  return this.service.findById(id); //  Não passa usuário
}

@Patch(':id')
update(@Param('id') id: string, @Body(ValidationPipe) dto: UpdateProfessorDto) {
  return this.service.update(id, dto); //  Não passa usuário
}
```

#### Depois:

```typescript
@Get()
list(@Query(ValidationPipe) query: any, @Request() req) {
  const user = req?.user || null;
  return this.service.list(query, user); // ✅ Passa usuário
}

@Get(':id')
get(@Param('id') id: string, @Request() req) {
  const user = req?.user || null;
  return this.service.findById(id, user); // ✅ Passa usuário
}

@Patch(':id')
update(@Param('id') id: string, @Body(ValidationPipe) dto: UpdateProfessorDto, @Request() req) {
  const user = req?.user || null;
  return this.service.update(id, dto, user); // ✅ Passa usuário
}
```

**Service**: `backend/src/people/services/professores.service.ts`

```typescript
async list(params: ListProfessoresParams, user?: any) {
  const query = this.personRepository.createQueryBuilder('person');

  // Filtrar apenas professores
  query.where('person.tipo_cadastro = :tipo', { tipo: TipoCadastro.PROFESSOR });

  // Filtros normais...

  // ✅ Se franqueado (não master), filtra apenas professores das suas unidades
  if (user && this.isFranqueado(user) && !this.isMaster(user)) {
    const franqueadoId = await this.getFranqueadoIdByUser(user);
    if (franqueadoId) {
      query.andWhere(
        'person.unidade_id IN (SELECT id FROM teamcruz.unidades WHERE franqueado_id = :franqueadoId)',
        { franqueadoId }
      );
    }
  }

  // Paginação...
}

async findById(id: string, user?: any): Promise<any> {
  const professor = await this.personRepository.findOne({
    where: { id, tipo_cadastro: TipoCadastro.PROFESSOR },
  });

  if (!professor) {
    throw new NotFoundException(`Professor com ID ${id} não encontrado`);
  }

  // ✅ Se franqueado (não master), verifica se professor pertence às suas unidades
  if (user && this.isFranqueado(user) && !this.isMaster(user)) {
    const franqueadoId = await this.getFranqueadoIdByUser(user);
    if (franqueadoId) {
      const unidadesDeFranqueado = await this.getUnidadesDeFranqueado(franqueadoId);
      if (!unidadesDeFranqueado.includes(professor.unidade_id)) {
        throw new NotFoundException('Professor não encontrado');
      }
    }
  }

  return professor;
}

async update(id: string, dto: UpdateProfessorDto, user?: any): Promise<Person> {
  // ✅ Validação de acesso usando findById que já tem a proteção
  await this.findById(id, user);

  // Resto da lógica de update...
}

// ✅ Métodos auxiliares adicionados (mesmos do alunos.service.ts)
private isMaster(user: any): boolean { ... }
private isFranqueado(user: any): boolean { ... }
private async getFranqueadoIdByUser(user: any): Promise<string | null> { ... }
private async getUnidadesDeFranqueado(franqueadoId: string): Promise<string[]> { ... }
```

## 🔄 Fluxo Corrigido

### Antes (ERRADO):

```
Frontend: GET /alunos (SEM token)
    ↓
Backend: req.user = null (não autenticado)
    ↓
Service: Como não tem user, não aplica filtro
    ↓
Retorna: TODOS os alunos do sistema
```

### Depois (CORRETO):

```
Frontend: GET /alunos (COM token no header Authorization)
    ↓
Backend: JwtAuthGuard valida token
    ↓
Backend: req.user = { id: '...', perfis: ['FRANQUEADO'] }
    ↓
Service: Detecta que é FRANQUEADO (não MASTER)
    ↓
Service: Busca franqueado_id do usuário
    ↓
Service: Filtra SQL WHERE unidade_id IN (SELECT id FROM unidades WHERE franqueado_id = ...)
    ↓
Retorna: Apenas alunos das unidades do franqueado ✅
```

## 📊 Resumo das Mudanças

| Arquivo                                                    | Mudanças                                                                          |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `frontend/lib/peopleApi.ts`                                | ✅ Adicionado `{ auth: true }` em `listAlunos`, `listUnidades`, `listProfessores` |
| `backend/src/people/controllers/professores.controller.ts` | ✅ Adicionado `@Request()` e passagem de `user` para service                      |
| `backend/src/people/services/professores.service.ts`       | ✅ Implementado controle de acesso completo (list, findById, update)              |
| `backend/src/people/controllers/alunos.controller.ts`      | ✅ Já estava correto (implementado anteriormente)                                 |
| `backend/src/people/services/alunos.service.ts`            | ✅ Já estava correto (implementado anteriormente)                                 |
| `backend/src/people/controllers/unidades.controller.ts`    | ✅ Já estava correto (implementado anteriormente)                                 |
| `backend/src/people/services/unidades.service.ts`          | ✅ Já estava correto (implementado anteriormente)                                 |

## ✅ Resultado Esperado

Após as correções, quando um usuário com perfil FRANQUEADO fizer login:

### Dashboard

- ✅ Mostra apenas **suas unidades** (baseado em `franqueado.id`)
- ✅ Mostra apenas **alunos das suas unidades**
- ✅ Mostra apenas **professores das suas unidades**
- ✅ Estatísticas calculadas apenas com dados das suas unidades

### Página /alunos

- ✅ Lista apenas **alunos das unidades do franqueado**
- ✅ Total de alunos correto (não mostra alunos de outros)
- ✅ Filtros funcionam apenas no escopo das suas unidades

### Página /unidades

- ✅ Lista apenas **unidades do franqueado**
- ✅ Não mostra unidades de outros franqueados

### Página /professores

- ✅ Lista apenas **professores das unidades do franqueado**
- ✅ Não mostra professores de outras unidades

## 🧪 Como Testar

### Teste 1: Verificar Autenticação

```bash
# Sem token (não deve funcionar)
curl "http://localhost:3000/api/alunos"
# Resultado esperado: 401 Unauthorized

# Com token (deve funcionar)
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/alunos"
# Resultado esperado: Lista de alunos do franqueado
```

### Teste 2: Comparar MASTER vs FRANQUEADO

```bash
# Login como MASTER
# Deve retornar TODOS os alunos

# Login como FRANQUEADO
# Deve retornar apenas alunos das suas unidades
```

### Teste 3: Verificar no Browser

1. Abra DevTools → Network tab
2. Faça login como franqueado
3. Navegue para /alunos
4. Verifique a requisição GET /api/alunos:
   - ✅ Deve ter header: `Authorization: Bearer ...`
   - ✅ Deve retornar apenas 3 alunos (no seu caso, da unidade "team1")

## 🔍 Troubleshooting

### Ainda mostra todos os alunos

1. ✅ Verifique se o backend foi reiniciado
2. ✅ Verifique se o frontend foi recarregado (Ctrl+F5)
3. ✅ Verifique no Network tab se o header Authorization está presente
4. ✅ Verifique se o token JWT está válido e não expirou

### Erro 401 Unauthorized

1. ✅ Token expirado → Faça login novamente
2. ✅ Token inválido → Limpe localStorage e faça login novamente
3. ✅ Backend não está recebendo o token → Verifique `api.ts` e a função `http()`

### Mostra 0 alunos

1. ✅ Verifique se o franqueado tem unidades vinculadas
2. ✅ Verifique se as unidades têm alunos cadastrados
3. ✅ Execute SQL:

```sql
SELECT f.id, f.nome, u.id as unidade_id, u.nome as unidade_nome, COUNT(a.id) as total_alunos
FROM teamcruz.franqueados f
LEFT JOIN teamcruz.unidades u ON u.franqueado_id = f.id
LEFT JOIN teamcruz.alunos a ON a.unidade_id = u.id
WHERE f.usuario_id = '{user_id}'
GROUP BY f.id, f.nome, u.id, u.nome;
```

## 📝 Checklist de Verificação

- [x] `listAlunos` com `{ auth: true }`
- [x] `listUnidades` com `{ auth: true }`
- [x] `listProfessores` com `{ auth: true }`
- [x] Controller de professores passando `user`
- [x] Service de professores com filtro por franqueado
- [x] Service de professores com métodos auxiliares
- [x] findById de professores com proteção
- [x] update de professores com proteção
- [ ] **Backend reiniciado**
- [ ] **Frontend recarregado**
- [ ] **Testado no browser**

## 🚀 Deploy

Após aplicar as correções:

```bash
# Backend
cd backend
npm run start:dev

# Frontend (em outro terminal)
cd frontend
npm run dev
```

Depois, faça logout e login novamente para obter um novo token JWT.
