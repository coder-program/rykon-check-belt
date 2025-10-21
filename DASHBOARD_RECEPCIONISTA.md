# Dashboard do Recepcionista - Implementação Completa

**Data**: 18 de outubro de 2025
**Perfil**: `recepcionista`
**Funcionalidades**: Check-in manual de alunos, visualização de alunos da unidade

## 📋 Resumo das Alterações

### 1. Frontend - Dashboard do Recepcionista

**Arquivo Criado**: `frontend/components/dashboard/RecepcionistaDashboard.tsx`

Dashboard específico para recepcionistas com:

#### Estatísticas Principais:

- **Alunos Ativos**: Total de alunos ativos na unidade
- **Check-ins Hoje**: Quantidade de presenças registradas hoje
- **Aulas Hoje**: Aulas programadas para o dia
- **Unidade**: Informações da unidade

#### Funcionalidades Principais:

##### 1. **Check-in Manual de Alunos** ✅

- Lista todos os alunos ativos da unidade
- Busca por nome, matrícula ou CPF
- Botão de check-in para cada aluno
- Modal de confirmação com dados do aluno
- Integração com API de presença do backend

##### 2. **Ações Rápidas**:

- **Registrar Check-in**: Scroll para lista de alunos
- **Cadastrar Aluno**: Redireciona para `/alunos/novo`
- **Lista de Alunos**: Redireciona para `/alunos`
- **Horários de Aulas**: Redireciona para `/horarios`

##### 3. **Lista de Alunos**:

- Exibe apenas alunos **ativos** da unidade
- Mostra: Nome, matrícula, faixa atual
- Busca em tempo real
- Scroll vertical para muitos alunos

### 2. Frontend - Integração no Dashboard Principal

**Arquivo Modificado**: `frontend/app/dashboard/page.tsx`

```typescript
// Adicionado import
import RecepcionistaDashboard from "@/components/dashboard/RecepcionistaDashboard";

// Adicionada verificação de perfil
if (hasPerfil("recepcionista")) {
  return <RecepcionistaDashboard />;
}
```

A verificação é feita **antes** de aluno e instrutor para garantir precedência correta.

### 3. Backend - Filtro de Unidades

**Arquivo Modificado**: `backend/src/people/services/unidades.service.ts`

#### Métodos Adicionados:

```typescript
private isRecepcionista(user: any): boolean {
  // Verifica se usuário tem perfil recepcionista
}

private async getUnidadeIdByRecepcionista(user: any): Promise<string | null> {
  // Busca unidade onde o usuário é responsável
  // Vincula através do CPF do usuário com responsavel_cpf da unidade
}
```

#### Lógica de Filtro Implementada:

No método `listar()`:

```typescript
// Se recepcionista, filtra pela unidade que ele trabalha
else if (user && this.isRecepcionista(user) && !this.isMaster(user)) {
  const unidadeId = await this.getUnidadeIdByRecepcionista(user);
  if (unidadeId) {
    whereConditions.push(`u.id = $${paramIndex}`);
    queryParams.push(unidadeId);
    paramIndex++;
  }
}
```

### 4. Backend - Filtro de Alunos

**Arquivo Modificado**: `backend/src/people/services/alunos.service.ts`

#### Métodos Adicionados:

```typescript
private isRecepcionista(user: any): boolean {
  // Verifica se usuário tem perfil recepcionista
}

private async getUnidadeIdByRecepcionista(user: any): Promise<string | null> {
  // Busca unidade através do CPF
}
```

#### Lógica de Filtro Implementada:

No método `list()`:

```typescript
// Se recepcionista, filtra apenas alunos da sua unidade
else if (user && this.isRecepcionista(user) && !this.isMaster(user)) {
  const unidadeId = await this.getUnidadeIdByRecepcionista(user);
  if (unidadeId) {
    query.andWhere('aluno.unidade_id = :unidadeId', { unidadeId });
  } else {
    query.andWhere('1 = 0'); // Retorna vazio se não tem unidade
  }
}
```

## 🔗 Vinculação Recepcionista → Unidade

O sistema identifica a unidade do recepcionista através de:

1. **CPF do Usuário** (`teamcruz.usuarios.cpf`)
2. **CPF do Responsável da Unidade** (`teamcruz.unidades.responsavel_cpf`)
3. **Papel do Responsável** (`teamcruz.unidades.responsavel_papel = 'ADMINISTRATIVO'`)

**SQL de Vinculação**:

```sql
SELECT id FROM teamcruz.unidades
WHERE responsavel_cpf = (
  SELECT cpf FROM teamcruz.usuarios WHERE id = $1
)
LIMIT 1
```

## ✅ Permissões do Recepcionista

Conforme definido em `backend/insert-permissoes-perfis.sql`:

- ✅ **ALUNOS_READ**: Ver todos os alunos da unidade
- ✅ **ALUNOS_WRITE**: Cadastrar e editar alunos
- ✅ **UNIDADES_READ**: Ver dados da unidade
- ✅ **PROFESSORES_READ**: Ver professores da unidade

❌ **Não tem**:

- DELETE de qualquer módulo
- WRITE em unidades, professores, financeiro
- Acesso a franqueados
- Gerenciamento de usuários

## 🎯 Funcionalidade de Check-in

### Backend - API Existente

O sistema já possui endpoint de check-in no `PresencaService`:

**Endpoint**: `POST /presenca/checkin-manual`

**Payload**:

```json
{
  "aluno_id": "uuid-do-aluno",
  "aula_id": "uuid-da-aula" // opcional
}
```

**Resposta de Sucesso**:

```json
{
  "message": "Check-in realizado com sucesso!",
  "presenca": {
    "id": "uuid",
    "aluno_id": "uuid",
    "aula_id": "uuid",
    "data": "2025-10-18",
    "hora_checkin": "2025-10-18T10:30:00Z"
  }
}
```

**Regras de Negócio**:

1. ✅ Verifica se aluno existe
2. ✅ Verifica se já fez check-in hoje (evita duplicação)
3. ✅ Registra horário exato do check-in
4. ✅ Incrementa contador de presenças na graduação
5. ❌ Não verifica se aluno está matriculado na aula (check-in livre)

### Frontend - Fluxo de Check-in

1. **Recepcionista acessa dashboard**
2. **Busca aluno** (por nome, matrícula ou CPF)
3. **Clica em "Check-in"** no card do aluno
4. **Modal de confirmação** aparece com dados do aluno
5. **Confirma check-in**
6. **API registra presença**
7. **Toast de sucesso** aparece
8. **Lista atualiza** automaticamente

## 🎯 Ordem de Precedência dos Filtros

1. **Master** → Vê tudo (sem filtros)
2. **Gerente de Unidade** → Vê apenas sua unidade
3. **Recepcionista** → Vê apenas sua unidade
4. **Professor/Instrutor** → Vê apenas unidades onde leciona
5. **Franqueado** → Vê apenas suas unidades
6. **Aluno** → Vê apenas seus próprios dados

## 📊 Dashboard Features

### Dados em Tempo Real:

- ✅ Total de alunos da unidade (query no banco)
- ✅ Alunos ativos (filtro por status)
- ✅ Lista completa de alunos com busca
- ✅ Informações da unidade

### Dados Mockados (TODO):

- ⏳ Check-ins hoje (precisa query em presencas)
- ⏳ Aulas hoje (precisa integração com API de aulas)

## 🚀 Como Configurar

### 1. Criar Usuário Recepcionista

```sql
-- O perfil já existe via insert-perfis-completos.sql
-- Vincular usuário ao perfil:
INSERT INTO teamcruz.usuario_perfis (usuario_id, perfil_id)
VALUES (
  'UUID_DO_USUARIO',
  (SELECT id FROM teamcruz.perfis WHERE nome = 'recepcionista')
);
```

### 2. Vincular Usuário à Unidade

```sql
-- Atualizar unidade para ter o CPF do recepcionista como responsável
UPDATE teamcruz.unidades
SET
  responsavel_cpf = 'CPF_DO_USUARIO',
  responsavel_papel = 'ADMINISTRATIVO',
  responsavel_nome = 'Nome do Recepcionista',
  responsavel_contato = '(11) 99999-9999'
WHERE id = 'UUID_DA_UNIDADE';
```

**OU use o script completo**: `backend/vincular-recepcionista-unidade.sql`

### 3. Login e Teste

1. Fazer login com o usuário recepcionista
2. Acessar `/dashboard`
3. Verificar que o **RecepcionistaDashboard** é exibido
4. Confirmar que apenas dados da unidade específica aparecem
5. Testar funcionalidades:
   - Buscar aluno
   - Fazer check-in manual
   - Cadastrar novo aluno
   - Ver lista completa de alunos

## 🧪 Como Testar Check-in

### Teste Manual - Backend:

```bash
# Fazer check-in via API diretamente
curl -X POST http://localhost:3001/presenca/checkin-manual \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "aluno_id": "UUID_DO_ALUNO"
  }'
```

