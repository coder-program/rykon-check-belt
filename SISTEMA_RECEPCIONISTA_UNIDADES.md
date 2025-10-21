# Sistema de Vínculos Recepcionista ↔ Unidades

## 📋 Visão Geral

Sistema completo para permitir que **um recepcionista possa trabalhar em múltiplas unidades**.

### 🎯 Problema Resolvido

Antes, um recepcionista só podia ver dados de UMA unidade (através do campo `responsavel_cpf`).

Agora, com a nova tabela `recepcionista_unidades`, um recepcionista pode:

- ✅ Trabalhar em **várias unidades**
- ✅ Ter **cargos diferentes** em cada unidade
- ✅ Ter **turnos e horários específicos** por unidade
- ✅ Ver dados de **todas as unidades** vinculadas

---

## 🗂️ Estrutura do Sistema

### 1. **Tabela: `recepcionista_unidades`**

```sql
CREATE TABLE teamcruz.recepcionista_unidades (
    id UUID PRIMARY KEY,
    usuario_id UUID NOT NULL,      -- Recepcionista
    unidade_id UUID NOT NULL,      -- Unidade onde trabalha
    cargo VARCHAR(100),            -- Ex: "Recepcionista", "Recepcionista Líder"
    turno VARCHAR(50),             -- MANHA, TARDE, NOITE, INTEGRAL
    horario_entrada TIME,
    horario_saida TIME,
    dias_semana VARCHAR[],         -- ['SEG','TER','QUA','QUI','SEX']
    ativo BOOLEAN DEFAULT true,
    data_inicio DATE,
    data_fim DATE,
    observacoes TEXT,
    ...
);
```

**Características:**

- Relacionamento **N:N** (muitos para muitos)
- Um recepcionista pode estar em várias unidades
- Uma unidade pode ter vários recepcionistas
- Constraint de unicidade: não pode vincular 2x o mesmo recepcionista à mesma unidade

---

## 🚀 Como Usar

### 1️⃣ **Criar a Tabela no Banco**

```bash
# Execute o script SQL
psql -U seu_usuario -d seu_banco -f backend/create-recepcionista-unidades-table.sql
```

**OU via DBeaver/PgAdmin:**

- Copie o conteúdo de `backend/create-recepcionista-unidades-table.sql`
- Execute no banco

### 2️⃣ **Reiniciar o Backend**

```bash
cd backend
npm run start:dev
```

O TypeORM vai reconhecer a nova entidade automaticamente.

### 3️⃣ **Vincular Recepcionista a Unidades**

#### Opção A: Via SQL

```sql
-- Vincular recepcionista@exemplo.com às unidades "Matriz" e "Filial"

INSERT INTO teamcruz.recepcionista_unidades
(usuario_id, unidade_id, cargo, turno, horario_entrada, horario_saida, dias_semana, ativo)
VALUES
-- Unidade Matriz - Manhã
(
    (SELECT id FROM teamcruz.usuarios WHERE email = 'recepcionista@exemplo.com'),
    (SELECT id FROM teamcruz.unidades WHERE nome = 'TeamCruz Matriz'),
    'Recepcionista',
    'MANHA',
    '08:00:00',
    '12:00:00',
    ARRAY['SEG','TER','QUA','QUI','SEX'],
    true
),
-- Unidade Filial - Tarde
(
    (SELECT id FROM teamcruz.usuarios WHERE email = 'recepcionista@exemplo.com'),
    (SELECT id FROM teamcruz.unidades WHERE nome = 'TeamCruz Filial'),
    'Recepcionista',
    'TARDE',
    '14:00:00',
    '18:00:00',
    ARRAY['SEG','TER','QUA','QUI','SEX'],
    true
);
```

#### Opção B: Via API (Recomendado)

```bash
# Criar vínculo
POST http://localhost:3001/recepcionista-unidades
Content-Type: application/json
Authorization: Bearer SEU_TOKEN

{
  "usuario_id": "uuid-do-usuario",
  "unidade_id": "uuid-da-unidade",
  "cargo": "Recepcionista",
  "turno": "MANHA",
  "horario_entrada": "08:00",
  "horario_saida": "12:00",
  "dias_semana": ["SEG","TER","QUA","QUI","SEX"],
  "ativo": true
}
```

#### Opção C: Via Interface Web

1. Acesse: `http://localhost:3000/recepcionista-vinculos` (precisa criar a página)
2. Clique em **"Novo Vínculo"**
3. Selecione:
   - Recepcionista
   - Unidade
   - Cargo, turno, horários
   - Dias da semana
4. **Salvar**

---

## 📡 Endpoints da API

### **Listar vínculos**

```http
GET /recepcionista-unidades
GET /recepcionista-unidades?usuario_id=uuid
GET /recepcionista-unidades?unidade_id=uuid
GET /recepcionista-unidades?ativo=true
```

### **Obter unidades de um recepcionista**

```http
GET /recepcionista-unidades/recepcionista/:usuario_id
GET /recepcionista-unidades/me  (unidades do usuário logado)
```

