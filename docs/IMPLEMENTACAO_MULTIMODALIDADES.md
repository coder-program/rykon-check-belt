# Implementação Multi-Modalidades — Team Cruz / Rykon

> **Objetivo:** Expandir o sistema para suportar múltiplas modalidades esportivas (Muay Thai, Boxe, Judô, Wrestling, MMA, etc.) **sem mexer no que já funciona de Jiu-Jitsu.** O BJJ continua hardcoded como está. Novas modalidades usam um sistema paralelo e independente.

> **Data:** 23/02/2026  
> **Status:** Levantamento / Planejamento  
> **Sem codificação — apenas análise de impacto e roadmap.**

---

# FASE 1 — REQUISITOS FUNCIONAIS: CRUD DE MODALIDADE

> **Escopo:** Antes de matricular aluno, antes de graduação — precisamos ter a modalidade cadastrada.  
> **Aluno que já faz Jiu-Jitsu** poderá se matricular nas novas modalidades depois (Fase 2).

---

## RF01 — Criar Modalidade

**Descrição:** Franqueado ou Gerente cria uma nova modalidade na unidade.

**Campos obrigatórios:**
| Campo | Tipo | Validação | Exemplo |
|-------|------|-----------|---------|
| `nome` | string(100) | Min 3 chars, único por unidade | "Muay Thai" |
| `unidade_id` | UUID | Deve existir e pertencer ao usuário logado | — |
| `valor_mensalidade` | decimal(10,2) | >= 0 | 180.00 |

**Campos opcionais:**
| Campo | Tipo | Default | Exemplo |
|-------|------|---------|---------|
| `descricao` | text | null | "Arte marcial tailandesa..." |
| `cor` | varchar(7) | '#1E3A8A' | '#E74C3C' |
| `icone` | varchar(50) | null | 'boxing-glove' |
| `tipo_graduacao` | enum | 'NENHUM' | 'FAIXA', 'GRAU', 'KYU_DAN', 'CORDAO', 'LIVRE', 'NENHUM' |

**Regras de negócio:**
- RN01: Não pode criar modalidade com nome duplicado na mesma unidade
- RN02: Somente `master`, `franqueado`, `gerente_unidade` podem criar
- RN03: Validar que `unidade_id` pertence ao usuário logado (franqueado vê suas unidades, gerente vê a dele)
- RN04: Modalidade criada com `ativo = true` por padrão
- RN05: `tipo_graduacao` define qual sistema de graduação será usado (configurável depois via níveis)

**Resposta:** 201 Created com o objeto completo da modalidade

---

## RF02 — Listar Modalidades

**Descrição:** Listar modalidades de uma unidade.

**Filtros disponíveis:**
| Filtro | Tipo | Obrigatório |
|--------|------|-------------|
| `unidade_id` | UUID | Sim (obrigatório para não-master) |
| `apenasAtivas` | boolean | Não (default: false) |

**Regras de negócio:**
- RN06: Qualquer usuário logado pode listar (inclusive aluno — precisa ver o que tem disponível)
- RN07: Ordenar por nome ASC
- RN08: Retornar contagem de alunos ativos por modalidade (`totalAlunos`)

**Resposta:** Array de modalidades com `totalAlunos` em cada uma

---

## RF03 — Buscar Modalidade por ID

**Descrição:** Buscar detalhes de uma modalidade específica.

**Regras de negócio:**
- RN09: Qualquer logado pode buscar
- RN10: Retornar dados completos + lista de níveis (quando existirem) + contagem de alunos
- RN11: Se não encontrar → 404

**Resposta:** Objeto da modalidade com relações carregadas

---

## RF04 — Editar Modalidade

**Descrição:** Atualizar dados de uma modalidade existente.

**Campos editáveis:** nome, descricao, valor_mensalidade, cor, icone, tipo_graduacao

**Regras de negócio:**
- RN12: Somente `master`, `franqueado`, `gerente_unidade` podem editar
- RN13: Validar unicidade de nome na unidade (se mudou o nome)
- RN14: Validar que a modalidade pertence a uma unidade do usuário logado
- RN15: Se mudar `tipo_graduacao` e já tiver alunos graduados → bloquear ou avisar ("Já existem X alunos com graduação neste sistema. Deseja continuar?")

**Resposta:** 200 OK com objeto atualizado

---

## RF05 — Ativar / Desativar Modalidade

**Descrição:** Soft toggle — não deleta, apenas muda visibilidade.

**Regras de negócio:**
- RN16: Somente `master`, `franqueado`, `gerente_unidade`
- RN17: Desativar NÃO remove alunos matriculados — apenas esconde a modalidade de novas matrículas
- RN18: Ao desativar, retornar aviso: "X alunos estão matriculados nesta modalidade"
- RN19: Modalidade desativada não aparece para aluno no app (mas admin ainda vê)

**Resposta:** 200 OK com modalidade atualizada + contagem de alunos impactados

---

## RF06 — Deletar Modalidade

**Descrição:** Remoção permanente (hard delete).

**Regras de negócio:**
- RN20: Somente `master` e `franqueado` podem deletar (gerente  pode)
- RN21: Se tem alunos matriculados (ativos ou inativos) →  pode deletar. Precisa desmatricular todos primeiro
- RN22: Confirmação obrigatória no frontend (modal: "Tem certeza? Esta ação é irreversível")
- RN23: Deletar a modalidade remove em cascata os níveis associados (se não tiver alunos graduados)

**Resposta:** 200 OK { message: "Modalidade removida com sucesso" }

---

## RF07 — Estatísticas da Modalidade

**Descrição:** Métricas financeiras e de adesão.

**Dados retornados:**
| Métrica | Descrição |
|---------|-----------|
| `totalAlunos` | Alunos ativos na modalidade |
| `faturamentoPotencial` | totalAlunos × valor_mensalidade |
| `faturamentoReal` | Soma de valor_praticado (com descontos individuais) |

**Regras de negócio:**
- RN24: Somente `master`, `franqueado`, `gerente_unidade`, `professor` podem ver estatísticas
- RN25: Professor vê apenas das modalidades que ele leciona (futuro)

**Resposta:** 200 OK com objeto de estatísticas

---

## RF-FRONT-01 — Página de Gerenciamento de Modalidades

**Descrição:** Tela para CRUD visual de modalidades.

**Rota:** `/modalidades`

**Elementos da tela:**
1. **Header:** Título "Modalidades" + Botão "Nova Modalidade" (visível só para franqueado/gerente)
2. **Cards/Lista:** Uma card por modalidade com:
   - Nome + ícone + cor (badge colorido)
   - Tipo de graduação (tag: "Faixa", "Grau", etc.)
   - Total de alunos
   - Valor mensalidade
   - Status (ativo/inativo — badge verde/cinza)
   - Ações: Editar | Ativar/Desativar | Deletar (conforme permissão)
