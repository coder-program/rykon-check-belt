# 🎓 Sistema de Aprovação de Graduação - TeamCruz

## 📋 Visão Geral

Sistema completo de parametrização e aprovação de graduações com filtros por perfil de usuário.

---

## ✅ BACKEND - Implementado

### 1. Database

**Arquivo:** `backend/create-graduacao-parametros.sql`

**Tabelas Criadas:**

- ✅ `graduacao_parametros` - Parametrização de períodos de graduação
  - Campos: nome, descricao, data_inicio, data_fim, tipo_periodo, graus_minimos, presencas_minimas
  - Tipos: MEIO_ANO, FIM_ANO, ESPECIAL
  - Suporte a unidade específica ou todas unidades

**Tabela Modificada:**

- ✅ `aluno_graduacao` - Adicionados campos:
  - `parametro_id` - Vincula à parametrização
  - `solicitado_em` - Data da solicitação
  - `observacao_aprovacao` - Observação do aprovador

**Views:**

- ✅ `v_alunos_aptos_graduacao` - Lista alunos aptos com todos critérios
- ✅ `fn_verificar_aluno_apto_graduacao()` - Function para verificar se aluno está apto

**Dados Iniciais:**

- ✅ Parâmetros para Meio do Ano 2025 (Junho)
- ✅ Parâmetros para Fim do Ano 2025 (Dezembro)

### 2. Entities

**Arquivo:** `backend/src/people/entities/graduacao-parametro.entity.ts`

- ✅ Entity TypeORM completa
- ✅ Enum TipoPeriodoGraduacao
- ✅ Relacionamentos com Unidade

**Arquivo:** `backend/src/graduacao/entities/aluno-graduacao.entity.ts`

- ✅ Campos adicionados: parametro_id, solicitado_em, observacao_aprovacao

### 3. DTOs

**Arquivo:** `backend/src/people/dto/graduacao-parametro.dto.ts`

- ✅ CreateGraduacaoParametroDto
- ✅ UpdateGraduacaoParametroDto
- ✅ AprovarGraduacaoDto
- ✅ SolicitarGraduacaoDto

### 4. Services

**Arquivo:** `backend/src/graduacao/graduacao-parametros.service.ts`

**Métodos Implementados:**

- ✅ `create()` - Criar novo parâmetro
- ✅ `findAll()` - Listar parâmetros (com filtro de unidade)
- ✅ `findOne()` - Buscar um parâmetro
- ✅ `update()` - Atualizar parâmetro
- ✅ `remove()` - Desativar parâmetro
- ✅ `getAlunosAptosGraduacao()` - **PRINCIPAL** - Lista alunos aptos com filtros
- ✅ `solicitarGraduacao()` - Criar solicitação
- ✅ `aprovarGraduacao()` - Aprovar graduação
- ✅ `reprovarGraduacao()` - Reprovar graduação

**Filtros Implementados:**

```typescript
// Critérios de aprovação
- graus_atual >= graus_minimos (padrão 4)
- presencas_total_fx >= presencas_minimas (padrão 160)
- dt_inicio <= 6 meses atrás
- faixa != PRETA (faixa preta tem regras especiais)

// Filtros por perfil
- Recepcionista: apenas suas unidades (via recepcionista_unidades)
- Gerente Unidade: apenas sua unidade
- Franqueado: unidades do franqueado
- Master/Admin: todas unidades
```

### 5. Controllers

**Arquivo:** `backend/src/people/controllers/graduacao-parametros.controller.ts`

**Endpoints:**

| Método | Rota                                                | Descrição               |
| ------ | --------------------------------------------------- | ----------------------- |
| POST   | `/graduacao-parametros`                             | Criar parâmetro         |
| GET    | `/graduacao-parametros`                             | Listar parâmetros       |
| GET    | `/graduacao-parametros/:id`                         | Buscar parâmetro        |
| PUT    | `/graduacao-parametros/:id`                         | Atualizar parâmetro     |
| DELETE | `/graduacao-parametros/:id`                         | Desativar parâmetro     |
| GET    | `/graduacao-parametros/alunos-aptos/:parametro_id?` | **Listar alunos aptos** |
| POST   | `/graduacao-parametros/solicitar`                   | Solicitar graduação     |
| POST   | `/graduacao-parametros/aprovar`                     | Aprovar graduação       |
| POST   | `/graduacao-parametros/reprovar/:id`                | Reprovar graduação      |

