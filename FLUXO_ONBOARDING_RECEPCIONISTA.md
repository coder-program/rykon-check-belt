# Fluxo de Onboarding para Recepcionistas

## 📋 Visão Geral

Sistema completo de cadastro e aprovação de recepcionistas com seleção de unidades de trabalho.

---

## 🔄 Fluxo Completo

### 1️⃣ **Admin/Master Cria Usuário**

**Tela**: `http://localhost:3000/usuarios`

1. Admin clica em **"➕ Novo Usuário"**
2. Preenche dados básicos:
   - Nome
   - Email
   - Username
   - Senha inicial
3. **Seleciona perfil**: ✅ `recepcionista`
4. **NÃO marca** "Cadastro Completo" (deixar desmarcado)
5. **Salvar**

**Resultado**: Usuário criado com `cadastro_completo = false`

---

### 2️⃣ **Recepcionista Faz Primeiro Login**

**Tela**: `http://localhost:3000/login`

1. Recepcionista entra com credenciais
2. Sistema detecta: `perfil = recepcionista` + `cadastro_completo = false`
3. **Redirecionamento automático** para: `/onboarding/recepcionista`

---

### 3️⃣ **Tela de Onboarding - Etapa 1: Dados Pessoais**

**Tela**: `http://localhost:3000/onboarding/recepcionista`

**Campos a preencher:**

- ✅ Nome Completo (pré-preenchido se já tiver)
- ✅ CPF
- ✅ Telefone
- ✅ Email

**Validações:**

- Todos os campos são obrigatórios
- Email válido
- CPF com máscara

**Botão**: **"Próxima Etapa ➡️"**

---

### 4️⃣ **Tela de Onboarding - Etapa 2: Unidades de Trabalho**

**Interface:**

```
┌─────────────────────────────────────────────────────┐
│ 🏢 Etapa 2: Unidades de Trabalho                    │
│ Selecione as unidades onde você irá trabalhar       │
├─────────────────────────────────────────────────────┤
│                                                      │
│ [+ Adicionar Unidade]                               │
│                                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Unidade 1                          [Remover]    │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ Unidade*:     [▼ TeamCruz Matriz - 12.345.678] │ │
│ │ Cargo:        [Recepcionista                  ] │ │
│ │ Turno:        [▼ Integral]                      │ │
│ │ Horário:      [08:00] - [18:00]                │ │
│ │ Dias: [✓]SEG [✓]TER [✓]QUA [✓]QUI [✓]SEX [ ]SAB│ │
│ │ Obs:          [____________________________]    │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ [+ Adicionar Outra Unidade]                         │
│                                                      │
│ [Voltar]                  [✓ Finalizar Cadastro]    │
└─────────────────────────────────────────────────────┘
```

**Pode adicionar múltiplas unidades:**

- Matriz (Manhã: 8h-12h, Seg-Sex)
- Filial (Tarde: 14h-18h, Seg-Sex)
- Shopping (Sábado: 9h-13h)

**Validações:**

- Mínimo 1 unidade
- Todos os vínculos devem ter unidade selecionada
- Horários válidos

**Botão**: **"✓ Finalizar Cadastro"**

---

### 5️⃣ **Processamento do Cadastro**

Quando clica em "Finalizar Cadastro":

1. **Atualiza dados do usuário** (`PUT /usuarios/:id`):

   ```json
   {
     "nome": "Maria Silva",
     "cpf": "12345678900",
     "telefone": "11999999999",
     "email": "maria@teamcruz.com",
     "cadastro_completo": true  ← MARCA COMO COMPLETO
   }
   ```

2. **Cria vínculos com unidades** (`POST /recepcionista-unidades`):

   ```json
   [
     {
       "usuario_id": "uuid-do-recepcionista",
       "unidade_id": "uuid-da-matriz",
       "cargo": "Recepcionista",
       "turno": "MANHA",
       "horario_entrada": "08:00",
       "horario_saida": "12:00",
       "dias_semana": ["SEG", "TER", "QUA", "QUI", "SEX"],
       "ativo": true
     },
     {
       "usuario_id": "uuid-do-recepcionista",
       "unidade_id": "uuid-da-filial",
       "cargo": "Recepcionista",
       "turno": "TARDE",
       "horario_entrada": "14:00",
       "horario_saida": "18:00",
       "dias_semana": ["SEG", "TER", "QUA", "QUI", "SEX"],
       "ativo": true
     }
   ]
   ```

3. **Toast de sucesso**: ✅ "Cadastro concluído com sucesso!"

4. **Redirecionamento automático**: `/dashboard`

---

