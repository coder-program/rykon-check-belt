# 📱 Sistema de Tablet Check-in - Guia de Configuração

## 📋 Tabela de Conteúdo

1. [Criação da Tabela](#1-criação-da-tabela)
2. [Criação do Perfil](#2-criação-do-perfil)
3. [Criação de Usuário Tablet](#3-criação-de-usuário-tablet)
4. [Vinculação à Unidade](#4-vinculação-à-unidade)
5. [Testes](#5-testes)

---

## 1. Criação da Tabela

Execute o script SQL para criar a tabela `tablet_unidades`:

```sql
-- Criar tabela tablet_unidades
CREATE TABLE IF NOT EXISTS teamcruz.tablet_unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tablet_id UUID NOT NULL,
  unidade_id UUID NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_tablet_usuario FOREIGN KEY (tablet_id)
    REFERENCES teamcruz.usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_tablet_unidade FOREIGN KEY (unidade_id)
    REFERENCES teamcruz.unidades(id) ON DELETE CASCADE,
  CONSTRAINT uq_tablet_unidade UNIQUE (tablet_id, unidade_id)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_tablet_unidades_tablet_id
  ON teamcruz.tablet_unidades(tablet_id);
CREATE INDEX IF NOT EXISTS idx_tablet_unidades_unidade_id
  ON teamcruz.tablet_unidades(unidade_id);
CREATE INDEX IF NOT EXISTS idx_tablet_unidades_ativo
  ON teamcruz.tablet_unidades(ativo);
```

---

## 2. Criação do Perfil

Crie o perfil TABLET_CHECKIN (execute apenas uma vez):

```sql
INSERT INTO teamcruz.perfis (nome, descricao, ativo, created_at, updated_at)
VALUES (
  'TABLET_CHECKIN',
  'Tablet Check-in - Acesso limitado para registro de presença',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (nome) DO NOTHING;
```

---

## 3. Criação de Usuário Tablet

### Passo 1: Criar o usuário

```sql
INSERT INTO teamcruz.usuarios (
  id,
  nome,
  email,
  senha,
  ativo,
  cadastro_completo,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'Tablet Unidade Centro',              -- Nome do tablet
  'tablet.centro@teamcruz.com',          -- Email único
  '$2b$10$YourBcryptHashHere',           -- Senha criptografada com bcrypt
  true,
  true,                                  -- Importante: true para não exigir complete-profile
  NOW(),
  NOW()
)
RETURNING id;  -- ⚠️ IMPORTANTE: Anote o ID retornado!
```

**💡 Como gerar a senha:**

```javascript
// Node.js
const bcrypt = require("bcrypt");
const senha = await bcrypt.hash("senha123", 10);
console.log(senha);
```

### Passo 2: Vincular ao perfil TABLET_CHECKIN

```sql
-- Substitua 'ID_DO_USUARIO_TABLET' pelo ID retornado no Passo 1
INSERT INTO teamcruz.usuario_perfis (usuario_id, perfil_id)
SELECT
  'ID_DO_USUARIO_TABLET',  -- ⚠️ Cole o ID aqui
  id
FROM teamcruz.perfis
WHERE nome = 'TABLET_CHECKIN';
```

---

## 4. Vinculação à Unidade

Vincule o tablet à unidade específica:

```sql
-- Substitua os IDs conforme necessário
INSERT INTO teamcruz.tablet_unidades (
  tablet_id,
  unidade_id,
  ativo,
  created_at,
  updated_at
)
VALUES (
  'ID_DO_USUARIO_TABLET',  -- ID do usuário tablet criado
  'ID_DA_UNIDADE',         -- ID da unidade (ex: Centro, Zona Sul, etc)
  true,
  NOW(),
  NOW()
);
```

### 🔍 Como descobrir o ID da unidade:

```sql
-- Listar todas as unidades
SELECT id, nome, cidade, estado
FROM teamcruz.unidades
ORDER BY nome;
```

---

## 5. Testes

### 5.1 Verificar Criação

```sql
-- Verificar usuário tablet criado
SELECT
  u.id,
  u.nome,
  u.email,
  u.ativo,
  u.cadastro_completo,
  p.nome as perfil
FROM teamcruz.usuarios u
INNER JOIN teamcruz.usuario_perfis up ON up.usuario_id = u.id
INNER JOIN teamcruz.perfis p ON p.id = up.perfil_id
WHERE p.nome = 'TABLET_CHECKIN';

-- Verificar vinculação à unidade
SELECT
  tu.id,
  u.nome as tablet,
  un.nome as unidade,
  tu.ativo
FROM teamcruz.tablet_unidades tu
INNER JOIN teamcruz.usuarios u ON u.id = tu.tablet_id
INNER JOIN teamcruz.unidades un ON un.id = tu.unidade_id
ORDER BY un.nome;
```

### 5.2 Teste de Login

1. Acesse: `http://localhost:3000/login`
2. Email: `tablet.centro@teamcruz.com`
3. Senha: `senha123` (ou a que você definiu)
4. ✅ Deve redirecionar para `/checkin/tablet`
5. ✅ Deve listar apenas alunos da unidade vinculada

---

## 📊 Queries Úteis

### Listar todos os tablets e suas unidades:

```sql
SELECT
  u.nome as "Tablet",
  u.email,
  un.nome as "Unidade",
  tu.ativo as "Ativo",
  tu.created_at as "Criado em"
FROM teamcruz.tablet_unidades tu
INNER JOIN teamcruz.usuarios u ON u.id = tu.tablet_id
INNER JOIN teamcruz.unidades un ON un.id = tu.unidade_id
ORDER BY un.nome, u.nome;
```

### Contar alunos por unidade:

```sql
SELECT
  un.nome as "Unidade",
  COUNT(a.id) as "Total Alunos",
  COUNT(CASE WHEN a.status = 'ATIVO' THEN 1 END) as "Ativos"
FROM teamcruz.unidades un
LEFT JOIN teamcruz.alunos a ON a.unidade_id = un.id
GROUP BY un.id, un.nome
ORDER BY un.nome;
```

### Desativar tablet temporariamente:

```sql
-- Desativar
UPDATE teamcruz.tablet_unidades
SET ativo = false, updated_at = NOW()
WHERE tablet_id = 'ID_DO_TABLET';

-- Reativar
UPDATE teamcruz.tablet_unidades
SET ativo = true, updated_at = NOW()
WHERE tablet_id = 'ID_DO_TABLET';
```

---

## 🔒 Validações de Segurança Implementadas

✅ **Isolamento por Unidade**: Cada tablet vê apenas alunos da sua unidade
✅ **Check-in Restrito**: Não pode fazer check-in de alunos de outras unidades
✅ **Aprovação Filtrada**: Recepcionista/Professor/Gerente só vê presenças da sua unidade
✅ **Acesso Limitado**: Perfil TABLET_CHECKIN só acessa a rota `/checkin/tablet`

---

## 📝 Exemplo Completo

Script completo para criar tablet da "Unidade Centro":

```sql
-- 1. Criar usuário
INSERT INTO teamcruz.usuarios (id, nome, email, senha, ativo, cadastro_completo, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',  -- Exemplo de UUID
  'Tablet Unidade Centro',
  'tablet.centro@teamcruz.com',
  '$2b$10$qT6hZ9K.L2xF3yJ8mN0pReK7vP8wQ9xS2lM4nH6jR5tU0vW1xY2zA',
  true,
  true,
  NOW(),
  NOW()
);

-- 2. Vincular ao perfil
INSERT INTO teamcruz.usuario_perfis (usuario_id, perfil_id)
SELECT
  '550e8400-e29b-41d4-a716-446655440001',
  id
FROM teamcruz.perfis
WHERE nome = 'TABLET_CHECKIN';

-- 3. Vincular à unidade (substitua ID_DA_UNIDADE_CENTRO)
INSERT INTO teamcruz.tablet_unidades (tablet_id, unidade_id, ativo, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'ID_DA_UNIDADE_CENTRO',
  true,
  NOW(),
  NOW()
);
```

---

## 🚨 Troubleshooting

### Problema: "Usuário não vinculado a unidade"

- Verifique se existe registro em `tablet_unidades` com `ativo = true`
- Confira se os IDs estão corretos

### Problema: "Check-in já registrado"

- Normal se já fez check-in hoje na mesma aula
- Sistema previne duplicatas

### Problema: Login volta para tela de login

- Verifique se `cadastro_completo = true` no usuário
- Confirme que o perfil TABLET_CHECKIN está vinculado

---

## 📞 Suporte

Para mais informações, consulte a documentação do projeto ou entre em contato com a equipe de desenvolvimento.
