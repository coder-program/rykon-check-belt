# Permissões de Aprovação de Usuários e Alunos

## 📋 Resumo das Alterações

### ✅ O que foi feito

1. **Adicionados Guards e Decorators nos Controllers:**

   - `usuarios.controller.ts` - Endpoints de aprovação de usuários
   - `alunos.controller.ts` - Endpoint de aprovação de alunos
   - Agora usam `@UseGuards(JwtAuthGuard, PermissionsGuard)` e `@Permissions(...)`

2. **Permissões Criadas:**

   - `usuarios:aprovar` - Aprovar cadastro de usuários
   - `alunos:aprovar` - Aprovar auto-cadastro de alunos

3. **Perfis com Acesso:**
   - ✅ **FRANQUEADO** - pode aprovar usuários e alunos
   - ✅ **GERENTE DE UNIDADE** - pode aprovar usuários e alunos
   - ✅ **RECEPCIONISTA** - pode aprovar usuários e alunos
   - ✅ **MASTER** - já tinha todas as permissões

## 🚀 Como Aplicar

### 1️⃣ Execute o Script SQL no Banco de Dados

```bash
# Via psql
psql -h localhost -U postgres -d teamcruz -f backend/add-permissoes-aprovacao.sql

# OU via DataGrip/pgAdmin
# Abra o arquivo backend/add-permissoes-aprovacao.sql e execute
```

### 2️⃣ Reinicie o Backend

```bash
cd backend
npm run start:dev
```

### 3️⃣ Teste os Endpoints

#### a) Listar usuários pendentes de aprovação

```bash
GET /usuarios/pendentes/list
Headers: Authorization: Bearer {token_franqueado_ou_gerente}
```

#### b) Aprovar usuário

```bash
PATCH /usuarios/{usuario_id}/aprovar
Headers: Authorization: Bearer {token_franqueado_ou_gerente}
```

#### c) Aprovar aluno

```bash
PATCH /alunos/{aluno_id}/approve
Headers: Authorization: Bearer {token_franqueado_ou_gerente}
```

## 🔐 Permissões por Perfil

| Perfil          | usuarios:aprovar | alunos:aprovar |
| --------------- | ---------------- | -------------- |
| MASTER          | ✅               | ✅             |
| FRANQUEADO      | ✅               | ✅             |
| GERENTE_UNIDADE | ✅               | ✅             |
| RECEPCIONISTA   | ✅               | ✅             |
| PROFESSOR       |                  |                |
| INSTRUTOR       |                  |                |
| ALUNO           |                  |                |

## 📝 Endpoints Protegidos

### 1. Usuários Controller

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('usuarios:aprovar')
@Get('pendentes/list')
getPendentes(@Request() req) { ... }

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('usuarios:aprovar')
@Patch(':id/aprovar')
aprovar(@Param('id') id: string) { ... }
```

### 2. Alunos Controller

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('alunos:aprovar')
@Patch(':id/approve')
approve(@Param('id') id: string) { ... }
```

## ⚠️ Importante

- **PROFESSOR** e **INSTRUTOR** NÃO podem aprovar cadastros (apenas visualizar seus alunos)
- **ALUNO** não tem acesso a esses endpoints
- Todos os usuários que tentarem acessar sem a permissão receberão **403 Forbidden**

## 🧪 Testes Recomendados

1. **Login com Franqueado** → Listar pendentes → Aprovar usuário/aluno ✅
2. **Login com Gerente** → Listar pendentes → Aprovar usuário/aluno ✅
3. **Login com Recepcionista** → Listar pendentes → Aprovar usuário/aluno ✅
4. **Login com Professor** → Tentar aprovar → Deve receber 403
5. **Login com Aluno** → Tentar aprovar → Deve receber 403

## 🎯 Frontend

No frontend, você precisará:

1. **Verificar permissões do usuário logado**
2. **Mostrar/ocultar botões de aprovação** baseado nas permissões
3. **Chamar os endpoints corretos** quando aprovação for solicitada

Exemplo:

```typescript
// Verificar se usuário pode aprovar
const canApprove = user.permissions?.includes("usuarios:aprovar");

// Mostrar botão apenas se tiver permissão
{
  canApprove && (
    <button onClick={() => aprovarUsuario(userId)}>Aprovar Cadastro</button>
  );
}
```

## ✅ Status

- ✅ Backend atualizado com guards e permissões
- ✅ Script SQL criado para adicionar permissões
- ✅ Documentação completa
- ⏳ Aguardando execução do script SQL no banco
- ⏳ Frontend precisa ser atualizado para mostrar/ocultar botões

---

**Última atualização:** 20 de Outubro de 2025
