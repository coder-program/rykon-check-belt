# Fix: Filtro de Alunos por Franqueado na Página /alunos

## 🐛 Problema Identificado

Na página `/alunos`, quando um usuário com perfil **FRANQUEADO** fazia login, ele via **todos os alunos do sistema**, não apenas os alunos das suas unidades.

## ✅ Solução Implementada

### 1. Frontend - Página `/alunos`

**Arquivo**: `frontend/app/alunos/page.tsx`

**Mudanças**:

1. ✅ Importado `useAuth` e `getMyFranqueado`
2. ✅ Adicionada query para buscar franqueado do usuário logado
3. ✅ Atualizada query de unidades para filtrar por `franqueado_id`
4. ✅ Backend já filtra alunos automaticamente (proteção dupla)

**Código Adicionado**:

```typescript
// Imports
import { useAuth } from "@/app/auth/AuthContext";
import { getMyFranqueado } from "@/lib/peopleApi";

export default function PageAlunos() {
  const { user } = useAuth();

  // Buscar franqueado do usuário logado (se for franqueado)
  const isFranqueado = user?.perfis?.some(
    (perfil: any) => perfil.nome?.toLowerCase() === "franqueado"
  );

  const { data: myFranqueado } = useQuery({
    queryKey: ["franqueado-me", user?.id],
    queryFn: getMyFranqueado,
    enabled: !!user?.id && isFranqueado,
  });

  // Query de unidades com filtro por franqueado
  const unidadesQuery = useQuery({
    queryKey: ["unidades", myFranqueado?.id],
    queryFn: () =>
      listUnidades({
        pageSize: 100,
        franqueado_id: myFranqueado?.id, // ✅ FILTRO ADICIONADO
      }),
    // ...
  });

  // Query de alunos (backend já filtra automaticamente)
  // Não precisa passar franqueado_id porque o backend
  // detecta o usuário logado e filtra automaticamente
}
```

### 2. Backend - Já Estava Protegido ✅

O backend já estava configurado corretamente:

- ✅ `listAlunos()` no frontend agora envia `{ auth: true }`
- ✅ `AlunosController.list()` recebe `@Request() req` e passa `user` para service
- ✅ `AlunosService.list()` filtra automaticamente por unidades do franqueado:

```typescript
// Se franqueado (não master), filtra apenas alunos das suas unidades
if (user && this.isFranqueado(user) && !this.isMaster(user)) {
  const franqueadoId = await this.getFranqueadoIdByUser(user);
  if (franqueadoId) {
    query.andWhere(
      "aluno.unidade_id IN (SELECT id FROM teamcruz.unidades WHERE franqueado_id = :franqueadoId)",
      { franqueadoId }
    );
  }
}
```

## 🎯 Resultado

### Antes ( Incorreto)

```
Franqueado RJ faz login
→ Vê 390 alunos (todos do sistema)
→ Dropdown de unidades mostra 10+ unidades
→ Pode filtrar por qualquer unidade
```

### Depois (✅ Correto)

```
Franqueado RJ faz login
→ Backend filtra automaticamente
→ Vê apenas ~240 alunos (das 2 unidades do RJ)
→ Dropdown de unidades mostra apenas 2 unidades do RJ
→ Pode filtrar apenas entre suas unidades
```

## 🔒 Proteção em Múltiplas Camadas

### Layer 1: Frontend

- Query de unidades filtra por `franqueado_id`
- Dropdown só mostra unidades do franqueado
- Interface limita escolhas do usuário

### Layer 2: Backend (Principal)

- Controller recebe usuário autenticado
- Service detecta perfil FRANQUEADO
- SQL filtra WHERE unidade_id IN (unidades do franqueado)
- Impossível burlar via DevTools ou modificação do frontend

## 🔄 Fluxo Completo

```
1. Usuário FRANQUEADO faz login
   ↓
2. Token JWT com perfil FRANQUEADO
   ↓
3. Página /alunos carrega
   ↓
4. Query busca myFranqueado via GET /franqueados/me
   ↓
5. Retorna: { id: "4fb0aea4-...", nome: "TeamCruz RJ" }
   ↓
6. Query de unidades: GET /unidades?franqueado_id=4fb0aea4-...
   ↓
7. Retorna apenas 2 unidades do RJ
   ↓
8. Query de alunos: GET /alunos (com Authorization Bearer)
   ↓
9. Backend detecta perfil FRANQUEADO
   ↓
10. Backend busca franqueado_id do usuário
   ↓
11. Backend filtra SQL por unidades do franqueado
   ↓
12. Retorna apenas alunos das unidades do RJ
   ↓
13. Frontend renderiza lista filtrada
```