3. **Filtro:** Ativas / Todas
4. **Busca:** Filtrar por nome

**Regras de UI:**
- RF-UI-01: Botão "Nova Modalidade" oculto para perfis sem permissão
- RF-UI-02: Botão "Deletar" visível apenas para franqueado
- RF-UI-03: Cards de modalidade inativa aparecem com opacidade reduzida
- RF-UI-04: Ao clicar em "Deletar" → modal de confirmação
- RF-UI-05: Ao clicar em "Desativar" → toast com aviso de quantos alunos impactados

---

## RF-FRONT-02 — Modal/Formulário Criar/Editar Modalidade

**Descrição:** Modal dialog ou página para preencher dados da modalidade.

**Campos do formulário:**
| Campo | Componente UI | Obrigatório |
|-------|--------------|-------------|
| Nome | Input text | ✅ |
| Descrição | Textarea | ❌ |
| Valor Mensalidade | Input number (R$) | ✅ |
| Cor | Color picker (hex) | ❌ |
| Ícone | Select com preview de ícones | ❌ |
| Tipo de Graduação | Select dropdown | ❌ (default: NENHUM) |

**Opções do Tipo de Graduação:**
| Valor | Label | Exemplo |
|-------|-------|---------|
| FAIXA | Faixa (cores) | Muay Thai, Judô, Karatê |
| GRAU | Graus numéricos | Boxe, Wrestling |
| KYU_DAN | Kyu/Dan | Karatê, Judô, Aikido |
| CORDAO | Cordão (cores) | Capoeira |
| LIVRE | Personalizado | Qualquer configuração |
| NENHUM | Sem graduação | Funcional, Cross Training |

**Validações no form:**
- Nome: mín 3 caracteres
- Valor: >= 0, formato moeda brasileira
- Cor: formato hex válido
- Mostrar erro inline se nome duplicado (após submit)

---

## RF08 — Seleção de Modalidade no Cadastro do Aluno

**Descrição:** Ao cadastrar um aluno, após selecionar a unidade, o sistema deve listar as modalidades disponíveis naquela unidade para que o usuário escolha em qual(is) modalidade(s) o aluno será matriculado.

**Situação atual:**
- O cadastro de aluno (AlunoForm.tsx, Tab 3 "Matrícula") **já tem** seleção de unidade
- **NÃO tem** seleção de modalidade — a tabela `aluno_modalidades` existe mas nunca é preenchida no cadastro
- Um aluno pode existir **sem Jiu-Jitsu** — ele pode ser exclusivamente aluno de Muay Thai, por exemplo ao selecionar a unidade tem q exibir apenas as modqalidades cadsatradas naquela unidade

**Fluxo proposto — Tab "Matrícula" do cadastro de aluno:**
```
1. Usuário seleciona a UNIDADE (já existe hoje)
2. Sistema carrega as modalidades ATIVAS daquela unidade (GET /modalidades?unidade_id=X&apenasAtivas=true)
3. Exibe checkboxes/multi-select com as modalidades disponíveis
4. Usuário marca uma ou mais modalidades (ex: Muay Thai + Boxe)
5. Para cada modalidade selecionada, exibe o valor padrão (da modalidade) com opção de alterar (desconto individual)
6. Ao salvar o aluno, o backend cria registros em aluno_modalidades para cada modalidade selecionada
```

**Campos por modalidade selecionada:**
| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `modalidade_id` | UUID | — | Qual modalidade |
| `data_matricula` | date | hoje | Data de entrada na modalidade |
| `valor_praticado` | decimal | valor_mensalidade da modalidade | Valor com desconto individual (se houver) |

**Regras de negócio:**
- RN26: Ao selecionar uma unidade, carregar automaticamente as modalidades ativas daquela unidade
- RN27: Limpar seleção de modalidades se o usuário trocar de unidade
- RN28: Obrigatório selecionar pelo menos UMA modalidade (todo aluno pratica algo)
- RN29: Aluno pode ser matriculado em múltiplas modalidades de uma vez
- RN30: Se o aluno NÃO marca Jiu-Jitsu, o sistema NÃO cria registros de faixa/graduação BJJ
- RN31: Se o aluno marca Jiu-Jitsu, continua o fluxo atual (cria AlunoFaixa, AlunoFaixaGrau, etc.)
- RN32: O `valor_praticado` pode ser editado pelo franqueado/gerente (desconto por aluno por modalidade)
- RN33: Se o aluno já faz Jiu-Jitsu e quer adicionar Muay Thai depois → usar endpoint de matrícula em modalidade (não precisa reabrir o cadastro inteiro)

**Impacto no cadastro existente (BJJ):**
```
CENÁRIO A — Aluno escolhe Jiu-Jitsu (+ outras opcionais):
  → Fluxo atual de BJJ permanece: cria AlunoFaixa, graus, etc.
  → Adicionalmente cria AlunoModalidade para cada modalidade marcada (inclusive BJJ)

CENÁRIO B — Aluno NÃO escolhe Jiu-Jitsu:
  → NÃO cria nada de faixa/graduação BJJ
  → Cria apenas AlunoModalidade para as modalidades escolhidas
  → O aluno existe no sistema, faz presença, paga mensalidade — mas SEM BJJ

CENÁRIO C — Aluno já existe, quer adicionar modalidade depois:
  → Endpoint separado: POST /alunos/:id/modalidades
  → Ou edição via tela do aluno (aba Matrícula → adicionar modalidade)
```

**Mudanças necessárias para este RF:**
| Camada | O que mudar | Arquivo |
|--------|-------------|---------|
| DTO | Adicionar `modalidades?: AlunoModalidadeDto[]` no `CreateAlunoDto` | create-aluno.dto.ts |
| Service | No `create()`, após salvar aluno, iterar `modalidades[]` e criar `AlunoModalidade` | alunos.service.ts |
| Service | Condicional: se modalidade === BJJ → fluxo de faixa. Se não → pular faixa | alunos.service.ts |
| Frontend | Adicionar seção de modalidades na Tab 3 "Matrícula" do `AlunoForm.tsx` | AlunoForm.tsx |
| Frontend | Componente `ModalidadeSelector` (checkboxes + valor editável) | novo componente |
| API | Endpoint `GET /modalidades?unidade_id=X&apenasAtivas=true` já existe | — |

---

## Checklist de Implementação — CRUD Modalidade

