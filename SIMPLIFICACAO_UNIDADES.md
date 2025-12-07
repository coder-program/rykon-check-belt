# Simplificação do Cadastro de Unidades

**Data**: 10 de novembro de 2025
**Atualização**: 11 de novembro de 2025 - Removido também codigo_interno
**Objetivo**: Remover campos desnecessários do cadastro de unidades conforme solicitado pelo usuário

## Campos Removidos

### 1. Responsável pela Unidade (4 campos)

- **responsavel_nome** - Nome completo do responsável
- **responsavel_cpf** - CPF do responsável
- **responsavel_papel** - Papel (Proprietário, Gerente, Instrutor, Administrativo)
- **responsavel_contato** - Telefone/WhatsApp do responsável

### 2. Instrutor Principal (1 campo)

- **instrutor_principal_id** - ID do instrutor responsável técnico (faixa-preta)

### 3. Estrutura da Unidade (4 campos)

- **qtde_tatames** - Quantidade de tatames
- **area_tatame_m2** - Área do tatame em m²
- **capacidade_max_alunos** - Capacidade máxima de alunos
- **qtde_instrutores** - Quantidade de instrutores

### 4. Financeiro e Modalidades (2 campos)

- **valor_plano_padrao** - Valor do plano padrão
- **modalidades** - Array de modalidades oferecidas (JSONB)

### 5. Código Interno (1 campo) - **NOVO**

- **codigo_interno** - Código interno gerado automaticamente (agora removido)

**TOTAL: 12 campos removidos**

---

## 📋 Campos que Permaneceram

### Identificação

- franqueado_id, nome, cnpj, razao_social, nome_fantasia
- inscricao_estadual, inscricao_municipal

### Contato

- telefone_fixo, telefone_celular, email, website, redes_sociais

### Outros

- status, horarios_funcionamento, endereco_id
- created_at, updated_at

---

## 🔧 Arquivos Modificados

### Backend

#### 1. Entity (`backend/src/people/entities/unidade.entity.ts`)

- ✅ Removidos enums `PapelResponsavel` e `Modalidade`
- ✅ Removidos 12 campos da entity Unidade (incluindo codigo_interno)

#### 2. DTO (`backend/src/people/dto/unidades.dto.ts`)

- ✅ Removidos imports não utilizados
- ✅ Removidos 12 campos de `CreateUnidadeDto` (incluindo codigo_interno)
- ✅ Removidos 11 campos de `UpdateUnidadeDto`

#### 3. Service (`backend/src/people/services/unidades.service.ts`)

- ✅ Atualizada query SQL do método `criar()` (16 parâmetros → 15 parâmetros, removido codigo_interno)
- ✅ Atualizado método `formatarUnidade()` (removidos campos incluindo codigo_interno)
- ✅ Removido filtro por `responsavel_cpf` do método `listar()`
- ✅ Atualizado método `getUnidadeIdByGerente()` (retorna null, sem mais busca por CPF)
- ✅ Atualizado método `getUnidadeIdByRecepcionista()` (retorna null)

### Frontend

#### 4. Componente UnidadeForm (`frontend/components/unidades/UnidadeForm.tsx`)

- ✅ Removidos types `PapelResponsavel` e `Modalidade`
- ✅ Removidos 12 campos da interface `UnidadeFormData` (incluindo codigo_interno)
- ✅ Removido campo "Código Interno" do formulário
- ✅ Removida prop `instrutores` de `UnidadeFormProps`
- ✅ Removidas tabs "Responsável" (tab 3) e "Estrutura" (tab 4)
- ✅ Renomeada tab "Administração" de 5 para 3
- ✅ Removidas funções `modalidadesOptions` e `toggleModalidade()`
- ✅ Removidos imports não utilizados (User, Info, Users)
- ✅ Atualizado texto de "Requisitos" (removida menção a instrutor faixa-preta)

#### 5. Página de Unidades (`frontend/app/unidades/page.tsx`)

- ✅ Removidos types `PapelResponsavel` e `Modalidade`
- ✅ Removidos 12 campos da interface `UnidadeFormData` (incluindo codigo_interno)
- ✅ Removido codigo_interno de formData inicial, resetForm e handleEdit
- ✅ Removido import `listInstrutores`
- ✅ Removida query `instrutoresQuery`
- ✅ Removida prop `instrutores` do componente `<UnidadeForm />`
- ✅ Removidos campos desnecessários de `handleEdit()`
- ✅ Removidos campos desnecessários de `resetForm()`
- ✅ Removida limpeza de `responsavel_cpf` e `responsavel_contato` em `cleanedData`
- ✅ Atualizada listagem de unidades (removidos responsável_nome, responsavel_contato, capacidade, tatames)
- ✅ Adicionado display de cidade do endereço
- ✅ Removido import não utilizado (User)

#### 6. Página de Detalhes ([id]/page.tsx)

- ✅ Removida seção de exibição do "Código Interno"

### SQL

### SQL

#### 7. Script de Migração (`backend/simplificar-unidades.sql`)

- ✅ Criado script para remover 12 colunas da tabela `teamcruz.unidades` (incluindo codigo_interno)
- ⚠️ **IMPORTANTE**: Fazer backup antes de executar!
- 🔍 Script comenta possibilidade de remover ENUMs (verificar uso antes)

---

## 📊 Impacto

### Campos Removidos

- **Total**: 12 campos
- **Obrigatórios**: 4 (responsavel_nome, responsavel_cpf, responsavel_papel, responsavel_contato)
- **Opcionais**: 8 (instrutor_principal_id, qtde_tatames, area_tatame_m2, capacidade_max_alunos, qtde_instrutores, valor_plano_padrao, modalidades, codigo_interno)

### Código Reduzido

- **Backend**: ~220 linhas removidas
- **Frontend**: ~370 linhas removidas
- **Total**: ~590 linhas removidas

---

## ✅ Próximos Passos

1. **Rodar migração SQL**:

   ```bash
   psql -U postgres -d teamcruz -f backend/simplificar-unidades.sql
   ```

2. **Testar funcionalidades**:

   - ✅ Criar nova unidade
   - ✅ Editar unidade existente
   - ✅ Listar unidades
   - ✅ Visualizar detalhes da unidade

3. **Migrar dados existentes** (se necessário):
   - Dados dos campos removidos serão perdidos após executar a migração
   - Criar backup se houver necessidade de recuperar informações

---

## 🎯 Benefícios

- ✅ Formulário mais simples e rápido de preencher
- ✅ Menos campos obrigatórios
- ✅ Foco nas informações essenciais da unidade
- ✅ Código mais limpo e manutenível
- ✅ Menos validações e menos pontos de erro

---

## ⚠️ Atenção

- **Gerentes de Unidade**: Anteriormente identificados por `responsavel_cpf` com `responsavel_papel = 'GERENTE'`. Agora deve-se usar outra tabela de vínculo (ex: `gerente_unidades`)
- **Recepcionistas**: Já migrados para tabela `recepcionista_unidades` (não afetados)
- **Modalidades**: Serão implementadas como entidade separada com relacionamento many-to-many (próxima task)