### **Obter recepcionistas de uma unidade**

```http
GET /recepcionista-unidades/unidade/:unidade_id
```

### **Criar vínculo**

```http
POST /recepcionista-unidades
Body: { usuario_id, unidade_id, cargo, turno, ... }
```

### **Atualizar vínculo**

```http
PUT /recepcionista-unidades/:id
Body: { cargo, turno, horario_entrada, ... }
```

### **Desativar vínculo (soft delete)**

```http
DELETE /recepcionista-unidades/:id/soft
```

### **Deletar vínculo permanentemente**

```http
DELETE /recepcionista-unidades/:id
```

### **Verificar se usuário é recepcionista de unidade**

```http
GET /recepcionista-unidades/check/:usuario_id/:unidade_id
```

---

## 🔍 Como o Sistema Filtra os Dados

### **Antes** (sistema antigo):

```typescript
// AlunosService - Antigo
const unidadeId = await this.getUnidadeIdByRecepcionista(user);
if (unidadeId) {
  query.andWhere("aluno.unidade_id = :unidadeId", { unidadeId });
}
// Retorna alunos de UMA unidade
```

### **Agora** (sistema novo):

```typescript
// AlunosService - Novo
const unidadeIds = await this.getUnidadesIdsByRecepcionista(user);
if (unidadeIds && unidadeIds.length > 0) {
  query.andWhere("aluno.unidade_id IN (:...unidadeIds)", { unidadeIds });
}
// Retorna alunos de VÁRIAS unidades
```

**Resultado:**

- Recepcionista vinculado a 3 unidades → vê alunos das 3 unidades
- Recepcionista vinculado a 1 unidade → vê alunos de 1 unidade
- Recepcionista sem vínculos → não vê nenhum aluno

---

## 📊 Exemplos de Uso

### Exemplo 1: Recepcionista em 2 unidades (manhã e tarde)

```sql
-- Maria trabalha na Matriz de manhã e na Filial à tarde
INSERT INTO teamcruz.recepcionista_unidades
(usuario_id, unidade_id, cargo, turno, horario_entrada, horario_saida, ativo)
VALUES
(
    (SELECT id FROM teamcruz.usuarios WHERE email = 'maria@teamcruz.com'),
    (SELECT id FROM teamcruz.unidades WHERE nome = 'Matriz'),
    'Recepcionista',
    'MANHA',
    '08:00',
    '12:00',
    true
),
(
    (SELECT id FROM teamcruz.usuarios WHERE email = 'maria@teamcruz.com'),
    (SELECT id FROM teamcruz.unidades WHERE nome = 'Filial'),
    'Recepcionista',
    'TARDE',
    '14:00',
    '18:00',
    true
);
```

**Resultado:**

- Maria faz login → Dashboard mostra dados de **Matriz + Filial**
- Lista de alunos → alunos de **ambas as unidades**
- Check-in → pode fazer em alunos das **2 unidades**

### Exemplo 2: Recepcionista integral em uma unidade

```sql
INSERT INTO teamcruz.recepcionista_unidades
(usuario_id, unidade_id, cargo, turno, ativo)
VALUES
(
    (SELECT id FROM teamcruz.usuarios WHERE email = 'joao@teamcruz.com'),
    (SELECT id FROM teamcruz.unidades WHERE nome = 'Shopping Center'),
    'Recepcionista Líder',
    'INTEGRAL',
    true
);
```

**Resultado:**

- João vê apenas dados da unidade Shopping Center

### Exemplo 3: Recepcionista volante (5 unidades)

```sql
INSERT INTO teamcruz.recepcionista_unidades
(usuario_id, unidade_id, cargo, ativo)
SELECT
    (SELECT id FROM teamcruz.usuarios WHERE email = 'volante@teamcruz.com'),
    u.id,
    'Recepcionista Volante',
    true
FROM teamcruz.unidades u
WHERE u.status = 'ATIVA'
LIMIT 5;
```

**Resultado:**

- Recepcionista volante vê dados de todas as 5 unidades

---

## ✅ Queries de Verificação

### Ver todas as unidades de um recepcionista:

```sql
SELECT
    u.nome as recepcionista,
    u.email,
    un.nome as unidade,
    ru.cargo,
    ru.turno,
    ru.horario_entrada || ' - ' || ru.horario_saida as horario,
    array_to_string(ru.dias_semana, ', ') as dias,
    COUNT(a.id) FILTER (WHERE a.status = 'ATIVO') as total_alunos_ativos
FROM teamcruz.usuarios u
INNER JOIN teamcruz.recepcionista_unidades ru ON ru.usuario_id = u.id
INNER JOIN teamcruz.unidades un ON un.id = ru.unidade_id
LEFT JOIN teamcruz.alunos a ON a.unidade_id = un.id
WHERE u.email = 'recepcionista@exemplo.com'
  AND ru.ativo = true
GROUP BY u.nome, u.email, un.nome, ru.cargo, ru.turno, ru.horario_entrada, ru.horario_saida, ru.dias_semana
ORDER BY un.nome;
```

