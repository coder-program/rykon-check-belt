# Página de Gerenciamento de Competições - Auto-Cadastro

## 📋 Resumo

Criada página completa `/competicoes` onde o aluno pode adicionar, editar e remover suas próprias participações em competições/campeonatos.

## 🎯 Funcionalidades Implementadas

### 1. **Interface de Listagem**

- Visualização de todas as participações do aluno
- Cards com informações detalhadas
- Emojis de medalhas (🥇🥈🥉🎖️)
- Estatísticas de cada competição

### 2. **Dashboard de Estatísticas**

- Total de competições
- Contador de medalhas (Ouro, Prata, Bronze)
- Total de lutas realizadas
- Aproveitamento geral (% de vitórias)

### 3. **Formulário de Cadastro**

#### Informações da Competição:

- **Nome** \* (obrigatório) - Ex: "Copa TeamCruz 2025"
- **Tipo** \* - LOCAL, REGIONAL, ESTADUAL, NACIONAL, INTERNACIONAL, INTERNO
- **Modalidade** \* - GI, NO_GI, AMBOS
- **Data** \* - Data da competição
- **Local** - Nome do local (Ex: "Ginásio Municipal")
- **Cidade** - Cidade onde ocorreu
- **Estado** - UF (2 letras)

#### Informações da Participação:

- **Categoria de Peso** - Leve, Médio, Pesado, Absoluto, etc.
- **Categoria de Idade** - Juvenil, Adulto, Master 1, etc.
- **Faixa Competida** - Faixa que competiu
- **Posição** \* - 🥇 Ouro, 🥈 Prata, 🥉 Bronze, Participou, Desclassificado
- **Colocação** - Número da posição (1, 2, 3...)
- **Total de Lutas** - Quantidade de lutas
- **Vitórias** - Número de vitórias
- **Derrotas** - Número de derrotas
- **Observações** - Campo de texto livre

### 4. **Operações CRUD**

#### Adicionar Nova Competição

1. Click em "Adicionar Competição"
2. Preencher formulário
3. Sistema cria competição (se não existir) e registra participação
4. Atualiza lista automaticamente

#### Editar Participação

1. Click no botão de editar (✏️)
2. Formulário pré-preenchido com dados atuais
3. Alterar informações desejadas
4. Salvar alterações

#### Remover Participação

1. Click no botão de remover (🗑️)
2. Confirmação de exclusão
3. Remove apenas a participação (mantém competição)

### 5. **Validações**

- Campos obrigatórios marcados com \*
- Números não negativos
- Estado com 2 caracteres
- Data no formato correto
- Validação de duplicação no backend

## 🎨 Design da Interface

### Header

```
┌────────────────────────────────────────────────┐
│ 🏆 Minhas Competições                          │
│ Gerencie seu histórico de campeonatos          │
│                    [+ Adicionar Competição]    │
└────────────────────────────────────────────────┘
```

### Cards de Estatísticas

```
┌────────────────┬────────────────┬────────────────┬────────────────┐
│ Total          │ Medalhas       │ Lutas          │ Aproveitamento │
│   12           │ 🥇3 🥈2 🥉1    │   45           │   85%          │
│ 6 pódios       │                │ 38V / 7D       │ Taxa vitória   │
└────────────────┴────────────────┴────────────────┴────────────────┘
```

### Formulário

```
┌─────────────────────────────────────────────────────────┐
│ Adicionar Competição                              [X]   │
├─────────────────────────────────────────────────────────┤
│ Informações da Competição                               │
│ ┌──────────────────────────────────────────────────┐   │
│ │ Nome da Competição *                              │   │
│ │ [Copa TeamCruz 2025                             ]│   │
│ └──────────────────────────────────────────────────┘   │
│ ┌──────────────────┐ ┌──────────────────┐             │
│ │ Tipo *           │ │ Modalidade *     │             │
│ │ [INTERNO     ▼] │ │ [GI          ▼] │             │
│ └──────────────────┘ └──────────────────┘             │
│                                                         │
│ Minha Participação                                      │
│ ┌──────────────────┐ ┌──────────────────┐             │
│ │ Posição *        │ │ Colocação        │             │
│ │ [🥇 Ouro     ▼] │ │ [1              ]│             │
│ └──────────────────┘ └──────────────────┘             │
│                                                         │
│                          [Cancelar] [Salvar]           │
└─────────────────────────────────────────────────────────┘
```

### Card de Participação

```
┌────────────────────────────────────────────────────────┐
│ 🥇  Copa TeamCruz 2025                    [✏️] [🗑️]   │
│                                                         │
│     🏆 INTERNO  📅 15/10/2025  📍 São Paulo - SP       │
│     [Médio] [AZUL] [OURO]                             │
│     📊 5V / 1D - 83% de aproveitamento                 │
│     "Ótima performance, venci todas no triângulo"      │
└────────────────────────────────────────────────────────┘
```

## 🔧 Alterações no Backend

### Controller (`competicoes.controller.ts`)

Adicionado suporte para busca por nome:

```typescript
@Query('nome') nome?: string
```

### Service (`competicoes.service.ts`)