### Backend (o que fazer)
- [x] Adicionar colunas `tipo_graduacao` e `icone` na entity `Modalidade`
- [x] Criar enum `TipoGraduacao` (FAIXA, GRAU, KYU_DAN, CORDAO, LIVRE, NENHUM)
- [x] Atualizar `CreateModalidadeDto` com novos campos + validações
- [x] Atualizar `UpdateModalidadeDto` (herda do Create, já funciona)
- [ ] Adicionar `@UseGuards(RolesGuard)` + `@Roles(...)` no controller
- [ ] Importar `RolesGuard` e `Roles` no controller
- [x] Ajustar `findAll` para retornar `totalAlunos` (LEFT JOIN count)
- [x] Ajustar `desativar` para retornar contagem de alunos impactados
- [x] Ajustar `remove` para bloquear se tem alunos matriculados
- [x] Criar migration SQL para ALTER TABLE modalidades ADD COLUMN tipo_graduacao, icone
- [ ] Testar todos endpoints com Swagger
- [ ] Adicionar `modalidades?: AlunoModalidadeDto[]` no `CreateAlunoDto`
- [ ] No `alunos.service.create()`, salvar `AlunoModalidade` para cada modalidade selecionada
- [ ] Condicional: se BJJ selecionado → fluxo de faixa; se não → pular criação de AlunoFaixa/AlunoFaixaGrau
- [ ] Endpoint `POST /alunos/:id/modalidades` para adicionar modalidade depois do cadastro

### Frontend (o que fazer)
- [x] Criar página `/app/modalidades/page.tsx`
- [x] Componente `ModalidadeCard` (card visual)
- [x] Componente `ModalidadeForm` (modal criar/editar)
- [ ] Hook `useModalidades` (buscar, criar, editar, deletar, ativar, desativar)
- [ ] Adicionar item "Modalidades" no menu lateral
- [x] Controle de visibilidade por perfil (botões conforme role)
- [x] Modal de confirmação para deletar
- [x] Toast de aviso ao desativar
- [ ] Componente `ModalidadeSelector` (checkboxes + valor por modalidade) para usar no cadastro de aluno
- [ ] Integrar `ModalidadeSelector` na Tab 3 "Matrícula" do `AlunoForm.tsx`
- [ ] Ao trocar unidade → recarregar modalidades e limpar seleção anterior

### Database (o que fazer)
- [x] `ALTER TABLE teamcruz.modalidades ADD COLUMN tipo_graduacao VARCHAR(20) DEFAULT 'NENHUM';`
- [x] `ALTER TABLE teamcruz.modalidades ADD COLUMN icone VARCHAR(50) DEFAULT NULL;`
- [x] Criar tipo ENUM ou CHECK constraint para tipo_graduacao

---

## 1. Filosofia: Separar e Não Mexer no BJJ

### Princípio chave
```
BJJ = intocável. Funciona, não mexe.
Novas modalidades = sistema paralelo novo, usando tabelas próprias.
```

### Por quê?
- O módulo de graduação (faixas, graus, progresso, parâmetros) é **complexo e estável**
- Mexer nele pra tornar "genérico" = **alto risco de regressão** sem ganho imediato
- As tabelas `faixa_def`, `aluno_faixa`, `aluno_faixa_grau`, `configuracoes_graduacao`, `graduacao_parametros` etc. continuam servindo **exclusivamente ao BJJ**
- Muay Thai, Boxe, Judô, etc. terão **suas próprias tabelas de graduação** — mais simples e flexíveis

### O que NÃO vamos mexer

| Módulo | Decisão |
|--------|---------|
| `faixa_def` | ✅ Fica como está — faixas de BJJ |
| `aluno_faixa` / `aluno_faixa_grau` | ✅ Fica como está — progresso de BJJ |
| `configuracoes_graduacao` | ✅ Fica como está — config de faixas BJJ |
| `graduacao_parametros` | ✅ Fica como está — parâmetros de graduação BJJ |
| `historico_faixas` / `historico_graus` | ✅ Fica como está — histórico BJJ |
| `aluno_graduacao` | ✅ Fica como está — solicitações de graduação BJJ |
| Módulo `graduacao/` no backend | ✅ Fica como está — todo o fluxo de faixas/graus |
| Tela `/graduacao` no frontend | ✅ Fica como está — gerenciamento de faixas BJJ |
| `FaixaEnum` na entity `Aluno` | ✅ Fica como está |
| `TipoAula` enum (GI, NO_GI, etc.) | ✅ Fica como está — tipos de aula BJJ |

---

## 2. O que JÁ Existe e Vamos Aproveitar

| Camada | Recurso | Status |
|--------|---------|--------|
| **Banco** | `modalidades` (id, unidade_id, nome, descricao, valor_mensalidade, cor, ativo) | ✅ Genérica — já suporta qualquer nome |
| **Banco** | `aluno_modalidades` (aluno_id, modalidade_id, valor_praticado, ativo) | ✅ N:N aluno ↔ modalidade |
| **Backend** | Módulo `modalidades/` (entity, service, controller, DTOs) | ✅ CRUD completo |
| **Backend** | Entity `AlunoModalidade` com relacionamentos | ✅ |
| **Backend** | Entity `Aluno` com `alunoModalidades: AlunoModalidade[]` | ✅ |

**Conclusão:** A base de modalidades já existe. O aluno já pode ser matriculado em múltiplas modalidades. Falta: graduação/faixas para essas modalidades e as telas de gestão.

---

## 3. Novas Modalidades Possíveis

| Modalidade | Tem graduação? | Sistema de graduação |
|------------|---------------|---------------------|
| **Jiu-Jitsu (BJJ)** | ✅ **JÁ IMPLEMENTADO** | Faixas + Graus — **não mexer** |
| **Muay Thai** | ✅ Sim | Prajied (braçadeiras) — varia entre academias |
| **Boxe** | ❌ Não tem faixas | Níveis: Iniciante → Intermediário → Avançado |
| **Judô** | ✅ Sim | Faixas + Dan |
| **Wrestling** | ❌ Não | Níveis por experiência |
| **MMA** | ❌ Não | Níveis/categorias |
| **Karatê** | ✅ Sim | Kyu/Dan |
| **Taekwondo** | ✅ Sim | Kup/Dan |
| **Capoeira** | ✅ Sim | Cordas coloridas |
| **Kickboxing** | ❌/✅ Varia | Algumas federações usam faixas |

---

## 4. Arquitetura: Sistema Paralelo de Graduação

### 4.1 Diagrama Conceitual

```
                    ┌──────────────────────────────┐
                    │           ALUNO               │
                    └──────┬─────────────┬──────────┘
                           │             │
              ┌────────────▼──┐    ┌─────▼──────────────┐
              │  BJJ (INTACTO) │    │ NOVAS MODALIDADES  │
              │                │    │   (SISTEMA NOVO)   │
              ├────────────────┤    ├────────────────────┤
              │ aluno_faixa    │    │ aluno_modalidades   │ ← já existe
              │ aluno_faixa_grau│   │ modalidade_graduacoes│ ← NOVA tabela
              │ aluno_graduacao│    │ aluno_grad_modalidade│ ← NOVA tabela
              │ faixa_def      │    │ modalidade_niveis   │ ← NOVA tabela
              │ config_graduacao│   │                     │
              │ grad_parametros│    │                     │
              └────────────────┘    └────────────────────┘
              
              NÃO MEXE EM NADA        TABELAS NOVAS
```

