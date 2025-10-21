# Problema: Usuário Pendente Não Aparece na Tela de Aprovação

**Data**: 18 de outubro de 2025
**Rota**: `/admin/usuarios-pendentes`
**Sintoma**: Contador mostra "1 Pendente" mas lista aparece vazia

## 🔍 Diagnóstico

### Como o Sistema Funciona

1. **Cadastro de Usuário Especial**:

   - Quando você cria um usuário com perfil `instrutor`, `professor`, `gerente_unidade`, `franqueado` ou `master`
   - O sistema **automaticamente** define `ativo: false`
   - Isso está correto no código (`auth.service.ts` linha 508)

2. **Endpoint de Listagem**:
   - Frontend chama: `GET /usuarios/pendentes/list`
   - Backend (`usuarios.service.ts` linha 317): busca usuários com `ativo: false`
   - Para cada usuário, tenta buscar dados em `alunos` ou `professores`

### ✅ O Que Está Correto

- ✅ Backend cria usuário com `ativo: false` para perfis que requerem aprovação
- ✅ Endpoint `/usuarios/pendentes/list` existe e funciona
- ✅ Frontend está fazendo a query correta

### ❌ Possíveis Causas do Problema

#### 1. **Usuário Não Completou Cadastro**

O usuário pode ter criado a conta mas não preencheu os dados pessoais (CPF, dados de professor/aluno, etc.). Neste caso:

- Usuário existe na tabela `usuarios` com `ativo: false`
- MAS não existe registro em `alunos` ou `professores`
- Frontend pode não estar renderizando usuários sem dados completos

#### 2. **Erro no Frontend**

A página pode estar filtrando ou escondendo usuários que não têm:

- `cadastro_completo: true`
- Dados de unidade
- Dados pessoais completos

#### 3. **Cache ou Estado do Frontend**

O React Query pode estar usando dados em cache desatualizados

## 🔧 Soluções

### Solução 1: Verificar Estado no Banco (RECOMENDADO)

Execute o script SQL que criei:

```bash
# Conecte ao banco e execute:
c:\Users\Lenovo\Documents\project\rykon-check-belt\backend\verificar-usuarios-pendentes.sql
```

Este script vai mostrar:

- ✅ Todos os usuários pendentes
- ✅ Se eles têm dados em `alunos` ou `professores`
- ✅ Se eles têm unidade vinculada
- ✅ Quais perfis estão atribuídos

### Solução 2: Aprovar Manualmente (TEMPORÁRIO)

Se você precisa aprovar o usuário agora, execute:

```sql
-- Aprovar usuário específico
UPDATE teamcruz.usuarios
SET ativo = true,
    updated_at = NOW()
WHERE email = 'SEU_EMAIL_AQUI@example.com';
```

### Solução 3: Completar Cadastro do Usuário

Se o usuário não completou o cadastro, você tem 2 opções:

**Opção A: Frontend - Complete Profile**

1. Faça login com o usuário pendente
2. Acesse `/complete-profile`
3. Preencha todos os dados
4. Isso criará o registro em `professores` ou `alunos`

**Opção B: Backend - Criar Registro Manualmente**

Para **Professor**:

```sql
-- Inserir professor manualmente
INSERT INTO teamcruz.professores (
    id,
    usuario_id,
    tipo_cadastro,
    nome_completo,
    cpf,
    faixa_ministrante,
    status,
    created_at,
    updated_at
)
SELECT
    uuid_generate_v4(),
    u.id,
    'PROFESSOR',
    u.nome,
    u.cpf,
    'AZUL', -- ou outra faixa
    'ATIVO',
    NOW(),
    NOW()
FROM teamcruz.usuarios u
WHERE u.email = 'professor@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM teamcruz.professores WHERE usuario_id = u.id
  );
```

Para **Gerente de Unidade**:

```sql
-- Gerente não precisa de registro em professores
-- Apenas vincule à unidade:
UPDATE teamcruz.unidades
SET
    responsavel_cpf = (SELECT cpf FROM teamcruz.usuarios WHERE email = 'gerente@example.com'),
    responsavel_nome = (SELECT nome FROM teamcruz.usuarios WHERE email = 'gerente@example.com'),
    responsavel_papel = 'GERENTE'
WHERE cnpj = 'CNPJ_DA_UNIDADE';
```

### Solução 4: Modificar Frontend para Mostrar Todos

Se você quer que a tela mostre usuários pendentes **mesmo sem dados completos**, modifique o frontend:

**Arquivo**: `frontend/app/admin/usuarios-pendentes/page.tsx`

Linha ~90, no mapeamento dos usuários:

```typescript
// Sempre retornar usuário, mesmo sem unidade
const usuariosComUnidade = await Promise.all(
  usuarios.map(async (usuario) => {
    // ... buscar dados ...
    return {
      ...usuario,
      unidade: unidade || { id: null, nome: "Sem unidade", tipo: "PENDENTE" },
    };
  })
);
```

## 🧪 Como Testar

### Teste 1: Verificar Backend

```bash
# Execute no terminal
curl -X GET http://localhost:3001/usuarios/pendentes/list \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

Deve retornar array com os usuários pendentes.

### Teste 2: Verificar Frontend

Abra o DevTools do navegador:

1. Vá para **Console**
2. Execute:

```javascript
// Ver dados da query
localStorage.getItem("token");

// Fazer request manual
fetch("http://localhost:3001/usuarios/pendentes/list", {
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
})
  .then((r) => r.json())
  .then((data) => console.log("Usuários pendentes:", data));
```

### Teste 3: Limpar Cache

```javascript
// No DevTools Console:
queryClient.invalidateQueries({ queryKey: ["usuarios-pendentes"] });
```

## 📋 Checklist de Debug

Execute passo a passo:

1. [ ] Execute o script `verificar-usuarios-pendentes.sql`
2. [ ] Verifique se usuário tem `ativo: false` ✓
3. [ ] Verifique se usuário tem perfil correto ✓
4. [ ] Verifique se usuário tem dados em `professores` ou `alunos` ❓
5. [ ] Verifique se backend retorna o usuário na API ❓
6. [ ] Verifique console do navegador por erros ❓
7. [ ] Limpe cache do React Query ❓

## 🎯 Fluxo Correto

### Para Professor/Instrutor:

1. ✅ Cadastro → Cria usuário com `ativo: false`
2. ✅ Aguarda aprovação do admin
3. ⏳ **Admin aprova** → `ativo: true`
4. ✅ Usuário faz login
5. ✅ Completa perfil → Cria registro em `professores`
6. ✅ Sistema funciona normalmente

### Para Gerente de Unidade:

1. ✅ Cadastro → Cria usuário com `ativo: false`
2. ✅ Aguarda aprovação do admin
3. ⏳ **Admin aprova** → `ativo: true`
4. ⏳ **Admin vincula à unidade** (ver script `vincular-gerente-unidade.sql`)
5. ✅ Usuário faz login
6. ✅ Dashboard aparece automaticamente

## 📝 Próximos Passos

1. **Execute o script de verificação** para ver o estado atual
2. **Me informe o resultado** para eu ajudar com a solução específica
3. Se necessário, posso criar um fix no frontend ou backend

---

**Arquivos Relacionados:**

- ✅ `backend/verificar-usuarios-pendentes.sql` (diagnóstico)
- ✅ `backend/vincular-gerente-unidade.sql` (para gerentes)
- ✅ `frontend/app/admin/usuarios-pendentes/page.tsx` (tela de aprovação)
- ✅ `backend/src/auth/auth.service.ts` (lógica de registro)
- ✅ `backend/src/usuarios/services/usuarios.service.ts` (query de pendentes)