Atualizado para buscar por nome:

```typescript
if (filtros?.nome) {
  where.nome = Like(`%${filtros.nome}%`);
}
```

## 📁 Arquivos Criados/Modificados

### Novo Arquivo:

1. ✅ `frontend/app/competicoes/page.tsx` - Página completa

### Modificados:

2. ✅ `backend/src/competicoes/competicoes.controller.ts` - Busca por nome
3. ✅ `backend/src/competicoes/competicoes.service.ts` - Like query

## 🚀 Como Usar

### 1. Acessar a Página

```
http://localhost:3000/competicoes
```

### 2. Adicionar Primeira Competição

1. Click em "Adicionar Competição"
2. Preencher dados básicos:
   - Nome: "Copa TeamCruz 2025"
   - Tipo: "INTERNO"
   - Modalidade: "GI"
   - Data: "2025-11-15"
3. Preencher resultado:
   - Categoria: "Médio"
   - Faixa: "Azul"
   - Posição: "🥇 Ouro"
4. Click em "Salvar"

### 3. Visualizar no Dashboard

- Ir para `/dashboard`
- Seção "Histórico de Competições" atualizada
- Estatísticas mostradas no topo

## 📊 Fluxo de Dados

### Cadastro de Nova Competição

```
1. Aluno preenche formulário
2. Frontend envia para /competicoes
3. Backend cria competição (se não existir)
4. Frontend registra participação em /competicoes/participacao
5. Backend vincula aluno à competição
6. Lista atualizada automaticamente
```

### Edição de Participação

```
1. Click em editar
2. Formulário preenchido automaticamente
3. Aluno altera dados desejados
4. PUT /competicoes/participacao/:id
5. Lista atualizada
```

### Exclusão

```
1. Click em remover
2. Confirmação
3. DELETE /competicoes/participacao/:id
4. Apenas participação removida (competição mantida)
5. Lista atualizada
```

## 🎯 Benefícios

### Para o Aluno:

✅ **Autonomia** - Adiciona suas próprias conquistas
✅ **Motivação** - Visualiza progresso e medalhas
✅ **Histórico** - Registro completo de participações
✅ **Estatísticas** - Acompanha performance

### Para o Sistema:

✅ **Descentralizado** - Não depende de admin
✅ **Atualizado** - Dados sempre atuais
✅ **Engajamento** - Alunos interagem mais
✅ **Transparência** - Informações acessíveis

## 🔐 Segurança

- ✅ Autenticação obrigatória (JWT)
- ✅ Aluno só edita suas próprias participações
- ✅ Validação de dados no frontend e backend
- ✅ Proteção contra duplicação
- ✅ Soft delete (competições não são removidas)

## 🎨 Cores das Medalhas

```typescript
🥇 OURO    → bg-yellow-100 text-yellow-800
🥈 PRATA   → bg-gray-200 text-gray-700
🥉 BRONZE  → bg-amber-100 text-amber-800
🎖️ PARTICIPOU → bg-gray-100 text-gray-600
```

## 📝 Exemplos de Uso

### Exemplo 1: Campeonato Interno

```
Nome: Copa TeamCruz 2025
Tipo: INTERNO
Modalidade: AMBOS
Data: 2025-11-15
Categoria: Médio
Faixa: Azul
Posição: Ouro
Lutas: 5V / 1D
```

### Exemplo 2: Campeonato Estadual

```
Nome: Campeonato Paulista FPJJ
Tipo: ESTADUAL
Modalidade: GI
Data: 2025-10-20
Local: Ginásio do Ibirapuera
Cidade: São Paulo
Estado: SP
Categoria: Leve
Faixa: Azul
Posição: Prata
Lutas: 4V / 2D
```

### Exemplo 3: Participação Sem Pódio

```
Nome: IBJJF Pan Championship
Tipo: INTERNACIONAL
Modalidade: AMBOS
Data: 2025-08-15
Categoria: Médio
Faixa: Azul
Posição: Participou
Colocação: 5
Lutas: 2V / 2D
Observações: "Ótima experiência internacional"
```

## 🔄 Sincronização com Dashboard

A página de competições está totalmente integrada com o dashboard:

- Dados salvos aparecem automaticamente no dashboard
- Estatísticas recalculadas em tempo real
- Histórico sincronizado

## 📱 Responsividade

- ✅ Desktop (telas grandes)
- ✅ Tablet (média)
- ✅ Mobile (pequenas)
- Grid adaptativo
- Formulário responsivo

## 🎉 Próximos Passos

### Curto Prazo:

- [ ] Upload de certificados
- [ ] Upload de fotos de pódio
- [ ] Validação de CPF/nome em competições oficiais

### Médio Prazo:

- [ ] Compartilhamento social
- [ ] Badges automáticos
- [ ] Exportar PDF do histórico

### Longo Prazo:

- [ ] Integração com APIs de federações
- [ ] Verificação de resultados oficiais
- [ ] Ranking nacional

---

**Status:** ✅ Implementado e Funcional
**Data:** 20/10/2025
**Rota:** `http://localhost:3000/competicoes`