### 4.2 Relação com aulas/turmas

```
AULA EXISTENTE (tipo GI/NO_GI/INFANTIL)  →  continua como está → presença conta pra BJJ
AULA NOVA (com modalidade_id)            →  nova coluna         → presença conta pra modalidade
```

A coluna `modalidade_id` em `aulas` e `turmas` é **nullable**:
- `NULL` = aula de BJJ (comportamento atual)
- Preenchido = aula da outra modalidade

---

## 5. Mudanças Necessárias — BANCO DE DADOS

### 5.1 Tabela `modalidades` — Adicionar campos (ALTER)
```sql
-- Tipo de graduação que essa modalidade usa
ALTER TABLE teamcruz.modalidades ADD COLUMN tipo_graduacao varchar(20) 
  DEFAULT 'NENHUM' CHECK (tipo_graduacao IN ('FAIXA', 'NIVEL', 'CORDA', 'BRACALETE', 'NENHUM'));

-- Ícone e tipo pra exibição no frontend
ALTER TABLE teamcruz.modalidades ADD COLUMN icone varchar(50) NULL;
ALTER TABLE teamcruz.modalidades ADD COLUMN tipo_esporte varchar(50) NULL;
```
**Impacto:** Zero. Colunas nullable, não afeta dados existentes.

### 5.2 NOVA tabela: `modalidade_niveis` (graduações genéricas)
```sql
-- Equivalente ao faixa_def mas para QUALQUER modalidade que não é BJJ
CREATE TABLE teamcruz.modalidade_niveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modalidade_id uuid NOT NULL REFERENCES teamcruz.modalidades(id) ON DELETE CASCADE,
  codigo varchar(30) NOT NULL,
  nome_exibicao varchar(60) NOT NULL,
  cor_hex varchar(7) DEFAULT '#808080',
  ordem int NOT NULL,
  graus_max int DEFAULT 0,         -- 0 = sem graus (ex: Boxe)
  aulas_por_grau int DEFAULT 0,    -- 0 = não conta aulas pra subir
  tempo_minimo_meses int DEFAULT 0, -- 0 = sem tempo mínimo
  categoria varchar(20) DEFAULT 'ADULTO',
  ativo bool DEFAULT true,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_modalidade_nivel_codigo UNIQUE (modalidade_id, codigo),
  CONSTRAINT uk_modalidade_nivel_ordem UNIQUE (modalidade_id, ordem)
);
CREATE INDEX idx_modalidade_niveis_modalidade ON teamcruz.modalidade_niveis(modalidade_id);
CREATE INDEX idx_modalidade_niveis_ordem ON teamcruz.modalidade_niveis(modalidade_id, ordem);
```
**Impacto:** Tabela nova, zero impacto.

### 5.3 NOVA tabela: `aluno_modalidade_graduacao` (progresso do aluno por modalidade)
```sql
-- Equivalente ao aluno_faixa mas para modalidades que não são BJJ
CREATE TABLE teamcruz.aluno_modalidade_graduacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES teamcruz.alunos(id) ON DELETE CASCADE,
  modalidade_id uuid NOT NULL REFERENCES teamcruz.modalidades(id) ON DELETE CASCADE,
  nivel_atual_id uuid NOT NULL REFERENCES teamcruz.modalidade_niveis(id),
  grau_atual int DEFAULT 0,
  presencas_no_ciclo int DEFAULT 0,       -- presenças desde último grau/nível
  presencas_total int DEFAULT 0,          -- presenças totais na modalidade
  data_inicio date DEFAULT CURRENT_DATE,
  data_ultimo_grau date NULL,
  data_ultimo_nivel date NULL,
  ativo bool DEFAULT true,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_aluno_modalidade_grad UNIQUE (aluno_id, modalidade_id)
);
CREATE INDEX idx_aluno_mod_grad_aluno ON teamcruz.aluno_modalidade_graduacao(aluno_id);
CREATE INDEX idx_aluno_mod_grad_modalidade ON teamcruz.aluno_modalidade_graduacao(modalidade_id);
CREATE INDEX idx_aluno_mod_grad_nivel ON teamcruz.aluno_modalidade_graduacao(nivel_atual_id);
```
**Impacto:** Tabela nova, zero impacto.

### 5.4 NOVA tabela: `aluno_modalidade_graduacao_historico` (histórico de promoções)
```sql
CREATE TABLE teamcruz.aluno_modalidade_graduacao_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES teamcruz.alunos(id) ON DELETE CASCADE,
  modalidade_id uuid NOT NULL REFERENCES teamcruz.modalidades(id) ON DELETE CASCADE,
  nivel_origem_id uuid REFERENCES teamcruz.modalidade_niveis(id),
  nivel_destino_id uuid NOT NULL REFERENCES teamcruz.modalidade_niveis(id),
  grau_origem int DEFAULT 0,
  grau_destino int DEFAULT 0,
  tipo varchar(20) DEFAULT 'NIVEL' CHECK (tipo IN ('NIVEL', 'GRAU')), -- subiu de nível ou ganhou grau
  data_promocao date DEFAULT CURRENT_DATE,
  presencas_acumuladas int DEFAULT 0,
  concedido_por uuid REFERENCES teamcruz.usuarios(id),
  observacao text NULL,
  certificado_url text NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_aluno_mod_hist_aluno ON teamcruz.aluno_modalidade_graduacao_historico(aluno_id);
CREATE INDEX idx_aluno_mod_hist_modalidade ON teamcruz.aluno_modalidade_graduacao_historico(modalidade_id);
CREATE INDEX idx_aluno_mod_hist_data ON teamcruz.aluno_modalidade_graduacao_historico(data_promocao);
```
**Impacto:** Tabela nova, zero impacto.

### 5.5 Tabelas existentes — Mínimos ALTERs

#### `turmas` — Adicionar modalidade_id (nullable)
```sql
ALTER TABLE teamcruz.turmas ADD COLUMN modalidade_id uuid NULL;
ALTER TABLE teamcruz.turmas ADD CONSTRAINT fk_turmas_modalidade 
  FOREIGN KEY (modalidade_id) REFERENCES teamcruz.modalidades(id);
-- NULL = turma de BJJ (comportamento legado)
-- Preenchido = turma de outra modalidade
```

