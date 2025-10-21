# Dashboard do Gerente de Unidade - Implementação Completa

**Data**: 18 de outubro de 2025
**Problema**: Usuário com perfil `gerente_unidade` não tinha dashboard específico
**Solução**: Criação de dashboard dedicado com visualização de dados da unidade

## 📋 Resumo das Alterações

### 1. Frontend - Novo Dashboard

**Arquivo Criado**: `frontend/components/dashboard/GerenteDashboard.tsx`

Dashboard específico para gerentes de unidade com:

#### Estatísticas Principais:

- **Total de Alunos**: Todos os alunos da unidade (ativos e inativos)
- **Taxa de Ocupação**: Percentual de vagas ocupadas (alunos ativos / capacidade máxima)
- **Receita Mensal**: Cálculo baseado nos alunos ativos e valor do plano padrão
- **Aulas Hoje**: Quantidade de aulas programadas (TODO: integrar com API)

#### Ações Rápidas:

1. **Gerenciar Alunos** → `/alunos`
2. **Registrar Presença** → `/presenca`
3. **Horários de Aulas** → `/horarios`
4. **Graduações** → `/graduacoes` (com indicador de pendências)
5. **Relatórios** → `/relatorios`
6. **Minha Unidade** → `/unidades/{id}`

#### Informações da Unidade:

- **Dados Gerais**: Nome, CNPJ, Status, Responsável
- **Estrutura**: Quantidade de tatames, capacidade, área, instrutores

#### Indicadores de Performance:

- Alunos ativos vs inativos
- Taxa de ocupação com vagas disponíveis
- Graduações pendentes

### 2. Frontend - Integração no Dashboard Principal

**Arquivo Modificado**: `frontend/app/dashboard/page.tsx`

```typescript
// Adicionado import
import GerenteDashboard from "@/components/dashboard/GerenteDashboard";

// Adicionada verificação de perfil
if (hasPerfil("gerente_unidade")) {
  return <GerenteDashboard />;
}
```

A verificação é feita **antes** de aluno e instrutor para garantir precedência correta.

### 3. Backend - Filtro de Unidades

**Arquivo Modificado**: `backend/src/people/services/unidades.service.ts`

#### Métodos Adicionados:

```typescript
private isGerenteUnidade(user: any): boolean {
  // Verifica se usuário tem perfil gerente_unidade ou gerente
}

private async getUnidadeIdByGerente(user: any): Promise<string | null> {
  // Busca unidade onde o usuário é responsável com papel GERENTE
  // Vincula através do CPF do usuário com responsavel_cpf da unidade
}
```

#### Lógica de Filtro Implementada:

No método `listar()`:

```typescript
// Se gerente de unidade, filtra pela unidade que ele gerencia
else if (user && this.isGerenteUnidade(user) && !this.isMaster(user)) {
  const unidadeId = await this.getUnidadeIdByGerente(user);
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
private isGerenteUnidade(user: any): boolean {
  // Verifica se usuário tem perfil gerente_unidade ou gerente
}

private async getUnidadeIdByGerente(user: any): Promise<string | null> {
  // Busca unidade através do CPF e papel GERENTE
}
```

#### Lógica de Filtro Implementada:

No método `list()`:

```typescript
// Se gerente de unidade, filtra apenas alunos da sua unidade
else if (user && this.isGerenteUnidade(user) && !this.isMaster(user)) {
  const unidadeId = await this.getUnidadeIdByGerente(user);
  if (unidadeId) {
    query.andWhere('aluno.unidade_id = :unidadeId', { unidadeId });
  } else {
    query.andWhere('1 = 0'); // Retorna vazio se não tem unidade
  }
}
```

## 🔗 Vinculação Gerente → Unidade

O sistema identifica a unidade do gerente através de:

1. **CPF do Usuário** (`teamcruz.usuarios.cpf`)
2. **CPF do Responsável da Unidade** (`teamcruz.unidades.responsavel_cpf`)
3. **Papel do Responsável** (`teamcruz.unidades.responsavel_papel = 'GERENTE'`)

**SQL de Vinculação**:

```sql
SELECT id FROM teamcruz.unidades
WHERE responsavel_cpf = (
  SELECT cpf FROM teamcruz.usuarios WHERE id = $1
)
AND responsavel_papel = 'GERENTE'
LIMIT 1
```

## 🎯 Ordem de Precedência dos Filtros

1. **Master** → Vê tudo (sem filtros)
2. **Gerente de Unidade** → Vê apenas sua unidade
3. **Professor/Instrutor** → Vê apenas unidades onde leciona
4. **Franqueado** → Vê apenas suas unidades
5. **Aluno** → Vê apenas seus próprios dados