### 6. Module

**Arquivo:** `backend/src/graduacao/graduacao.module.ts`

- ✅ GraduacaoParametro entity registrada
- ✅ GraduacaoParametrosService registrado
- ✅ GraduacaoParametrosController registrado
- ✅ PeopleModule importado (para RecepcionistaUnidadesService)

---

## ⏳ FRONTEND - A IMPLEMENTAR

### 1. Página de Parâmetros (Admin)

**Rota:** `/admin/parametros-graduacao`

**Funcionalidades:**

- [ ] Listar todos os parâmetros
- [ ] Criar novo parâmetro (Meio Ano, Fim Ano, Especial)
- [ ] Editar parâmetro existente
- [ ] Desativar parâmetro
- [ ] Filtrar por tipo de período

**Campos do Formulário:**

- Nome (ex: "Graduação Meio do Ano 2025")
- Descrição
- Data Início
- Data Fim
- Tipo Período (dropdown: MEIO_ANO, FIM_ANO, ESPECIAL)
- Graus Mínimos (number, default 4)
- Presenças Mínimas (number, default 160)
- Unidade (opcional - se vazio, vale para todas)
- Ativo (checkbox)

### 2. Página de Aprovação de Graduações

**Rota:** `/admin/sistema-graduacao` (EXISTENTE - modificar)

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 🎓 Sistema de Aprovação de Graduações                           │
├─────────────────────────────────────────────────────────────────┤
│ Filtros:                                                        │
│ [▼ Selecione o Período] [▼ Todas Unidades] [🔄 Atualizar]    │
│                                                                 │
│ Período Ativo: Graduação Fim do Ano 2025                       │
│ Data: 01/12/2025 a 31/12/2025                                  │
│ Critérios: Mínimo 4 graus | Mínimo 160 presenças              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Alunos Aptos para Graduação (23)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ 👤 João Silva                    [✓ Aprovar] [✗ Reprovar] │ │
│ │ 📍 TeamCruz Matriz                                         │ │
│ │                                                            │ │
│ │ Faixa Atual: 🟦 AZUL (4 graus) → 🟪 ROXA                  │ │
│ │ Presenças: 175 aulas (✓ Suficiente)                       │ │
│ │ Tempo na faixa: 8 meses (✓ Cumpriu mínimo)                │ │
│ │ Status: ⏳ Aguardando aprovação                            │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ 👤 Maria Santos                  ✅ APROVADA               │ │
│ │ 📍 TeamCruz Filial                                         │ │
│ │                                                            │ │
│ │ Faixa Atual: ⚪ BRANCA (4 graus) → 🟦 AZUL                 │ │
│ │ Presenças: 165 aulas (✓ Suficiente)                       │ │
│ │ Aprovado por: Prof. Carlos em 15/12/2025                  │ │
│ │ Obs: Excelente evolução técnica                           │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Funcionalidades:**

- [ ] Dropdown de seleção de período (busca via API)
- [ ] Dropdown de unidade (se admin/master)
- [ ] Lista de alunos aptos (card por aluno)
- [ ] Mostrar faixa atual e próxima faixa
- [ ] Indicadores visuais (graus, presenças, tempo)
- [ ] Botão "Aprovar" com modal de confirmação
- [ ] Botão "Reprovar" com campo de observação
- [ ] Status da aprovação (Pendente, Aprovada, Reprovada)
- [ ] Filtro por status

**Modal de Aprovação:**

```
┌─────────────────────────────────────────┐
│ Aprovar Graduação                       │
├─────────────────────────────────────────┤
│ Aluno: João Silva                       │
│ De: Faixa Azul → Para: Faixa Roxa      │
│                                         │
│ Observações (opcional):                 │
│ [____________________________________]  │
│ [____________________________________]  │
│                                         │
│        [Cancelar]  [✓ Confirmar]       │
└─────────────────────────────────────────┘
```