#### `aulas` — Adicionar modalidade_id (nullable)
```sql
ALTER TABLE teamcruz.aulas ADD COLUMN modalidade_id uuid NULL;
ALTER TABLE teamcruz.aulas ADD CONSTRAINT fk_aulas_modalidade 
  FOREIGN KEY (modalidade_id) REFERENCES teamcruz.modalidades(id);
-- NULL = aula de BJJ (comportamento legado, usa enum TipoAula)
-- Preenchido = aula de outra modalidade
```

#### `competicoes` — Adicionar modalidade_id (nullable, não mexe no campo existente)
```sql
ALTER TABLE teamcruz.competicoes ADD COLUMN modalidade_id uuid NULL;
ALTER TABLE teamcruz.competicoes ADD CONSTRAINT fk_competicoes_modalidade 
  FOREIGN KEY (modalidade_id) REFERENCES teamcruz.modalidades(id);
-- Campo 'modalidade' (GI/NO_GI/AMBOS) continua pra BJJ
-- modalidade_id preenchido = competição de outra modalidade
```

### 5.6 NOVA tabela: `modalidade_templates` (seed para facilitar criação)
```sql
CREATE TABLE teamcruz.modalidade_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  esporte varchar(50) NOT NULL,
  nome_graduacao varchar(60) NOT NULL,
  cor_hex varchar(7),
  ordem int NOT NULL,
  graus_max int DEFAULT 0,
  aulas_por_grau int DEFAULT 0,
  tempo_minimo_meses int DEFAULT 0,
  categoria varchar(20) DEFAULT 'ADULTO',
  tipo_graduacao varchar(20) DEFAULT 'FAIXA'
);
-- Seed com graduações de Muay Thai, Judô, Karatê etc.
```

### Resumo SQL

| Tipo | Quantidade | Risco |
|------|-----------|-------|
| Tabelas NOVAS | 4 (`modalidade_niveis`, `aluno_modalidade_graduacao`, `aluno_modalidade_graduacao_historico`, `modalidade_templates`) | 🟢 Zero |
| ALTERs em tabelas existentes | 3 (`modalidades`, `turmas`, `aulas`) + 1 (`competicoes`) | 🟢 Zero (nullable) |
| Tabelas modificadas do BJJ | **0** | ✅ Nenhum risco |

---

## 6. Mudanças Necessárias — BACKEND (NestJS)

### 6.1 Arquivos que NÃO vamos mexer
- `graduacao/` (todo o módulo) ✅
- `presenca/entities/presenca.entity.ts` ✅ 
- `people/entities/aluno.entity.ts` (FaixaEnum etc.) ✅
- `graduacao/entities/faixa-def.entity.ts` ✅
- `graduacao/entities/aluno-faixa.entity.ts` ✅
- `graduacao/entities/aluno-faixa-grau.entity.ts` ✅
- `graduacao/entities/configuracao-graduacao.entity.ts` ✅

### 6.2 Entity `Modalidade` — Adicionar 3 campos
```typescript
// modalidades/entities/modalidade.entity.ts — ADICIONAR:
@Column({ type: 'varchar', length: 20, default: 'NENHUM' })
tipo_graduacao: string; // FAIXA, NIVEL, CORDA, BRACALETE, NENHUM

@Column({ type: 'varchar', length: 50, nullable: true })
icone: string;

@Column({ type: 'varchar', length: 50, nullable: true })
tipo_esporte: string;

@OneToMany(() => ModalidadeNivel, (nivel) => nivel.modalidade)
niveis: ModalidadeNivel[];
```

### 6.3 NOVAS Entities (3 arquivos novos)
```
backend/src/modalidades/entities/modalidade-nivel.entity.ts
backend/src/modalidades/entities/aluno-modalidade-graduacao.entity.ts
backend/src/modalidades/entities/aluno-modalidade-graduacao-historico.entity.ts
```

### 6.4 Entity `Turma` — Adicionar `modalidade_id` (nullable)
```typescript
// presenca/entities/turma.entity.ts — ADICIONAR:
@Column({ type: 'uuid', nullable: true })
modalidade_id: string | null;

@ManyToOne(() => Modalidade, { eager: false, nullable: true })
@JoinColumn({ name: 'modalidade_id' })
modalidade: Modalidade;
```

### 6.5 Entity `Aula` — Adicionar `modalidade_id` (nullable)
```typescript
// presenca/entities/aula.entity.ts — ADICIONAR:
@Column({ type: 'uuid', nullable: true })
modalidade_id: string | null;

@ManyToOne(() => Modalidade, { eager: false, nullable: true })
@JoinColumn({ name: 'modalidade_id' })
modalidade: Modalidade;
```
**Nota:** O enum `TipoAula` (GI, NO_GI, etc.) continua existindo. Aulas com `modalidade_id = NULL` usam o enum. Aulas com `modalidade_id` preenchido podem ter tipo `REGULAR`, `INFANTIL`, `LIVRE`.

### 6.6 Service `ModalidadesService` — Expandir (mesmo arquivo)
```
Novos métodos:
- criarNivel(modalidadeId, dto)
- listarNiveis(modalidadeId)
- atualizarNivel(nivelId, dto)
- removerNivel(nivelId)
- aplicarTemplate(modalidadeId, esporte)
- getProgressoAluno(alunoId, modalidadeId)
- concederGrauModalidade(alunoId, modalidadeId, dto)
- promoverNivelModalidade(alunoId, modalidadeId, dto)
- getHistoricoGraduacaoModalidade(alunoId, modalidadeId)
```

### 6.7 Controller `ModalidadesController` — Novos endpoints
```
GET    /modalidades/:id/niveis                          — Lista níveis/faixas da modalidade
POST   /modalidades/:id/niveis                          — Cria nível
PUT    /modalidades/:id/niveis/:nivelId                 — Atualiza nível
DELETE /modalidades/:id/niveis/:nivelId                 — Remove nível
POST   /modalidades/:id/aplicar-template                — Aplica template de esporte
GET    /modalidades/:id/alunos/:alunoId/progresso       — Progresso do aluno na modalidade
POST   /modalidades/:id/alunos/:alunoId/conceder-grau   — Conceder grau na modalidade
POST   /modalidades/:id/alunos/:alunoId/promover-nivel  — Promover nível na modalidade
GET    /modalidades/:id/alunos/:alunoId/historico       — Histórico de graduação
GET    /modalidades/:id/proximos-graduar                — Alunos próximos de subir na modalidade
```

### 6.8 DTOs novos
```
backend/src/modalidades/dto/create-modalidade-nivel.dto.ts
backend/src/modalidades/dto/conceder-grau-modalidade.dto.ts
backend/src/modalidades/dto/promover-nivel-modalidade.dto.ts
backend/src/modalidades/dto/aplicar-template.dto.ts
backend/src/modalidades/dto/progresso-modalidade.dto.ts
```

