# Implementação do Sistema de Ranking de Frequência

## 📋 Resumo

Implementado sistema de ranking de alunos baseado na frequência mensal na unidade, substituindo o mock "Calculando..." por dados reais.

## 🎯 Funcionalidades Implementadas

### 1. Endpoint de Ranking - Backend

**Arquivo:** `backend/src/presenca/presenca.controller.ts`

Novo endpoint criado:

```typescript
GET /presenca/ranking-unidade?mes=10&ano=2025
```

**Parâmetros opcionais:**

- `mes`: Mês para calcular o ranking (1-12). Padrão: mês atual
- `ano`: Ano para calcular o ranking. Padrão: ano atual

**Resposta:**

```json
{
  "posicao": 3,
  "presencas": 15,
  "totalAlunos": 45,
  "mes": 10,
  "ano": 2025,
  "ranking": [
    {
      "posicao": 1,
      "nome": "João Silva",
      "faixa": "AZUL",
      "graus": 2,
      "presencas": 20,
      "isUsuarioAtual": false
    }
    // ... até 10 alunos
  ]
}
```

### 2. Serviço de Ranking - Backend

**Arquivo:** `backend/src/presenca/presenca.service.ts`

**Método:** `getRankingUnidade(user, mes?, ano?)`

**Lógica implementada:**

1. **Identificação da Unidade**

   - Busca o aluno pelo `usuario_id`
   - Identifica a unidade vinculada

2. **Busca de Alunos**

   - Lista todos os alunos ATIVOS da mesma unidade
   - Apenas alunos com status = `StatusAluno.ATIVO`

3. **Contagem de Presenças**

   - Busca presenças do mês/ano especificado
   - Conta presenças por aluno usando `created_at` das presenças

4. **Geração do Ranking**

   - Ordena alunos por número de presenças (decrescente)
   - Identifica a posição do usuário logado
   - Retorna top 10 com informações completas

5. **Tratamento de Erros**
   - Retorna estrutura vazia em caso de erro
   - Logs detalhados para debugging

### 3. Dashboard do Aluno - Frontend

**Arquivo:** `frontend/components/dashboard/AlunoDashboard.tsx`

#### Alterações Realizadas:

**a) Nova Interface:**

```typescript
interface RankingData {
  posicao: number | null;
  presencas: number;
  totalAlunos: number;
  mes: number;
  ano: number;
  ranking: Array<{
    posicao: number;
    nome: string;
    faixa: string;
    graus: number;
    presencas: number;
    isUsuarioAtual: boolean;
  }>;
}
```

**b) Novo Estado:**

```typescript
const [rankingData, setRankingData] = useState<RankingData | null>(null);
```

**c) Carregamento de Dados:**

- Adicionado na Promise.allSettled
- Chamada ao endpoint `/presenca/ranking-unidade`
- Tratamento de sucesso e erro

**d) Card de Ranking Atualizado:**

- Mostra posição real no ranking (#1, #2, etc.)
- Exibe número de aulas do mês
- Mostra total de alunos na unidade
- Estados: Loading, Sem presenças, Com ranking

**e) Seção Top 10 Completa:**

- Nova seção abaixo das conquistas
- Lista visual dos 10 melhores alunos
- Destaque especial para:
  - 🥇 1º lugar (dourado)
  - 🥈 2º lugar (prata)
  - 🥉 3º lugar (bronze)
  - Usuário atual (fundo amarelo com borda)
- Informações exibidas:
  - Posição no ranking
  - Nome do aluno
  - Faixa e graus
  - Número de presenças

## 🎨 Design Visual

### Card de Ranking (Resumo)

```
┌─────────────────────────┐
│ 🏆 Ranking Turma        │
│                         │
│      #3                 │
│  15 aulas no mês        │
│  de 45 alunos          │
└─────────────────────────┘
```

### Top 10 Completo

```
┌──────────────────────────────────────────────┐
│ 🏆 Top 10 - Ranking de Frequência (10/2025) │
├──────────────────────────────────────────────┤
│ 🥇  João Silva                          20   │
│     AZUL - 2 graus                    aulas  │
├──────────────────────────────────────────────┤
│ 🥈  Maria Santos                        18   │
│     ROXA - 0 graus                    aulas  │
├──────────────────────────────────────────────┤
│ 🥉  Pedro Costa                         17   │
│     AZUL - 3 graus                    aulas  │
├──────────────────────────────────────────────┤
│ #4  Carlos Mendes (Você) ⭐            15   │
│     AZUL - 1 grau                     aulas  │
└──────────────────────────────────────────────┘
```