### 6️⃣ **Dashboard do Recepcionista**

Agora o recepcionista tem acesso completo:

- ✅ Vê dados de **todas as unidades vinculadas**
- ✅ Lista de alunos das unidades
- ✅ Pode fazer check-in manual
- ✅ Pode cadastrar novos alunos
- ✅ Estatísticas agregadas

---

## 🎯 Validações e Regras

### No Dashboard:

```typescript
// app/dashboard/page.tsx
useEffect(() => {
  if (user && hasPerfil("recepcionista") && !user.cadastro_completo) {
    router.push("/onboarding/recepcionista");
  }
}, [user, router]);
```

**Comportamento:**

- ✅ Recepcionista com `cadastro_completo = true` → Dashboard normal
- ❌ Recepcionista com `cadastro_completo = false` → Redireciona para onboarding
- ✅ Outros perfis → Não são afetados

### No Onboarding:

- ✅ Só recepcionistas podem acessar
- ✅ Bloqueia acesso se já completou cadastro
- ✅ Salva progresso em etapas
- ✅ Valida campos obrigatórios

---

## 📊 Exemplo Completo

### Cenário: Criar recepcionista "Maria Silva"

#### Passo 1: Admin cria usuário

```sql
-- Usuário já existe (criado pelo admin via interface)
SELECT * FROM teamcruz.usuarios WHERE email = 'maria@teamcruz.com';
-- cadastro_completo = false
```

#### Passo 2: Maria faz login

```
Login: maria@teamcruz.com
Senha: senha123
→ Redirecionamento automático para /onboarding/recepcionista
```

#### Passo 3: Maria preenche dados

**Etapa 1:**

- Nome: Maria Silva
- CPF: 123.456.789-00
- Telefone: (11) 99999-9999
- Email: maria@teamcruz.com

**Etapa 2:**

**Unidade 1:**

- Unidade: TeamCruz Matriz
- Cargo: Recepcionista
- Turno: Manhã
- Horário: 08:00 - 12:00
- Dias: SEG, TER, QUA, QUI, SEX

**Unidade 2:**

- Unidade: TeamCruz Filial
- Cargo: Recepcionista
- Turno: Tarde
- Horário: 14:00 - 18:00
- Dias: SEG, TER, QUA, QUI, SEX

**Clica**: Finalizar Cadastro

#### Passo 4: Sistema processa

```sql
-- Atualiza usuário
UPDATE teamcruz.usuarios
SET nome = 'Maria Silva',
    cpf = '12345678900',
    telefone = '11999999999',
    cadastro_completo = true  ← IMPORTANTE
WHERE email = 'maria@teamcruz.com';

-- Cria vínculos
INSERT INTO teamcruz.recepcionista_unidades
(usuario_id, unidade_id, cargo, turno, horario_entrada, horario_saida, dias_semana, ativo)
VALUES
((SELECT id FROM teamcruz.usuarios WHERE email = 'maria@teamcruz.com'),
 (SELECT id FROM teamcruz.unidades WHERE nome = 'TeamCruz Matriz'),
 'Recepcionista', 'MANHA', '08:00', '12:00', ARRAY['SEG','TER','QUA','QUI','SEX'], true),

((SELECT id FROM teamcruz.usuarios WHERE email = 'maria@teamcruz.com'),
 (SELECT id FROM teamcruz.unidades WHERE nome = 'TeamCruz Filial'),
 'Recepcionista', 'TARDE', '14:00', '18:00', ARRAY['SEG','TER','QUA','QUI','SEX'], true);
```

#### Passo 5: Maria acessa dashboard

```
✅ Dashboard carrega normalmente
✅ Vê alunos de Matriz + Filial
✅ Pode fazer check-in em ambas unidades
```

---

## 🔍 Verificações SQL

### Ver status do cadastro:

```sql
SELECT
    u.id,
    u.nome,
    u.email,
    u.cadastro_completo,
    p.nome as perfil,
    COUNT(ru.id) as total_unidades_vinculadas
FROM teamcruz.usuarios u
INNER JOIN teamcruz.usuario_perfis up ON up.usuario_id = u.id
INNER JOIN teamcruz.perfis p ON p.id = up.perfil_id
LEFT JOIN teamcruz.recepcionista_unidades ru ON ru.usuario_id = u.id AND ru.ativo = true
WHERE p.nome = 'recepcionista'
GROUP BY u.id, u.nome, u.email, u.cadastro_completo, p.nome
ORDER BY u.cadastro_completo, u.nome;
```

### Ver recepcionistas pendentes:

```sql
SELECT
    u.nome,
    u.email,
    u.cadastro_completo,
    u.created_at as criado_em
FROM teamcruz.usuarios u
INNER JOIN teamcruz.usuario_perfis up ON up.usuario_id = u.id
INNER JOIN teamcruz.perfis p ON p.id = up.perfil_id
WHERE p.nome = 'recepcionista'
  AND u.cadastro_completo = false
ORDER BY u.created_at DESC;
```

### Ver vínculos de um recepcionista:

```sql
SELECT
    u.nome as recepcionista,
    un.nome as unidade,
    ru.cargo,
    ru.turno,
    ru.horario_entrada || ' - ' || ru.horario_saida as horario,
    array_to_string(ru.dias_semana, ', ') as dias
FROM teamcruz.usuarios u
INNER JOIN teamcruz.recepcionista_unidades ru ON ru.usuario_id = u.id
INNER JOIN teamcruz.unidades un ON un.id = ru.unidade_id
WHERE u.email = 'maria@teamcruz.com'
  AND ru.ativo = true;
```

---

## ✅ Checklist de Implementação

### Backend:

- ✅ Tabela `recepcionista_unidades` criada
- ✅ Entidade TypeORM
- ✅ Service e Controller
- ✅ Endpoints REST
- ✅ Filtros de dados atualizados

### Frontend:

- ✅ Componente `RecepcionistaOnboarding.tsx`
- ✅ Página `/onboarding/recepcionista`
- ✅ Redirecionamento no dashboard
- ✅ Validação de cadastro completo
- ✅ Progress bar (2 etapas)
- ✅ Interface de múltiplas unidades

### Funcionalidades:

- ✅ Formulário em 2 etapas
- ✅ Dados pessoais obrigatórios
- ✅ Seleção de múltiplas unidades
- ✅ Configuração de turnos e horários
- ✅ Dias da semana
- ✅ Validações frontend
- ✅ Atualização de `cadastro_completo`
- ✅ Criação de vínculos
- ✅ Toast de sucesso/erro
- ✅ Redirecionamento automático

---

## 🚀 Como Testar

### 1. Criar usuário recepcionista

```bash
# Via interface: http://localhost:3000/usuarios
# Ou via SQL:
INSERT INTO teamcruz.usuarios (username, email, password_hash, nome, ativo, cadastro_completo)
VALUES ('teste.recep', 'teste@recep.com', '$2b$10$...', 'Teste Recepcionista', true, false);

INSERT INTO teamcruz.usuario_perfis (usuario_id, perfil_id)
SELECT u.id, p.id
FROM teamcruz.usuarios u, teamcruz.perfis p
WHERE u.email = 'teste@recep.com' AND p.nome = 'recepcionista';
```

### 2. Fazer login

```
http://localhost:3000/login
Email: teste@recep.com
Senha: (senha definida)
```

### 3. Verificar redirecionamento

- ✅ Deve ir para `/onboarding/recepcionista`
- ✅ Não deve carregar dashboard normal

### 4. Completar cadastro

- Etapa 1: Preencher dados pessoais
- Etapa 2: Adicionar pelo menos 1 unidade
- Clicar em "Finalizar Cadastro"

### 5. Verificar sucesso

- ✅ Toast: "Cadastro concluído com sucesso!"
- ✅ Redirecionamento para `/dashboard`
- ✅ Dashboard carrega normalmente
- ✅ Vê dados das unidades selecionadas

### 6. Verificar no banco

```sql
-- Usuário deve ter cadastro_completo = true
SELECT cadastro_completo FROM teamcruz.usuarios WHERE email = 'teste@recep.com';

-- Deve ter vínculos criados
SELECT * FROM teamcruz.recepcionista_unidades WHERE usuario_id = (
  SELECT id FROM teamcruz.usuarios WHERE email = 'teste@recep.com'
);
```

---

## 🎯 Resumo

| Etapa                  | Responsável   | Tela                        | Resultado                   |
| ---------------------- | ------------- | --------------------------- | --------------------------- |
| 1. Criar usuário       | Admin         | `/usuarios`                 | `cadastro_completo = false` |
| 2. Primeiro login      | Recepcionista | `/login`                    | Redirecionamento automático |
| 3. Preencher dados     | Recepcionista | `/onboarding/recepcionista` | Dados pessoais salvos       |
| 4. Selecionar unidades | Recepcionista | `/onboarding/recepcionista` | Vínculos criados            |
| 5. Finalizar           | Sistema       | Automático                  | `cadastro_completo = true`  |
| 6. Usar sistema        | Recepcionista | `/dashboard`                | Acesso completo             |

**Tudo funcionando perfeitamente! 🎉**