### 6.9 Service `PresencaService` — Ajuste mínimo
```
Ao registrar presença:
- Se aula.modalidade_id != null → incrementar presencas_no_ciclo e presencas_total 
  em aluno_modalidade_graduacao
- Se aula.modalidade_id == null → comportamento atual (incrementa aluno_faixa de BJJ)
```

### 6.10 Service `AulaService` — Ajuste mínimo
```
Ao criar/listar aula:
- Aceitar modalidade_id opcional no DTO
- Listar aulas filtrando por modalidade (query param opcional)
```

### Resumo Backend

| Tipo | Quantidade | Risco |
|------|-----------|-------|
| Entities NOVAS | 3 | 🟢 Zero |
| Entities ALTERADAS | 3 (`Modalidade`, `Turma`, `Aula`) | 🟢 Baixo (adição de coluna nullable) |
| DTOs NOVOS | 5 | 🟢 Zero |
| Service expandido | 1 (`ModalidadesService`) | 🟡 Médio |
| Services com ajuste mínimo | 2 (`PresencaService`, `AulaService`) | 🟢 Baixo |
| Controller expandido | 1 (`ModalidadesController`) | 🟢 Baixo |
| Módulo `graduacao/` | **0 alterações** | ✅ Intocado |

---

## 7. Mudanças Necessárias — FRONTEND (Next.js)

### 7.1 Páginas que NÃO vamos mexer
- `/graduacao` ✅ — continua sendo de BJJ
- `/complete-profile` (faixas BJJ hardcoded) ✅ — continua como está

### 7.2 NOVA página: `/modalidades` (CRUD + Graduação)

**Conteúdo da página:**
1. **Lista de modalidades** da unidade (cards com cor, ícone, qtd alunos)
2. **Criar nova modalidade** (nome, valor, cor, ícone, tipo de graduação)
   - Opção: "Aplicar template" (Muay Thai, Boxe, Judô, etc.)
3. **Editar modalidade** (dados + gerenciar níveis/faixas)
4. **Gerenciar graduações da modalidade:**
   - Lista de níveis/faixas ordenados
   - Adicionar/editar/remover nível
   - Configurar: graus_max, aulas_por_grau, tempo_mínimo, cor
5. **Alunos da modalidade:**
   - Lista de alunos matriculados
   - Progresso de cada aluno (nível atual, grau, presenças)
   - Botão "Conceder Grau" / "Promover Nível"
   - Histórico de graduação do aluno na modalidade

### 7.3 Página `/alunos/[id]` — Adicionar aba/seção de modalidades
- Mostrar todas as modalidades do aluno (via `aluno_modalidades`)
- Para cada modalidade com graduação: mostrar nível atual, grau, progresso
- Histórico de promoções por modalidade
- **Não mexer** na seção de faixas BJJ que já existe

### 7.4 Página de aulas/turmas — Ajuste mínimo
- Ao criar aula/turma: campo opcional "Modalidade" (dropdown)
- Se vazio = aula de BJJ (comportamento atual)
- Se preenchido = aula da modalidade escolhida
- Na lista: mostrar badge da modalidade se houver

### 7.5 Página `/competicoes` — Ajuste mínimo
- Ao criar competição: campo opcional "Modalidade" (dropdown)
- Se vazio = competição de BJJ (GI/NO_GI continua)
- Se preenchido = competição da modalidade escolhida

### 7.6 Dashboard — Adicionar métricas
- Card: "Alunos por modalidade" (gráfico pizza/barras)
- Card: "Receita por modalidade"

### 7.7 Componentes novos
```
frontend/components/modalidades/ModalidadeBadge.tsx       — badge colorido com ícone
frontend/components/modalidades/ModalidadeSelector.tsx    — dropdown de seleção
frontend/components/modalidades/NiveisManager.tsx         — CRUD de níveis/faixas inline
frontend/components/modalidades/ProgressoModalidade.tsx   — barra de progresso do aluno
frontend/components/modalidades/HistoricoGraduacao.tsx    — timeline de promoções
```

### Resumo Frontend

| Tipo | Quantidade | Risco |
|------|-----------|-------|
| Páginas NOVAS | 1 (`/modalidades`) | 🟢 Zero |
| Páginas ALTERADAS | 3 (`/alunos/[id]`, aulas/turmas, `/competicoes`) | 🟢 Baixo (adição, não alteração) |
| Componentes NOVOS | 5 | 🟢 Zero |
| Página `/graduacao` | **0 alterações** | ✅ Intocada |
| Página `/complete-profile` | **0 alterações** | ✅ Intocada |

---

## 8. Permissões e Controle de Acesso

### 8.1 Problema Atual

O controller `modalidades.controller.ts` hoje usa **apenas** `JwtAuthGuard` — qualquer usuário logado (aluno, professor, recepcionista) pode criar/editar/deletar modalidades. Não tem `@Roles()` nem `RolesGuard`.

### 8.2 Quem pode o quê — Matriz de Permissões

| Ação | Master | Franqueado | Gerente | Professor | Recepcionista | Aluno | Responsável |
|------|--------|-----------|---------|-----------|---------------|-------|-------------|
| **Criar modalidade** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Editar modalidade** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Ativar/Desativar modalidade** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Deletar modalidade** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Gerenciar níveis/faixas** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Aplicar template** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Matricular aluno em modalidade** | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Conceder grau / Promover nível** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Ver progresso do aluno** | ✅ | ✅ | ✅ | ✅ | ✅ | ⚡ * | ⚡ * |
| **Listar modalidades** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Ver estatísticas** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

> ⚡ * Aluno/Responsável vê **apenas seu próprio** progresso

### 8.3 Lógica por Perfil

**Franqueado:**
- Dono da unidade. Controle total sobre modalidades da(s) sua(s) unidade(s).
- Pode deletar modalidade (com validação: se tem alunos matriculados → aviso/confirmação).
- Pode criar modalidade do zero ou a partir de template.

**Gerente (gerente_unidade):**
- Braço direito do franqueado. Gerencia o dia a dia.
- Pode criar/editar/ativar/desativar modalidades.
- **Não pode deletar** — para evitar exclusão acidental de dados. Só desativa.
- Pode gerenciar níveis/faixas e graduar alunos.

**Professor:**
- **Não cria nem edita modalidade** — isso é gestão administrativa.
- **Pode conceder grau / promover nível** — faz parte do trabalho pedagógico.
- Pode ver progresso e estatísticas para acompanhar os alunos.

**Recepcionista:**
- Pode matricular aluno em modalidade (trabalho de balcão).
- Pode ver progresso (para informar ao aluno/responsável).
- Não gerencia estrutura (faixas, templates).

