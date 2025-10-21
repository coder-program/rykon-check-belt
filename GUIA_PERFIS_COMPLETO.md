## 📋 Guia Completo de Perfis do Sistema Team Cruz

**Data:** 18 de Outubro de 2025
**Versão:** 2.0

---

## 🎯 Visão Geral

O sistema Team Cruz implementa **11 perfis diferentes** para controlar o acesso de usuários às funcionalidades. Cada perfil tem permissões específicas baseadas em sua função no sistema.

---

## 🔐 Perfis Principais (OBRIGATÓRIOS)

### 1. **MASTER** 👑

- **Nome no DB:** `master`
- **Descrição:** Administrador total do sistema
- **Permissões:** TODAS (32+ permissões)
- **Quem usa:** Equipe técnica e administração central da Team Cruz
- **Acesso:**
  - ✅ Acesso irrestrito a todos os módulos
  - ✅ Criar/editar/excluir qualquer registro
  - ✅ Gerenciar usuários e permissões
  - ✅ Configurações do sistema

**Exemplo de usuário:**

```sql
Username: admin
Email: admin@teamcruz.com
Perfil: master
```

---

### 2. **FRANQUEADO** 🏢

- **Nome no DB:** `franqueado`
- **Descrição:** Proprietário de franquia
- **Permissões:**
  - ✅ **Franquias:** READ (visualiza suas franquias)
  - ✅ **Unidades:** READ, WRITE, DELETE (gerencia suas unidades)
  - ✅ **Alunos:** READ, WRITE (gerencia alunos)
  - ✅ **Professores:** READ, WRITE (gerencia professores)
  - ✅ **Financeiro:** READ, WRITE (controle financeiro)
  - ✅ **Relatórios:** READ (visualiza relatórios)

**Quem usa:** Proprietários que possuem uma ou mais franquias

**Funcionalidades:**

- Criar e gerenciar unidades/academias
- Contratar e gerenciar professores
- Aprovar matrículas de alunos
- Acompanhar financeiro das unidades
- Gerar relatórios consolidados

---

### 3. **GERENTE DE UNIDADE** 🏪

- **Nome no DB:** `gerente_unidade`
- **Descrição:** Gerente de academia/unidade
- **Permissões:**
  - ✅ **Unidades:** READ, WRITE (dados operacionais da unidade)
  - ✅ **Alunos:** READ, WRITE (gerencia alunos da unidade)
  - ✅ **Professores:** READ (visualiza professores)
  - ✅ **Financeiro:** READ (visualiza dados financeiros)
  - ✅ **Relatórios:** READ (relatórios da unidade)

**Quem usa:** Gerentes responsáveis pela operação de uma unidade específica

**Funcionalidades:**

- Gerenciar alunos da unidade
- Acompanhar horários e aulas
- Visualizar escalas de professores
- Consultar indicadores financeiros
- Gerar relatórios operacionais

---

### 4. **PROFESSOR / INSTRUTOR** 🥋

- **Nome no DB:** `professor` ou `instrutor` (ambos têm mesmas permissões)
- **Descrição:** Professor/Instrutor de jiu-jitsu
- **Permissões:**
  - ✅ **Alunos:** READ, WRITE (gerencia seus alunos)
  - ✅ **Unidades:** READ (visualiza informações da unidade)

**Quem usa:** Professores que ministram aulas

**Funcionalidades:**

- Registrar presença dos alunos
- Avaliar evolução dos alunos
- Aprovar graduações (faixas)
- Visualizar horários de aulas
- Gerenciar turmas

**Importante:** O sistema filtra automaticamente para mostrar apenas alunos das unidades onde o professor ministra aulas.

---

### 5. **ALUNO** 🎓

- **Nome no DB:** `aluno`
- **Descrição:** Aluno matriculado
- **Permissões:**
  - ✅ **Alunos:** READ (apenas seus próprios dados)

**Quem usa:** Todos os alunos matriculados

**Funcionalidades:**

- Visualizar histórico de presenças
- Consultar graduação atual
- Ver próximas aulas
- Acompanhar evolução pessoal
- Atualizar dados cadastrais

---

## 📋 Perfis Complementares (OPCIONAIS)

### 6. **RECEPCIONISTA** 📞

- **Nome no DB:** `recepcionista`
- **Descrição:** Atendimento e check-in
- **Permissões:**
  - ✅ **Alunos:** READ, WRITE (cadastrar e atualizar)
  - ✅ **Unidades:** READ (visualizar informações)
  - ✅ **Professores:** READ (consultar escalas)

**Quem usa:** Atendentes e recepcionistas das academias

**Funcionalidades:**