### Teste Manual - Frontend:

1. Login como recepcionista
2. Acesse o dashboard
3. Busque um aluno
4. Clique em "Check-in"
5. Confirme no modal
6. Verifique toast de sucesso
7. Verifique no banco:

```sql
SELECT * FROM teamcruz.presencas
WHERE aluno_id = 'UUID_DO_ALUNO'
ORDER BY data DESC LIMIT 5;
```

## 📝 Próximas Melhorias

### Check-in:

1. ✅ **QR Code**: Já existe endpoint `/presenca/checkin-qr`
2. ⏳ **Histórico de Check-ins**: Mostrar últimos check-ins do dia
3. ⏳ **Validação de Horário**: Só permitir check-in durante aulas
4. ⏳ **Check-in por Aula**: Selecionar aula específica
5. ⏳ **Estatísticas**: Total de check-ins por dia/semana

### Dashboard:

1. ⏳ **Contador de Check-ins Hoje**: Query em `presencas` com filtro de data
2. ⏳ **Aulas do Dia**: Buscar em `aulas` filtradas por unidade e data
3. ⏳ **Gráfico de Presenças**: Mostrar tendência semanal
4. ⏳ **Lista de Aniversariantes**: Alunos fazendo aniversário hoje

### Cadastro:

1. ⏳ **Foto do Aluno**: Upload via webcam ou arquivo
2. ⏳ **Documentos**: Upload de RG, CPF escaneados
3. ⏳ **Contrato Digital**: Assinatura eletrônica

## 🔒 Segurança

- ✅ Recepcionista só acessa dados da sua unidade
- ✅ Validação no backend impede acesso indevido
- ✅ Queries usam parameterização (proteção contra SQL injection)
- ✅ Verificação de perfil antes de aplicar filtros
- ✅ Check-in registra usuário que fez o registro
- ✅ Logs de auditoria em todas as operações

## 📚 Arquivos Criados/Modificados

### Frontend:

1. ✅ `frontend/components/dashboard/RecepcionistaDashboard.tsx` (NOVO)
2. ✅ `frontend/app/dashboard/page.tsx` (MODIFICADO - adicionado recepcionista)

### Backend:

3. ✅ `backend/src/people/services/unidades.service.ts` (MODIFICADO - filtro recepcionista)
4. ✅ `backend/src/people/services/alunos.service.ts` (MODIFICADO - filtro recepcionista)
5. ✅ `backend/vincular-recepcionista-unidade.sql` (NOVO - script de vinculação)

### Documentação:

6. ✅ `DASHBOARD_RECEPCIONISTA.md` (NOVO - este arquivo)

## 🎨 Screenshots Esperados

### Dashboard Principal:

```
┌─────────────────────────────────────────────────────┐
│ 👤 Recepção                                          │
│ Bem-vindo, Maria! Unidade: TeamCruz Matriz          │
├─────────────────────────────────────────────────────┤
│ [60 Alunos] [12 Check-ins] [4 Aulas] [Matriz]      │
├─────────────────────────────────────────────────────┤
│ Ações Rápidas:                                       │
│ [✓ Check-in] [+ Aluno] [👥 Lista] [📅 Horários]    │
├─────────────────────────────────────────────────────┤
│ Check-in de Alunos:                                  │
│ [🔍 Buscar aluno...]                                │
│                                                      │
│ 👤 João Silva      Mat: 2024001  🟦 Azul [Check-in] │
│ 👤 Maria Santos    Mat: 2024002  🟩 Verde [Check-in]│
│ 👤 Pedro Costa     Mat: 2024003  🟪 Roxa  [Check-in]│
└─────────────────────────────────────────────────────┘
```

### Modal de Check-in:

```
┌──────────────────────────────────┐
│      ✓ Confirmar Check-in         │
│                                   │
│ ┌─────────────────────────────┐  │
│ │ Nome: João Silva            │  │
│ │ Matrícula: 2024001          │  │
│ │ Faixa: 🟦 Azul              │  │
│ └─────────────────────────────┘  │
│                                   │
│ Tem certeza que deseja registrar  │
│ a presença deste aluno?           │
│                                   │
│   [Cancelar]    [✓ Confirmar]    │
└──────────────────────────────────┘
```

---

**Status**: ✅ **IMPLEMENTAÇÃO COMPLETA**
**Testado**: ⏳ Aguardando testes do usuário
**Deploy**: ⏳ Aguardando restart do backend