**Aluno / Responsável:**
- Apenas visualização do próprio progresso.
- Vê as modalidades disponíveis na unidade (para saber o que pode praticar).

### 8.4 Implementação no Backend

```typescript
// modalidades.controller.ts — AJUSTAR:

// CRUD de modalidades (criar, editar, ativar, desativar)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('master', 'franqueado', 'gerente_unidade')

// Deletar modalidade (apenas franqueado)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('master', 'franqueado')

// Graduação (conceder grau, promover nível)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('master', 'franqueado', 'gerente_unidade', 'professor')

// Matricular aluno em modalidade
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('master', 'franqueado', 'gerente_unidade', 'recepcionista')

// Listar modalidades (qualquer logado)
@UseGuards(JwtAuthGuard)
// sem @Roles — todos veem

// Ver progresso (qualquer logado, mas filtra por aluno_id se for aluno)
@UseGuards(JwtAuthGuard)
// No service: if (user.perfil === 'aluno') → retorna apenas dados do próprio aluno
```

### 8.5 Validação de Unidade

Além do perfil, o sistema precisa validar que o usuário pertence à unidade:
- **Franqueado** → só gerencia modalidades das unidades dele (`franqueados.unidades_gerencia`)
- **Gerente** → só gerencia modalidades da unidade dele (`gerente_unidades.unidade_id`)
- **Professor** → só gradua na(s) unidade(s) dele (`professor_unidades.unidade_id`)
- **Recepcionista** → só matricula na unidade dela (`recepcionista_unidades.unidade_id`)

```
Lógica: 
1. Buscar modalidade pelo ID
2. Verificar se modalidade.unidade_id está nas unidades do usuário logado
3. Se não → 403 Forbidden
```

### 8.6 Frontend — Visibilidade por Perfil

| Elemento | Franqueado/Gerente | Professor | Recepcionista | Aluno |
|----------|-------------------|-----------|--------------|-------|
| Botão "Nova Modalidade" | ✅ Visível | ❌ Oculto | ❌ Oculto | ❌ Oculto |
| Botão "Editar" na modalidade | ✅ Visível | ❌ Oculto | ❌ Oculto | ❌ Oculto |
| Botão "Deletar" | ✅ Franqueado only | ❌ | ❌ | ❌ |
| Aba "Gerenciar Níveis" | ✅ Visível | ❌ Oculto | ❌ Oculto | ❌ Oculto |
| Botão "Conceder Grau" | ✅ Visível | ✅ Visível | ❌ Oculto | ❌ Oculto |
| Botão "Matricular Aluno" | ✅ Visível | ❌ Oculto | ✅ Visível | ❌ Oculto |
| Lista de alunos + progresso | ✅ Todos | ✅ Todos | ✅ Todos | ⚡ Só o próprio |
| Menu lateral "Modalidades" | ✅ Visível | ✅ Visível (leitura) | ✅ Visível (leitura) | ❌ Oculto |

### 8.7 Novas Permissões a Cadastrar na Tabela `permissoes`

```sql
-- Permissões granulares para modalidades
INSERT INTO teamcruz.permissoes (codigo, nome, descricao, tipo_id, nivel_id, modulo) VALUES
('modalidade.criar',           'Criar Modalidade',              'Permite criar novas modalidades na unidade',              tipo_gestao, nivel_escrita, 'MODALIDADES'),
('modalidade.editar',          'Editar Modalidade',             'Permite editar dados da modalidade',                       tipo_gestao, nivel_escrita, 'MODALIDADES'),
('modalidade.deletar',         'Deletar Modalidade',            'Permite excluir modalidade permanentemente',               tipo_gestao, nivel_admin,   'MODALIDADES'),
('modalidade.ativar_desativar', 'Ativar/Desativar Modalidade',  'Permite ativar ou desativar modalidade',                   tipo_gestao, nivel_escrita, 'MODALIDADES'),
('modalidade.niveis.gerenciar', 'Gerenciar Níveis/Faixas',      'Permite criar/editar/remover níveis de graduação',         tipo_gestao, nivel_escrita, 'MODALIDADES'),
('modalidade.graduar',         'Graduar Aluno em Modalidade',   'Permite conceder grau ou promover nível de aluno',         tipo_pedagogico, nivel_escrita, 'MODALIDADES'),
('modalidade.matricular',      'Matricular Aluno em Modalidade','Permite vincular aluno a uma modalidade',                  tipo_operacional, nivel_escrita, 'MODALIDADES'),
('modalidade.visualizar',      'Visualizar Modalidades',        'Permite ver modalidades e progresso dos alunos',           tipo_leitura, nivel_leitura, 'MODALIDADES'),
('modalidade.estatisticas',    'Ver Estatísticas de Modalidade','Permite ver métricas (alunos, receita) por modalidade',    tipo_leitura, nivel_leitura, 'MODALIDADES');
```

---

## 9. Templates de Graduação por Esporte (Seeds)

### 8.1 Muay Thai (Prajied / Braçadeiras)
| Ordem | Graduação | Cor | Graus | Aulas/Grau |
|-------|-----------|-----|-------|-----------|
| 1 | Branca | #FFFFFF | 0 | 0 |
| 2 | Amarela | #FFD700 | 0 | 40 |
| 3 | Verde | #008000 | 0 | 50 |
| 4 | Azul | #0000FF | 0 | 60 |
| 5 | Marrom | #8B4513 | 0 | 70 |
| 6 | Vermelha | #FF0000 | 0 | 80 |
| 7 | Preta | #000000 | 0 | 100 |

### 8.2 Boxe (Níveis, sem faixas)
| Ordem | Nível | Cor | Graus | Aulas/Grau |
|-------|-------|-----|-------|-----------|
| 1 | Iniciante | #4CAF50 | 0 | 0 |
| 2 | Intermediário | #2196F3 | 0 | 0 |
| 3 | Avançado | #FF9800 | 0 | 0 |
| 4 | Profissional | #F44336 | 0 | 0 |

### 8.3 Judô
| Ordem | Faixa | Cor | Graus |
|-------|-------|-----|-------|
| 1 | Branca | #FFFFFF | 0 |
| 2 | Amarela | #FFD700 | 0 |
| 3 | Laranja | #FF8C00 | 0 |
| 4 | Verde | #008000 | 0 |
| 5 | Azul | #0000FF | 0 |
| 6 | Marrom | #8B4513 | 0 |
| 7 | Preta (1º Dan) | #000000 | 10 |

