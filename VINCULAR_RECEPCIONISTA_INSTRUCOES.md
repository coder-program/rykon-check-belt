# Como Vincular Recepcionista à Unidade

## 📋 Problema

Você cadastrou um usuário com perfil **recepcionista**, mas ele não consegue ver os dados da unidade porque não está vinculado a ela.

## ✅ Solução

O recepcionista precisa estar vinculado à unidade através do campo `responsavel_cpf` da tabela `unidades`.

---

## 🎯 Opção 1: Via SQL (Rápido)

### Passo 1: Edite o arquivo SQL

Abra o arquivo: `backend/vincular-recepcionista-unidade.sql`

### Passo 2: Substitua os valores

Encontre estas linhas e substitua com seus dados reais:

```sql
-- PASSO 1: Atribuir perfil (se ainda não tiver)
INSERT INTO teamcruz.usuario_perfis (usuario_id, perfil_id)
SELECT u.id, p.id
FROM teamcruz.usuarios u
CROSS JOIN teamcruz.perfis p
WHERE u.email = 'EMAIL_DO_USUARIO'  -- ← SUBSTITUIR AQUI
  AND p.nome = 'recepcionista'
  AND NOT EXISTS (
    SELECT 1 FROM teamcruz.usuario_perfis up
    WHERE up.usuario_id = u.id AND up.perfil_id = p.id
  );

-- PASSO 2: Vincular à unidade
UPDATE teamcruz.unidades
SET
    responsavel_cpf = (SELECT cpf FROM teamcruz.usuarios WHERE email = 'EMAIL_DO_USUARIO'), -- ← SUBSTITUIR
    responsavel_nome = (SELECT nome FROM teamcruz.usuarios WHERE email = 'EMAIL_DO_USUARIO'), -- ← SUBSTITUIR
    responsavel_papel = 'ADMINISTRATIVO',
    responsavel_contato = (SELECT telefone FROM teamcruz.usuarios WHERE email = 'EMAIL_DO_USUARIO'), -- ← SUBSTITUIR
    updated_at = NOW()
WHERE cnpj = 'CNPJ_DA_UNIDADE'; -- ← SUBSTITUIR (ex: 12.345.678/0001-90)
```

### Passo 3: Execute no banco

```bash
# Conecte ao PostgreSQL
psql -U seu_usuario -d seu_banco

# Execute o script
\i backend/vincular-recepcionista-unidade.sql
```

**OU via DBeaver/PgAdmin:**

- Copie o SQL editado
- Execute no banco de dados

### Passo 4: Verifique

Execute as queries de verificação que estão no final do arquivo:

```sql
-- Ver se recepcionista está vinculado
SELECT
    u.email,
    u.nome as recepcionista,
    un.nome as unidade,
    un.cnpj,
    COUNT(a.id) as total_alunos_ativos
FROM teamcruz.usuarios u
INNER JOIN teamcruz.unidades un ON un.responsavel_cpf = u.cpf
LEFT JOIN teamcruz.alunos a ON a.unidade_id = un.id AND a.status = 'ATIVO'
WHERE u.email = 'EMAIL_DO_RECEPCIONISTA'
GROUP BY u.email, u.nome, un.nome, un.cnpj;
```

---

## 🎯 Opção 2: Via Interface (http://localhost:3000/unidades)

### Passo 1: Acesse a lista de unidades

1. Entre no sistema como **admin** ou **master**
2. Vá para: `http://localhost:3000/unidades`

### Passo 2: Edite a unidade

1. Clique no botão **✏️ Editar** na unidade desejada
2. Role até a seção **"Responsável pela Unidade"**

### Passo 3: Preencha os dados do recepcionista

No formulário de edição da unidade, encontre os campos:

```
┌─────────────────────────────────────────────────┐
│  Responsável pela Unidade                       │
├─────────────────────────────────────────────────┤
│  Nome:            [Nome do Recepcionista]       │
│  CPF:             [CPF do Recepcionista]        │ ← IMPORTANTE!
│  Papel:           [ADMINISTRATIVO]              │ ← Selecione ADMINISTRATIVO
│  Contato:         [(11) 99999-9999]             │
└─────────────────────────────────────────────────┘
```

**IMPORTANTE:**

- O **CPF** deve ser **exatamente o mesmo** que está cadastrado no usuário
- O **Papel** deve ser **"ADMINISTRATIVO"** para recepcionistas
- O **Nome** e **Contato** são informativos

### Passo 4: Salve

Clique em **"Salvar"** ou **"Atualizar"**

---

## 🔍 Como Verificar se Funcionou

### 1. Logout e Login

1. Faça **logout** do sistema
2. Faça **login** com o usuário recepcionista

### 2. Acesse o Dashboard

Vá para: `http://localhost:3000/dashboard`

**Deve aparecer:**

- ✅ RecepcionistaDashboard (específico para recepcionista)
- ✅ Estatísticas da unidade
- ✅ Lista de alunos da unidade
- ✅ Botões de check-in