- Cadastrar novos alunos
- Fazer check-in/registro de presença
- Atualizar dados cadastrais
- Consultar horários de aulas
- Atender solicitações dos alunos

---

### 7. **FINANCEIRO** 💰

- **Nome no DB:** `financeiro`
- **Descrição:** Gestor financeiro
- **Permissões:**
  - ✅ **Financeiro:** READ, WRITE, ADMIN (controle total)
  - ✅ **Alunos:** READ (consultar dados)
  - ✅ **Unidades:** READ (visualizar informações)
  - ✅ **Relatórios:** READ (relatórios financeiros)

**Quem usa:** Responsáveis pela área financeira

**Funcionalidades:**

- Controlar mensalidades
- Gerenciar pagamentos
- Emitir cobranças
- Gerar relatórios financeiros
- Controlar inadimplência

---

### 8. **COORDENADOR TÉCNICO** 🎯

- **Nome no DB:** `coordenador_tecnico`
- **Descrição:** Coordenador de graduações
- **Permissões:**
  - ✅ **Alunos:** READ, WRITE (avaliar graduações)
  - ✅ **Professores:** READ, WRITE (avaliar professores)
  - ✅ **Unidades:** READ (visualizar informações)
  - ✅ **Relatórios:** READ (relatórios técnicos)

**Quem usa:** Coordenadores técnicos responsáveis por avaliações

**Funcionalidades:**

- Aprovar/rejeitar graduações
- Avaliar professores
- Definir critérios de graduação
- Gerar relatórios de evolução
- Acompanhar qualidade técnica

---

### 9. **SUPERVISOR REGIONAL** 🌍

- **Nome no DB:** `supervisor_regional`
- **Descrição:** Supervisor de múltiplas unidades
- **Permissões:**
  - ✅ **Unidades:** READ, WRITE (supervisionar múltiplas)
  - ✅ **Alunos:** READ, WRITE (gerenciar alunos)
  - ✅ **Professores:** READ, WRITE (gerenciar professores)
  - ✅ **Financeiro:** READ (visualizar dados)
  - ✅ **Relatórios:** READ (relatórios regionais)

**Quem usa:** Supervisores responsáveis por uma região

**Funcionalidades:**

- Supervisionar múltiplas unidades
- Avaliar desempenho geral
- Apoiar gerentes locais
- Gerar relatórios consolidados
- Implementar padronizações

---

### 10. **RESPONSÁVEL** 👨‍👧‍👦

- **Nome no DB:** `responsavel`
- **Descrição:** Responsável legal de menor
- **Permissões:**
  - ✅ **Alunos:** READ (dados dos dependentes)
  - ✅ **Financeiro:** READ (mensalidades)

**Quem usa:** Pais/responsáveis de alunos menores de idade

**Funcionalidades:**

- Visualizar dados dos filhos/dependentes
- Acompanhar presenças
- Consultar graduações
- Visualizar mensalidades
- Atualizar dados cadastrais

---

### 11. **VISUALIZADOR** 👁️

- **Nome no DB:** `visualizador`
- **Descrição:** Acesso somente leitura
- **Permissões:**
  - ✅ TODAS as permissões de READ (apenas visualização)

**Quem usa:** Auditores, consultores, parceiros

**Funcionalidades:**

- Consultar todos os dados do sistema
- Gerar relatórios
- Exportar dados
- Sem permissão para criar/editar/excluir

---

## 📊 Comparativo de Permissões

| Módulo          | Master | Franqueado | Gerente | Professor | Aluno | Recep. | Financ. | Coord. | Superv. | Respons. | Visual. |
| --------------- | ------ | ---------- | ------- | --------- | ----- | ------ | ------- | ------ | ------- | -------- | ------- |
| **Franquias**   | ADMIN  | READ       | -       | -         | -     | -      | -       | -      | -       | -        | READ    |
| **Unidades**    | ADMIN  | RWD        | RW      | R         | -     | R      | R       | R      | RW      | -        | R       |
| **Alunos**      | ADMIN  | RW         | RW      | RW        | R\*   | RW     | R       | RW     | RW      | R\*\*    | R       |
| **Professores** | ADMIN  | RW         | R       | -         | -     | R      | -       | RW     | RW      | -        | R       |
| **Financeiro**  | ADMIN  | RW         | R       | -         | -     | -      | ADMIN   | -      | R       | R\*\*    | R       |
| **Usuários**    | ADMIN  | -          | -       | -         | -     | -      | -       | -      | -       | -        | -       |
| **Relatórios**  | R      | R          | R       | -         | -     | -      | R       | R      | R       | -        | R       |
| **Config.**     | ADMIN  | -          | -       | -         | -     | -      | -       | -      | -       | -        | -       |

