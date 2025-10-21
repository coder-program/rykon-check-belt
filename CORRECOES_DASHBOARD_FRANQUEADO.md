# Correções Dashboard Franqueado - Filtros e Dados Reais

## 🐛 Problema Identificado

O dashboard do franqueado estava mostrando **todas as unidades e todos os alunos** do sistema, não apenas os vinculados ao franqueado logado.

## ✅ Correções Implementadas

### 1. Backend - Filtro de Unidades

**Arquivo**: `backend/src/people/dto/unidades.dto.ts`

- ✅ Adicionado campo `franqueado_id` ao `UnidadeQueryDto`
- Permite filtrar unidades por ID do franqueado via query parameter

**Arquivo**: `backend/src/people/services/unidades.service.ts`

- ✅ Atualizado método `listar()` para aceitar parâmetro `franqueado_id`
- Prioridade de filtro:
  1. Se `franqueado_id` fornecido na query → usa ele
  2. Se usuário é FRANQUEADO (não MASTER) → usa o franqueado do usuário
  3. Se MASTER → mostra todas as unidades

### 2. Frontend - Dashboard do Franqueado

**Arquivo**: `frontend/components/dashboard/FranqueadoDashboard.tsx`

#### Query de Unidades

✅ **ANTES**: Buscava todas as unidades e filtrava no frontend

```typescript
listUnidades({ pageSize: 100 });
```

✅ **DEPOIS**: Filtra no backend usando o ID do franqueado

```typescript
listUnidades({
  pageSize: 100,
  franqueado_id: franqueado.id,
});
```

#### Query de Alunos

✅ **ANTES**: Buscava TODOS os 1000 alunos do sistema e filtrava no frontend

```typescript
listAlunos({ pageSize: 1000 });
// Depois: alunosData.items.filter(a => unidadeIds.includes(a.unidade_id))
```

✅ **DEPOIS**: Busca apenas alunos das unidades do franqueado

```typescript
// Para cada unidade do franqueado, busca seus alunos
Promise.all(
  unidadeIds.map((unidadeId) =>
    listAlunos({ pageSize: 1000, unidade_id: unidadeId })
  )
);
// Combina todos os resultados
```

#### Cálculo de Estatísticas

**Receita Mensal**
✅ **ANTES**: Valor fixo de R$ 350 por aluno

```typescript
receitaMensal: alunosDasFranquias.length * 350;
```

✅ **DEPOIS**: Usa o `valor_plano_padrao` de cada unidade

```typescript
receitaMensal: alunosDasFranquias.reduce((sum, aluno) => {
  const unidade = unidades.find((u) => u.id === aluno.unidade_id);
  const valorPlano = unidade?.valor_plano_padrao || 350;
  return sum + valorPlano;
}, 0);
```

**Alunos Ativos**
✅ **ANTES**: Verificava apenas campo `ativo`

```typescript
alunosAtivos: alunosDasFranquias.filter((a) => a.ativo).length;
```

✅ **DEPOIS**: Verifica `status === "ATIVO"` ou campo `ativo`

```typescript
alunosAtivos: alunosDasFranquias.filter((a) => a.status === "ATIVO" || a.ativo)
  .length;
```

## 🎯 Resultado Esperado

Agora quando um usuário com perfil FRANQUEADO faz login:

1. ✅ Dashboard mostra apenas **suas unidades** (baseado em `franqueado.id`)
2. ✅ Dashboard mostra apenas **alunos dessas unidades**
3. ✅ Estatísticas calculadas com dados reais:
   - Total de unidades do franqueado
   - Total de alunos das unidades
   - Receita mensal baseada no valor de cada plano
   - Alunos ativos (status ATIVO)
   - Total de professores/instrutores

## 🔄 Fluxo de Dados