## 📊 Regras de Negócio

### Critérios de Ranking

1. **Escopo:** Unidade específica do aluno
2. **Período:** Mês/ano atual ou especificado
3. **Status:** Apenas alunos ATIVOS
4. **Ordenação:** Por número de presenças (maior para menor)
5. **Empates:** Mantém ordem alfabética natural do banco

### Contagem de Presenças

- Todas as presenças registradas no período contam
- Métodos considerados:
  - QR Code
  - Manual (recepção)
  - CPF
  - Facial
  - Responsável
- Uma presença por dia por aluno

## 🔧 Melhorias Futuras

### Curto Prazo

- [ ] Cache do ranking (atualizar a cada hora)
- [ ] Filtro por faixa/categoria
- [ ] Histórico de posições (evolução mensal)

### Médio Prazo

- [ ] Ranking por turma específica
- [ ] Ranking de múltiplas unidades (franqueado)
- [ ] Notificações de mudança de posição
- [ ] Badges/conquistas por posição no ranking

### Longo Prazo

- [ ] Ranking nacional (todas unidades)
- [ ] Competições entre unidades
- [ ] Prêmios por frequência
- [ ] Gamificação com pontos e níveis

## 🧪 Como Testar

### 1. Backend

```bash
# Terminal 1 - Iniciar backend
cd backend
npm run start:dev

# Terminal 2 - Testar endpoint
curl -H "Authorization: Bearer SEU_TOKEN" \
  http://localhost:4000/presenca/ranking-unidade
```

### 2. Frontend

```bash
# Terminal - Iniciar frontend
cd frontend
npm run dev

# Acessar
http://localhost:3000/dashboard
```

### 3. Verificar Dados

**Requisitos:**

- Ter alunos cadastrados na unidade
- Ter presenças registradas no mês atual
- Estar logado como aluno

**Verificações:**

- Card "Ranking Turma" mostra posição real
- Seção "Top 10" aparece (se houver dados)
- Usuário atual destacado em amarelo
- Medalhas nos 3 primeiros

## 📝 SQL para Debug

```sql
-- Ver presenças do mês atual
SELECT
  a.nome_completo,
  COUNT(*) as total_presencas
FROM teamcruz.presencas p
JOIN teamcruz.alunos a ON a.id = p.aluno_id
WHERE
  DATE_TRUNC('month', p.created_at) = DATE_TRUNC('month', CURRENT_DATE)
  AND a.status = 'ATIVO'
GROUP BY a.nome_completo, a.id
ORDER BY total_presencas DESC
LIMIT 10;

-- Ver ranking de uma unidade específica
SELECT
  a.nome_completo,
  a.faixa_atual,
  a.graus,
  COUNT(p.id) as presencas
FROM teamcruz.alunos a
LEFT JOIN teamcruz.presencas p ON p.aluno_id = a.id
  AND DATE_TRUNC('month', p.created_at) = DATE_TRUNC('month', CURRENT_DATE)
WHERE
  a.unidade_id = 'UUID_DA_UNIDADE'
  AND a.status = 'ATIVO'
GROUP BY a.id, a.nome_completo, a.faixa_atual, a.graus
ORDER BY presencas DESC;
```

## ✅ Checklist de Implementação

- [x] Criar endpoint `/presenca/ranking-unidade`
- [x] Implementar método `getRankingUnidade` no service
- [x] Importar enum `StatusAluno`
- [x] Adicionar interface `RankingData` no frontend
- [x] Adicionar estado `rankingData` no dashboard
- [x] Carregar dados do ranking
- [x] Atualizar card "Ranking Turma"
- [x] Criar seção "Top 10"
- [x] Adicionar destaque para usuário atual
- [x] Adicionar medalhas para top 3
- [x] Testar com dados reais

## 🎉 Resultado

Sistema de ranking completamente funcional mostrando:

- Posição real do aluno no ranking da unidade
- Número de aulas frequentadas no mês
- Top 10 alunos mais frequentes
- Destaque visual para o usuário e top 3
- Informações completas de faixa e graus

**Status:** ✅ Implementado e Testado
**Data:** 20/10/2025