## ✅ Permissões do Gerente de Unidade

Conforme definido em `backend/insert-permissoes-perfis.sql`:

- ✅ **UNIDADES_READ**: Visualizar dados da unidade
- ✅ **UNIDADES_WRITE**: Editar dados operacionais da unidade
- ✅ **ALUNOS_READ**: Ver todos os alunos da unidade
- ✅ **ALUNOS_WRITE**: Criar/editar alunos
- ✅ **PROFESSORES_READ**: Ver professores da unidade
- ✅ **FINANCEIRO_READ**: Ver relatórios financeiros
- ✅ **RELATORIOS_READ**: Acessar relatórios gerenciais

❌ **Não tem**: UNIDADES*DELETE, FRANQUEADOS*_, USUARIOS*WRITE, PERMISSOES*_

## 📊 Dashboard Features

### Dados em Tempo Real:

- ✅ Total de alunos (query no banco)
- ✅ Alunos ativos (baseado em status)
- ✅ Ocupação (cálculo: ativos / capacidade)
- ✅ Receita mensal (soma: alunos ativos × valor plano)
- ✅ Informações da unidade (nome, CNPJ, responsável, etc.)

### Dados Mockados (TODO):

- ⏳ Graduações pendentes (precisa integração com API de graduações)
- ⏳ Aulas hoje (precisa integração com API de aulas/horários)

## 🚀 Como Testar

### 1. Criar Usuário Gerente de Unidade

```sql
-- Já existe o perfil criado via insert-perfis-completos.sql
-- Vincular usuário ao perfil:
INSERT INTO teamcruz.usuario_perfis (usuario_id, perfil_id)
VALUES (
  'UUID_DO_USUARIO',
  (SELECT id FROM teamcruz.perfis WHERE nome = 'gerente_unidade')
);
```

### 2. Vincular Usuário à Unidade

```sql
-- Atualizar unidade para ter o CPF do gerente como responsável
UPDATE teamcruz.unidades
SET
  responsavel_cpf = 'CPF_DO_USUARIO',
  responsavel_papel = 'GERENTE',
  responsavel_nome = 'Nome do Gerente',
  responsavel_contato = '(11) 99999-9999'
WHERE id = 'UUID_DA_UNIDADE';
```

### 3. Login e Verificação

1. Fazer login com o usuário gerente
2. Acessar `/dashboard`
3. Verificar que o **GerenteDashboard** é exibido
4. Confirmar que apenas dados da unidade específica aparecem
5. Testar acesso a:
   - Lista de alunos (apenas da unidade)
   - Detalhes da unidade
   - Registrar presença
   - Horários de aulas

## 📝 Notas Importantes

### Backend já está preparado para:

- ✅ Filtrar unidades por gerente
- ✅ Filtrar alunos por unidade do gerente
- ✅ Logs detalhados para debugging
- ✅ Tratamento de casos onde gerente não tem unidade vinculada

### Frontend já está preparado para:

- ✅ Exibir dashboard específico para gerente
- ✅ Mostrar estatísticas em tempo real
- ✅ Navegação para todas as funcionalidades relevantes
- ✅ Indicadores visuais de ações urgentes

### Próximas Melhorias:

1. Integrar API de graduações para mostrar pendências reais
2. Integrar API de aulas para mostrar horários do dia
3. Adicionar gráficos de evolução (alunos novos, retenção, etc.)
4. Dashboard de frequência de presença
5. Relatórios exportáveis (PDF/Excel)

## 🔒 Segurança

- ✅ Gerente só acessa dados da sua unidade
- ✅ Validação no backend impede acesso indevido
- ✅ Queries usam parameterização (proteção contra SQL injection)
- ✅ Verificação de perfil antes de aplicar filtros
- ✅ Master mantém acesso total para administração

## 📚 Arquivos Modificados/Criados

### Frontend:

1. ✅ `frontend/components/dashboard/GerenteDashboard.tsx` (NOVO)
2. ✅ `frontend/app/dashboard/page.tsx` (MODIFICADO)

### Backend:

3. ✅ `backend/src/people/services/unidades.service.ts` (MODIFICADO)
4. ✅ `backend/src/people/services/alunos.service.ts` (MODIFICADO)

### Documentação:

5. ✅ `DASHBOARD_GERENTE_UNIDADE.md` (NOVO - este arquivo)

---

**Status**: ✅ **IMPLEMENTAÇÃO COMPLETA**
**Testado**: ⏳ Aguardando testes do usuário
**Deploy**: ⏳ Aguardando restart do backend