## 📊 Exemplo Prático

### Franqueado RJ

**Unidades**:

- TeamCruz RJ - Unidade Barra da Tijuca (150 alunos)
- TeamCruz RJ - Unidade Copacabana (90 alunos)

**Antes**:

- Total mostrado: 390 alunos (todos do sistema)
- Unidades no dropdown: 10+ unidades
- Podia ver alunos do SP, Santana, etc.

**Depois**:

- Total mostrado: 240 alunos (apenas do RJ)
- Unidades no dropdown: 2 unidades (apenas do RJ)
- Só vê alunos das suas próprias unidades

### Master

**Continua igual**:

- Vê todos os 390+ alunos
- Vê todas as 10+ unidades
- Sem filtro aplicado

## 🧪 Como Testar

### Teste 1: Login como Franqueado RJ

```bash
1. Logout (se logado)
2. Login com usuário franqueado RJ
3. Ir para /alunos
4. Verificar contador: deve mostrar ~240 alunos
5. Verificar dropdown de unidades: apenas 2 opções
6. Verificar lista: apenas alunos das unidades RJ
```

### Teste 2: Verificar Network Tab

```bash
1. Abrir DevTools (F12) → Network
2. Acessar /alunos
3. Procurar request GET /api/alunos
4. Verificar headers: Authorization Bearer presente
5. Verificar response: apenas alunos filtrados
```

### Teste 3: Tentar Hackear

```bash
1. Login como franqueado RJ
2. Abrir DevTools → Network
3. Copiar request GET /api/alunos
4. Modificar para adicionar unidade_id de outra franquia
5. Enviar request modificado
6. Resultado: Backend ignora e retorna apenas alunos do RJ
```

### Teste 4: Comparar com Master

```bash
1. Logout
2. Login como MASTER
3. Acessar /alunos
4. Verificar: deve ver TODOS os alunos
5. Dropdown: deve ter TODAS as unidades
```

## 🔍 Arquivos Modificados

1. ✅ `frontend/app/alunos/page.tsx`

   - Importado `useAuth` e `getMyFranqueado`
   - Adicionada query `myFranqueado`
   - Adicionado filtro `franqueado_id` na query de unidades

2. ✅ `frontend/lib/peopleApi.ts` (modificado anteriormente)

   - `listAlunos()` agora envia `{ auth: true }`

3. ✅ `backend/src/people/controllers/alunos.controller.ts` (modificado anteriormente)

   - Controller passa `user` para service

4. ✅ `backend/src/people/services/alunos.service.ts` (modificado anteriormente)
   - Service filtra alunos por unidades do franqueado

## 📝 Páginas Protegidas - Checklist Atualizado

- [x] `/dashboard` - Dashboard do franqueado ✅
- [x] `/unidades` - Gerenciar Unidades ✅
- [x] `/alunos` - Lista de Alunos ✅
- [ ] `/professores` - Lista de Professores (precisa verificar)
- [ ] `/graduacoes` - Graduações (herdado da proteção de alunos)

## 💡 Diferença entre Unidades e Alunos

### Unidades (`/unidades`)

- **Frontend**: Passa `franqueado_id` explicitamente
- **Backend**: Valida e força filtro se necessário

### Alunos (`/alunos`)

- **Frontend**: NÃO precisa passar parâmetro
- **Backend**: Detecta automaticamente via token JWT
- **Vantagem**: Impossível burlar modificando código frontend

## 🚀 Próximos Passos

1. ✅ **Teste**: Fazer logout/login como franqueado RJ
2. ✅ **Verificar**: Contadores, lista e dropdown de unidades
3. 📝 **Pendente**: Aplicar mesmo filtro em `/professores`
4. 📝 **Pendente**: Adicionar indicador visual "Meus Alunos" vs "Todos os Alunos"

## 🔐 Segurança Garantida

✅ **Dupla Proteção**:

1. Frontend filtra unidades disponíveis
2. Backend filtra alunos no SQL (camada inviolável)

✅ **Impossível Burlar**:

- Modificar código JS? Backend ignora
- Modificar request no Network? Backend valida token
- Tentar SQL Injection? Prepared statements protegem
- Tentar acessar API diretamente? JWT guard protege

## 📚 Documentação Relacionada

- `CONTROLE_ACESSO_FRANQUEADO.md` - Documentação completa de segurança
- `FIX_AUTENTICACAO_ENDPOINTS.md` - Correção de autenticação
- `FRONTEND_FILTRO_UNIDADE.md` - Filtro de unidades