### 3. Componentes React

**`components/graduacao/ParametrosManager.tsx`**

- [ ] Gerenciamento de parâmetros (CRUD)

**`components/graduacao/AlunosAptosGraduacao.tsx`**

- [ ] Lista de alunos aptos
- [ ] Cards com informações do aluno
- [ ] Botões de aprovação/reprovação

**`components/graduacao/AlunoGraduacaoCard.tsx`**

- [ ] Card individual do aluno
- [ ] Badges de status
- [ ] Indicadores visuais

**`components/graduacao/ModalAprovar.tsx`**

- [ ] Modal de confirmação de aprovação

**`components/graduacao/ModalReprovar.tsx`**

- [ ] Modal com campo de observação

### 4. API Hooks (React Query)

```typescript
// hooks/useGraduacaoParametros.ts
const useParametros = () => useQuery(["parametros"], fetchParametros);
const useCreateParametro = () => useMutation(createParametro);
const useUpdateParametro = () => useMutation(updateParametro);

// hooks/useAlunosAptos.ts
const useAlunosAptos = (parametroId) =>
  useQuery(["alunos-aptos", parametroId], () => fetchAlunosAptos(parametroId));

// hooks/useAprovarGraduacao.ts
const useAprovar = () => useMutation(aprovarGraduacao);
const useReprovar = () => useMutation(reprovarGraduacao);
```

---

## 🔒 Controle de Acesso

### Regras por Perfil:

| Perfil              | Vê Unidades   | Pode Aprovar | Pode Criar Parâmetros |
| ------------------- | ------------- | ------------ | --------------------- |
| **master**          | Todas         | ✅ Sim       | ✅ Sim                |
| **admin**           | Todas         | ✅ Sim       | ✅ Sim                |
| **franqueado**      | Suas unidades | ✅ Sim       | ❌ Não                |
| **gerente_unidade** | Sua unidade   | ✅ Sim       | ❌ Não                |
| **recepcionista**   | Suas unidades | ❌ Não       | ❌ Não                |
| **professor**       | Sua unidade   | ✅ Sim       | ❌ Não                |
| **aluno**           | -             | ❌ Não       | ❌ Não                |

---

## 🚀 Como Testar

### 1. Executar Migration

```bash
cd backend
sudo -u postgres psql -d teamcruz_db -f create-graduacao-parametros.sql
```

### 2. Reiniciar Backend

```bash
npm run build
pm2 restart teamcruz-backend
```

### 3. Testar Endpoints

**Listar parâmetros:**

```bash
GET http://200.98.72.161/api/graduacao-parametros
```

**Listar alunos aptos:**

```bash
GET http://200.98.72.161/api/graduacao-parametros/alunos-aptos
```

**Aprovar graduação:**

```bash
POST http://200.98.72.161/api/graduacao-parametros/aprovar
Body: {
  "aluno_id": "uuid-do-aluno",
  "faixa_origem_id": "uuid-faixa-atual",
  "faixa_destino_id": "uuid-proxima-faixa",
  "parametro_id": "uuid-parametro",
  "observacao_aprovacao": "Aprovado por bom desempenho"
}
```

---

## 📝 Próximos Passos

1. ✅ Backend completo implementado
2. ⏳ Executar migration no servidor
3. ⏳ Criar página frontend `/admin/sistema-graduacao`
4. ⏳ Implementar componentes React
5. ⏳ Testar fluxo completo
6. ⏳ Deploy para produção

---

## 🎯 Resumo

### Backend: ✅ PRONTO

- Tabelas criadas
- Entities configuradas
- Services implementados
- Controllers com todos endpoints
- Filtros por perfil funcionando

### Frontend: ⏳ PENDENTE

- Precisa criar página de aprovação
- Precisa criar componentes
- Precisa integrar com API

**Pronto para implementar o frontend! 🚀**