### 8.4 Karatê
| Ordem | Faixa | Cor | Graus |
|-------|-------|-----|-------|
| 1 | Branca (10º Kyu) | #FFFFFF | 0 |
| 2 | Amarela (8º Kyu) | #FFD700 | 0 |
| 3 | Vermelha (6º Kyu) | #FF0000 | 0 |
| 4 | Laranja (5º Kyu) | #FF8C00 | 0 |
| 5 | Verde (3º Kyu) | #008000 | 0 |
| 6 | Roxa (2º Kyu) | #800080 | 0 |
| 7 | Marrom (1º Kyu) | #8B4513 | 0 |
| 8 | Preta (Dan) | #000000 | 10 |

### 8.5 Capoeira
| Ordem | Corda | Cor |
|-------|-------|-----|
| 1 | Crua | #F5F5DC |
| 2 | Amarela | #FFD700 |
| 3 | Laranja | #FF8C00 |
| 4 | Azul | #0000FF |
| 5 | Verde | #008000 |
| 6 | Roxa | #800080 |
| 7 | Marrom | #8B4513 |
| 8 | Vermelha | #FF0000 |

---

## 10. Fluxo de Uso — Exemplo Prático

### 9.1 Franqueado cria modalidade "Muay Thai"
```
1. Acessa /modalidades
2. Clica "Nova Modalidade"
3. Seleciona template "Muay Thai" → preenche automaticamente nome, ícone, níveis
4. Ajusta valor da mensalidade: R$ 150,00
5. Ajusta cor: #FF6B00
6. Salva → modalidade criada com 7 braçadeiras (Branca→Preta)
```

### 9.2 Aluno se matricula em Muay Thai
```
1. Na ficha do aluno (/alunos/[id])
2. Seção "Modalidades" → Clica "Adicionar modalidade"
3. Seleciona "Muay Thai" → define valor praticado (com desconto se houver)
4. Aluno aparece em aluno_modalidades E aluno_modalidade_graduacao
5. Nível inicial: "Branca" (braçadeira branca)
```

### 9.3 Professor dá aula de Muay Thai
```
1. Cria aula com modalidade_id = Muay Thai
2. Registra presença dos alunos
3. Sistema incrementa presencas_no_ciclo em aluno_modalidade_graduacao
4. Quando atingir aulas_por_grau → aviso no /modalidades
```

### 9.4 Graduação em Muay Thai
```
1. Acessa /modalidades → Muay Thai → "Próximos a Graduar"
2. Vê lista de alunos com presença suficiente
3. Seleciona aluno → "Promover para Amarela"
4. Registra com observação e data
5. Histórico salvo em aluno_modalidade_graduacao_historico
```

---

## 11. Ordem de Implementação (Roadmap)

### FASE 1 — Banco de Dados ⏱️ ~1 dia
1. Criar 4 tabelas novas (modalidade_niveis, aluno_modalidade_graduacao, historico, templates)
2. ALTERs em modalidades, turmas, aulas, competicoes (adicionar colunas nullable)
3. Seed de templates (Muay Thai, Boxe, Judô, Karatê, Capoeira)
4. **Teste:** Verificar que nada quebrou — todas as queries existentes continuam iguais

### FASE 2 — Backend ⏱️ ~3-4 dias
5. Criar 3 entities novas
6. Atualizar entity Modalidade (+3 campos)
7. Atualizar entities Turma e Aula (+modalidade_id nullable)
8. Criar 5 DTOs novos
9. Expandir ModalidadesService (CRUD de níveis + graduação)
10. Expandir ModalidadesController (novos endpoints)
11. Ajuste mínimo em PresencaService (contar presença por modalidade)
12. Ajuste mínimo em AulaService (aceitar modalidade_id)
13. **Teste:** Testar todos os endpoints com Muay Thai/Boxe mockados

### FASE 3 — Frontend ⏱️ ~4-5 dias
14. Criar 5 componentes de modalidade
15. Criar página `/modalidades` completa (CRUD + graduação + templates)
16. Adicionar seção de modalidades em `/alunos/[id]`
17. Ajuste mínimo em aulas/turmas (campo modalidade opcional)
18. Ajuste mínimo em competições (campo modalidade opcional)
19. Cards de métricas por modalidade no dashboard
20. **Teste:** Fluxo completo: criar modalidade → matricular aluno → presença → graduar

**Total estimado: ~8-10 dias úteis**

---

## 12. Riscos e Pontos de Atenção

| # | Risco | Probabilidade | Mitigação |
|---|-------|--------------|-----------|
| 1 | Quebrar o BJJ | 🟢 **Nula** | Não mexemos em nenhuma tabela/entity do BJJ |
| 2 | Presença contando errado | 🟡 Baixa | Lógica simples: if `aula.modalidade_id` → conta pra modalidade; else → conta pra BJJ |
| 3 | Confusão na UI (BJJ vs outras) | 🟡 Baixa | Separação clara: `/graduacao` = BJJ, `/modalidades` = resto |
| 4 | Performance | 🟢 Nula | Tabelas novas com índices, sem JOINs extras nas queries existentes |
| 5 | Template de graduação incorreto | 🟢 Nula | Templates são editáveis, apenas ponto de partida |
| 6 | Aluno em 3+ modalidades | 🟢 Nula | Estrutura N:N já suporta |

---

## 13. Comparação: Abordagem Anterior vs. Nova

| Critério | Abordagem anterior (refatorar tudo) | Abordagem nova (sistema paralelo) |
|----------|-------------------------------------|----------------------------------|
| **Risco de regressão** | 🔴 Alto | 🟢 Zero |
| **Tempo estimado** | 14-18 dias | **8-10 dias** |
| **Arquivos alterados do BJJ** | ~45 | **0** |
| **Complexidade** | 🔴 Alta | 🟡 Média |
| **Tabelas existentes modificadas** | 10 ALTERs + migração de dados | 4 ALTERs (nullable only) |
| **Precisa migrar dados?** | Sim, complexo | **Não** |
| **Telas refatoradas** | 7 | **3 (ajustes mínimos)** |
| **Testabilidade** | Difícil (regressão em tudo) | Fácil (novo código isolado) |

---

## 14. Futuro — Unificação (v2, quando quiser)

Se no futuro quiser unificar BJJ com o sistema genérico:
1. Criar `modalidade_niveis` para BJJ espelhando `faixa_def`
2. Migrar `aluno_faixa` → `aluno_modalidade_graduacao`
3. Deprecar módulo `graduacao/` em favor de `/modalidades`
4. Refatorar frontend

Mas isso é **opcional** e pode ser feito com calma, sem pressão. O sistema paralelo funciona perfeitamente enquanto isso.

---

## 15. Próximos Passos

- [ ] Confirmar abordagem (sistema paralelo)
- [ ] Definir quais modalidades criar primeiro (Muay Thai + Boxe sugeridos)
- [ ] Criar branch `feature/multi-modalidades`
- [ ] Iniciar FASE 1 (migrations de banco)
- [ ] Implementar FASE 2 (backend)
- [ ] Implementar FASE 3 (frontend)