**Legenda:**

- **R** = READ (Leitura)
- **W** = WRITE (Escrita)
- **D** = DELETE (Exclusão)
- **ADMIN** = Administração total
- **R\*** = Apenas seus próprios dados
- **R\*\*** = Apenas dados dos dependentes
- **-** = Sem acesso

---

## 🚀 Como Usar os Scripts SQL

### 1. Inserir Perfis

```bash
# No PostgreSQL
psql -U postgres -d teamcruz_db -f backend/insert-perfis-completos.sql
```

### 2. Vincular Permissões aos Perfis

```bash
psql -U postgres -d teamcruz_db -f backend/insert-permissoes-perfis.sql
```

### 3. Criar Usuário e Atribuir Perfil

```sql
-- Exemplo: Criar professor
INSERT INTO teamcruz.usuarios (id, username, email, password, nome, ativo)
VALUES (
  uuid_generate_v4(),
  'joao.silva',
  'joao@teamcruz.com',
  '$2b$10$hashedpassword...',
  'João Silva',
  true
);

-- Vincular ao perfil de professor
INSERT INTO teamcruz.usuario_perfis (usuario_id, perfil_id)
VALUES (
  (SELECT id FROM teamcruz.usuarios WHERE username = 'joao.silva'),
  (SELECT id FROM teamcruz.perfis WHERE nome = 'professor')
);
```

---

## 🔄 Fluxo de Cadastro com Perfil

### Via Frontend (Tela de Registro)

```
1. Usuário acessa /register
2. Preenche formulário
3. Seleciona perfil desejado (Aluno, Professor, etc)
4. Sistema:
   - Cria usuário
   - Vincula ao perfil selecionado
   - Marca como "aguardando aprovação" (se não for Aluno)
5. Admin aprova em /admin/usuarios-pendentes
6. Usuário pode fazer login com permissões do perfil
```

### Via API

```typescript
POST /api/usuarios
{
  "username": "maria.santos",
  "email": "maria@teamcruz.com",
  "password": "senha123",
  "nome": "Maria Santos",
  "perfil_ids": [
    "uuid-do-perfil-gerente-unidade"
  ]
}
```

---

## 🛡️ Segurança e Hierarquia

### Níveis de Acesso (do maior para o menor):

1. **Master** → Controle total do sistema
2. **Supervisor Regional** → Múltiplas unidades
3. **Franqueado** → Suas unidades
4. **Coordenador Técnico** → Avaliações técnicas
5. **Gerente Unidade** → Uma unidade
6. **Financeiro** → Dados financeiros
7. **Professor** → Suas turmas
8. **Recepcionista** → Atendimento
9. **Responsável** → Dados dos dependentes
10. **Aluno** → Próprios dados
11. **Visualizador** → Apenas leitura

### Filtros Automáticos por Perfil

O sistema aplica filtros automaticamente:

```typescript
// PROFESSOR vê apenas alunos das suas unidades
GET /api/alunos
// SQL: WHERE unidade_id IN (unidades_do_professor)

// FRANQUEADO vê apenas suas unidades
GET /api/unidades
// SQL: WHERE franqueado_id = id_do_franqueado

// ALUNO vê apenas próprios dados
GET /api/alunos/:id
// SQL: WHERE id = id_do_usuario_aluno
```

---

## 📌 Perfis Recomendados por Cenário

### Cenário 1: Academia Pequena (1 unidade)

- ✅ 1 Master (você)
- ✅ 2-3 Professores
- ✅ 1 Recepcionista
- ✅ N Alunos

### Cenário 2: Rede com Franqueados

- ✅ 1 Master (administração central)
- ✅ 3-5 Franqueados (proprietários)
- ✅ 1 Gerente por unidade
- ✅ 2-4 Professores por unidade
- ✅ 1 Financeiro (central)
- ✅ N Alunos

### Cenário 3: Grande Rede Regional

- ✅ 1 Master
- ✅ 2-3 Supervisores Regionais
- ✅ 5-10 Franqueados
- ✅ 1 Gerente por unidade
- ✅ 1 Coordenador Técnico
- ✅ 1-2 Financeiro
- ✅ Múltiplos Professores
- ✅ N Alunos

---

## 📝 Próximos Passos

1. ✅ Execute `insert-perfis-completos.sql`
2. ✅ Execute `insert-permissoes-perfis.sql`
3. ✅ Crie usuários e vincule aos perfis
4. ✅ Teste login e permissões no frontend
5. ✅ Ajuste permissões conforme necessidade

---

**Criado em:** 18/10/2025
**Atualizado em:** 18/10/2025
**Versão:** 2.0
**Autor:** Team Cruz Development Team