### 3. Verifique os dados

Acesse: `http://localhost:3000/alunos`

**Deve mostrar:**

- ✅ Apenas alunos da unidade vinculada
- ✅ Botão "Cadastrar Aluno"
- ✅ Filtros funcionando

### 4. Verifique no backend (logs)

Quando o recepcionista listar alunos, o backend deve logar:

```
🔍 [AlunosService.list] INÍCIO
🔍 [AlunosService.list] USER RECEBIDO: SIM
📞 [AlunosService.list] Usuário é RECEPCIONISTA, aplicando filtro...
📞 [AlunosService.list] Unidade ID encontrada: uuid-da-unidade
✅ [AlunosService.list] FILTRO aplicado - alunos apenas da unidade: uuid-da-unidade
```

---

## ❌ Problemas Comuns

### Problema 1: "Recepcionista não vê nenhum aluno"

**Causa:** CPF do usuário diferente do `responsavel_cpf` da unidade

**Solução:**

```sql
-- Verificar CPFs
SELECT
    u.email,
    u.cpf as cpf_usuario,
    un.nome as unidade,
    un.responsavel_cpf as cpf_na_unidade
FROM teamcruz.usuarios u
LEFT JOIN teamcruz.unidades un ON un.responsavel_cpf = u.cpf
WHERE u.email = 'email@recepcionista.com';
```

Se estiverem diferentes, atualize:

```sql
UPDATE teamcruz.unidades
SET responsavel_cpf = 'CPF_CORRETO'
WHERE id = 'UUID_DA_UNIDADE';
```

### Problema 2: "Dashboard genérico aparece"

**Causa:** Perfil recepcionista não atribuído ao usuário

**Solução:**

```sql
-- Atribuir perfil
INSERT INTO teamcruz.usuario_perfis (usuario_id, perfil_id)
SELECT u.id, p.id
FROM teamcruz.usuarios u
CROSS JOIN teamcruz.perfis p
WHERE u.email = 'email@recepcionista.com'
  AND p.nome = 'recepcionista';
```

### Problema 3: "Backend não reiniciou"

**Causa:** Alterações no TypeScript não foram compiladas

**Solução:**

```bash
cd backend
npm run start:dev
```

---

## 📝 Exemplo Completo (SQL)

```sql
-- EXEMPLO REAL:
-- Email: recepcionista@teamcruz.com
-- CPF: 123.456.789-00
-- Unidade: TeamCruz Matriz
-- CNPJ: 12.345.678/0001-90

-- 1. Atribuir perfil
INSERT INTO teamcruz.usuario_perfis (usuario_id, perfil_id)
SELECT u.id, p.id
FROM teamcruz.usuarios u
CROSS JOIN teamcruz.perfis p
WHERE u.email = 'recepcionista@teamcruz.com'
  AND p.nome = 'recepcionista'
  AND NOT EXISTS (
    SELECT 1 FROM teamcruz.usuario_perfis up
    WHERE up.usuario_id = u.id AND up.perfil_id = p.id
  );

-- 2. Vincular à unidade
UPDATE teamcruz.unidades
SET
    responsavel_cpf = '12345678900', -- sem pontos e traços
    responsavel_nome = 'Maria Recepcionista',
    responsavel_papel = 'ADMINISTRATIVO',
    responsavel_contato = '11999999999', -- sem parênteses e traços
    updated_at = NOW()
WHERE cnpj = '12345678000190'; -- sem pontos, barras e traços

-- 3. Verificar
SELECT
    u.email,
    u.nome,
    u.cpf,
    p.nome as perfil,
    un.nome as unidade,
    un.cnpj
FROM teamcruz.usuarios u
INNER JOIN teamcruz.usuario_perfis up ON up.usuario_id = u.id
INNER JOIN teamcruz.perfis p ON p.id = up.perfil_id
LEFT JOIN teamcruz.unidades un ON un.responsavel_cpf = u.cpf
WHERE u.email = 'recepcionista@teamcruz.com';
```

---

## 🎯 Resumo

| Método        | Velocidade | Dificuldade | Recomendado para                           |
| ------------- | ---------- | ----------- | ------------------------------------------ |
| **SQL**       | ⚡ Rápido  | 🔧 Média    | Desenvolvedores, Admin com acesso ao banco |
| **Interface** | 🐌 Normal  | ✅ Fácil    | Usuários admin sem acesso ao banco         |

**Recomendação:** Use o **SQL** se tiver acesso ao banco, é mais rápido e garante que está correto!

---

## 🔄 Após Vincular

1. ✅ Recepcionista faz login
2. ✅ Dashboard específico aparece
3. ✅ Vê apenas dados da sua unidade
4. ✅ Pode fazer check-in manual dos alunos
5. ✅ Pode cadastrar novos alunos na unidade

**Tudo funcionando!** 🎉