```
1. Usuário faz login com perfil FRANQUEADO
   ↓
2. GET /franqueados/me
   → Retorna franqueado vinculado ao usuario_id
   ↓
3. GET /unidades?franqueado_id={franqueado.id}
   → Retorna apenas unidades desse franqueado
   ↓
4. Para cada unidade:
   GET /alunos?unidade_id={unidade.id}
   → Retorna alunos da unidade
   ↓
5. Combina dados e calcula estatísticas
```

## 📊 Exemplo de Dados Corretos

### Franqueado: TeamCruz Rio de Janeiro

- **ID**: `4fb0aea4-8ff9-4a47-ad43-f229d1d42f4d`
- **Unidades vinculadas**: 2
  - TeamCruz RJ - Unidade Barra da Tijuca (150 alunos)
  - TeamCruz RJ - Unidade Copacabana (90 alunos)
- **Total Alunos**: 240 (não 390!)
- **Receita Mensal**: R$ 84.000 (240 alunos × R$ 350)

### Franqueado: TeamCruz Matriz São Paulo

- **ID**: `08c0f32e-e77d-4578-8074-eac11d4625c6`
- **Unidades vinculadas**: 3
  - TeamCruz SP - Unidade Moema (80 alunos)
  - TeamCruz SP - Unidade Pinheiros (120 alunos)
  - team1 (0 alunos - inativa)
- **Total Alunos**: 200 (não 390!)
- **Receita Mensal**: R$ 70.000

## 🧪 Como Testar

### Teste 1: Verificar Filtro de Unidades

```bash
# Como FRANQUEADO (com token JWT)
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3001/api/franqueados/me"
# Pegar o ID retornado

curl -H "Authorization: Bearer {token}" \
  "http://localhost:3001/api/unidades?franqueado_id={franqueado_id}"
# Deve retornar apenas unidades desse franqueado
```

### Teste 2: Verificar Filtro de Alunos

```bash
# Para cada unidade_id retornada
curl "http://localhost:3001/api/alunos?unidade_id={unidade_id}"
# Deve retornar apenas alunos dessa unidade
```

### Teste 3: Dashboard Frontend

1. Faça login com usuário vinculado ao franqueado
2. Verifique se "Minhas Unidades" mostra o número correto
3. Verifique se "Total Alunos" é a soma dos alunos das unidades
4. Verifique se a receita está sendo calculada corretamente
5. Verifique se a lista de unidades mostra apenas as do franqueado

## 🔍 Troubleshooting

### Dashboard ainda mostra todas as unidades

- ✅ Verifique se o backend foi reiniciado após as mudanças
- ✅ Verifique se o `franqueado.id` está sendo passado na query
- ✅ Verifique no Network tab do navegador se a URL está correta:
  - Deve ser: `/api/unidades?pageSize=100&franqueado_id=xxx`
  - Não deve ser: `/api/unidades?pageSize=100`

### Dashboard mostra 0 alunos

- ✅ Verifique se as unidades têm alunos cadastrados
- ✅ Verifique se o campo `unidade_id` dos alunos corresponde às unidades
- ✅ Verifique os logs do backend para ver se as queries estão corretas

### Receita mensal está incorreta

- ✅ Verifique se o campo `valor_plano_padrao` está preenchido nas unidades
- ✅ Se não estiver, o sistema usa R$ 350 como padrão
- ✅ Verifique se os alunos estão com status ATIVO

## 📝 Arquivos Modificados

1. ✅ `backend/src/people/dto/unidades.dto.ts` - Adicionado campo franqueado_id
2. ✅ `backend/src/people/services/unidades.service.ts` - Implementado filtro
3. ✅ `frontend/components/dashboard/FranqueadoDashboard.tsx` - Corrigido queries e cálculos

## 🚀 Próximos Passos

- [ ] Implementar cache no frontend para evitar múltiplas requisições
- [ ] Adicionar loading states individuais para cada seção
- [ ] Implementar busca de graduações pendentes (atualmente mock)
- [ ] Adicionar gráficos de evolução temporal
- [ ] Implementar comparação com mês anterior