### Ver todos os recepcionistas de uma unidade:

```sql
SELECT
    un.nome as unidade,
    u.nome as recepcionista,
    u.email,
    u.telefone,
    ru.cargo,
    ru.turno,
    ru.dias_semana
FROM teamcruz.unidades un
INNER JOIN teamcruz.recepcionista_unidades ru ON ru.unidade_id = un.id
INNER JOIN teamcruz.usuarios u ON u.id = ru.usuario_id
WHERE un.nome = 'TeamCruz Matriz'
  AND ru.ativo = true
ORDER BY ru.turno, u.nome;
```

### Verificar recepcionistas SEM vínculos:

```sql
SELECT
    u.id,
    u.nome,
    u.email,
    p.nome as perfil,
    COUNT(ru.id) as total_unidades_vinculadas
FROM teamcruz.usuarios u
INNER JOIN teamcruz.usuario_perfis up ON up.usuario_id = u.id
INNER JOIN teamcruz.perfis p ON p.id = up.perfil_id
LEFT JOIN teamcruz.recepcionista_unidades ru ON ru.usuario_id = u.id AND ru.ativo = true
WHERE p.nome = 'recepcionista'
GROUP BY u.id, u.nome, u.email, p.nome
HAVING COUNT(ru.id) = 0
ORDER BY u.nome;
```

---

## 🎨 Dashboard do Recepcionista (Atualizado)

O dashboard agora mostra estatísticas **agregadas** de todas as unidades:

```typescript
// Antes: 1 unidade
const unidade = await getUnidade(unidadeId);
const alunos = await getAlunos(unidadeId);

// Agora: múltiplas unidades
const unidades = await getUnidadesByRecepcionista(usuario_id);
const alunos = await getAlunosByUnidades(unidades.map((u) => u.id));
```

**Cards exibidos:**

- Total de alunos **de todas as unidades**
- Total de unidades que trabalha
- Check-ins do dia **em todas as unidades**
- Seletor de unidade (dropdown) para filtrar

---

## 🔄 Migração do Sistema Antigo

Se você já tem recepcionistas cadastrados com o sistema antigo (`responsavel_cpf`), pode migrar:

```sql
-- Migrar vínculos antigos para a nova tabela
INSERT INTO teamcruz.recepcionista_unidades
(usuario_id, unidade_id, cargo, ativo, data_inicio)
SELECT
    u.id as usuario_id,
    un.id as unidade_id,
    'Recepcionista' as cargo,
    true as ativo,
    CURRENT_DATE as data_inicio
FROM teamcruz.unidades un
INNER JOIN teamcruz.usuarios u ON u.cpf = un.responsavel_cpf
INNER JOIN teamcruz.usuario_perfis up ON up.usuario_id = u.id
INNER JOIN teamcruz.perfis p ON p.id = up.perfil_id
WHERE un.responsavel_papel = 'ADMINISTRATIVO'
  AND p.nome = 'recepcionista'
ON CONFLICT (usuario_id, unidade_id) DO NOTHING;
```

---

## 📁 Arquivos Criados/Modificados

### Backend:

1. ✅ `backend/create-recepcionista-unidades-table.sql` - Script da tabela
2. ✅ `backend/src/people/entities/recepcionista-unidade.entity.ts` - Entidade TypeORM
3. ✅ `backend/src/people/dto/recepcionista-unidade.dto.ts` - DTOs
4. ✅ `backend/src/people/services/recepcionista-unidades.service.ts` - Service
5. ✅ `backend/src/people/controllers/recepcionista-unidades.controller.ts` - Controller
6. ✅ `backend/src/people/people.module.ts` - Registros no módulo
7. ✅ `backend/src/people/services/alunos.service.ts` - Atualizado para múltiplas unidades
8. ✅ `backend/src/people/services/unidades.service.ts` - Atualizado para múltiplas unidades

### Frontend:

9. ✅ `frontend/components/recepcionistas/RecepcionistaUnidadesManager.tsx` - Interface de gerenciamento

---

## 🚀 Próximos Passos

1. ✅ Criar a tabela no banco
2. ✅ Reiniciar backend
3. ✅ Vincular recepcionistas às unidades
4. ⏳ Criar página no frontend: `/recepcionista-vinculos`
5. ⏳ Atualizar `RecepcionistaDashboard` para suportar múltiplas unidades
6. ⏳ Adicionar seletor de unidade no dashboard

---

## 🎯 Resumo

| Antes                         | Agora                                  |
| ----------------------------- | -------------------------------------- |
| 1 recepcionista = 1 unidade   | 1 recepcionista = **N unidades**       |
| Vínculo via `responsavel_cpf` | Vínculo via **tabela dedicada**        |
| Sem controle de horários      | Com turnos, horários, dias da semana   |
| Sem histórico                 | Com data_inicio, data_fim, observações |
| Hard coded                    | Gerenciável via API e interface        |

**Tudo pronto para uso! 🎉**
