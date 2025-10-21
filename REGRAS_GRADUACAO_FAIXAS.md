# 📋 Regras de Graduação de Faixas

## Diferença entre Grau e Graduação

### 🎯 Grau (Ponteira)

- **O que é**: Pequena fita na ponta da faixa
- **Como conseguir**: 40 presenças em aulas
- **Máximo por faixa**: 4 graus
- **Resetado**: Quando troca de faixa

### 🥋 Graduação (Mudança de Faixa)

- **O que é**: Trocar de cor de faixa
- **Requisitos**:
  1. **4 graus completos** (160 presenças totais)
  2. **Tempo mínimo na faixa** (varia por faixa)

---

## ⏱️ Tempo Mínimo por Faixa

### Faixa Branca 🤍

- **Tempo Mínimo**: 1 ano (365 dias)
- **Graus Necessários**: 4 graus
- **Próxima Faixa**: Azul

### Faixa Azul 💙

- **Tempo Mínimo**: 2 anos (730 dias)
- **Graus Necessários**: 4 graus
- **Próxima Faixa**: Roxa

### Faixa Roxa 💜

- **Tempo Mínimo**: 2 anos (730 dias)
- **Graus Necessários**: 4 graus
- **Próxima Faixa**: Marrom

### Faixa Marrom 🤎

- **Tempo Mínimo**: 1 ano e meio (548 dias / 1.5 anos)
- **Graus Necessários**: 4 graus
- **Próxima Faixa**: Preta

---

## 📊 Sistema de Contagem

### Presença em Aulas

- Cada aula com presença registrada = 1 ponto
- 40 presenças = 1 grau
- 160 presenças (4 graus) + tempo mínimo = graduação

### Progresso de Tempo

O sistema calcula automaticamente:

- **Dias na faixa atual**: Desde a data de início
- **Dias restantes**: Até completar o tempo mínimo
- **Progresso percentual**: Visual no dashboard

---

## ✅ Critérios para Graduação

Para trocar de faixa, o aluno precisa:

```
✓ Ter 4 graus completos (160 presenças)
  OU
✓ Ter completado o tempo mínimo na faixa
```

**Importante**: O sistema considera **o maior progresso** entre tempo e aulas. Assim:

- Se o aluno tiver 4 graus mas não completou o tempo → **pode graduar**
- Se o aluno completou o tempo mas não tem 4 graus → **pode graduar**

Isso dá flexibilidade para diferentes perfis de alunos.

---

## 🎓 Implementação no Sistema

### Entidades Principais

#### `faixa_def` (Definição de Faixas)

```typescript
{
  codigo: 'BRANCA' | 'AZUL' | 'ROXA' | 'MARROM' | 'PRETA',
  nome_exibicao: string,
  cor_hex: string,
  ordem: number,
  graus_max: 4,
  aulas_por_grau: 40,
  categoria: 'ADULTO' | 'INFANTIL'
}
```

#### `aluno_faixa` (Faixa Atual do Aluno)

```typescript
{
  aluno_id: string,
  faixa_def_id: string,
  ativa: boolean,
  dt_inicio: Date,
  dt_fim: Date,
  graus_atual: number,
  presencas_no_ciclo: number,    // Para próximo grau
  presencas_total_fx: number      // Total na faixa
}
```

#### `aluno_faixa_grau` (Histórico de Graus)

```typescript
{
  aluno_faixa_id: string,
  numero_grau: number,
  data_concessao: Date,
  professor_id: string,
  observacoes: string
}
```

### Métodos Helper

#### `isProntoParaGraduar()`

Verifica se o aluno pode trocar de faixa:

```typescript
const tem4Graus = graus_atual >= 4;
const temTempoSuficiente = diasNaFaixa >= tempoMinimo;
return tem4Graus || temTempoSuficiente;
```

#### `podeReceberGrau()`

Verifica se o aluno pode receber próximo grau:

```typescript
return graus_atual < 4 && presencas_no_ciclo >= 40;
```

#### `getProgressoGraduacao()`

Calcula progresso para graduação:

```typescript
{
  aulas: presencasRealizadas / 160,
  tempo: diasNaFaixa / tempoMinimo,
  prontoParaGraduar: boolean
}
```

---

## 📱 Interface do Usuário

### Dashboard do Aluno - Card de Graduação

```
┌─────────────────────────────────────────────────┐
│ 🏆 Graduação Atual                              │
├─────────────────────────────────────────────────┤
│                                                 │
│  ROXA                  │ Progresso      │ Próx. Graduação │
│  0 / 4 graus           │ [▓▓░░░░░░] 25% │ MARROM          │
│  1 dia na faixa        │ 0/40 presenças │ 4 graus faltam  │
│                        │ Faltam 40 aulas│ 18 meses de tempo│
│                        │                │ Mín: 1.5 anos + 4 graus│
│                                                 │
└─────────────────────────────────────────────────┘
```

### Informações Exibidas

1. **Faixa Atual**: Nome e quantidade de graus
2. **Tempo na Faixa**: Dias desde que recebeu a faixa
3. **Progresso para Próximo Grau**: Barra visual + quantidade
4. **Próxima Graduação**:
   - Nome da próxima faixa
   - Graus restantes
   - Tempo restante (em meses)
   - Requisitos mínimos

---

## 🔄 Fluxo de Graduação

### 1. Novo Aluno

```
Recebe faixa inicial (geralmente Branca)
→ Sistema cria registro em `aluno_faixa`
→ dt_inicio = hoje
→ graus_atual = 0
```

### 2. Frequência nas Aulas

```
A cada presença:
→ presencas_no_ciclo++
→ presencas_total_fx++

Quando presencas_no_ciclo >= 40:
→ Professor pode conceder grau
→ graus_atual++
→ presencas_no_ciclo = 0 (reset)
```

### 3. Cerimônia de Graduação

```
Quando isProntoParaGraduar() == true:
→ Professor pode graduar para próxima faixa
→ Criar novo registro em aluno_faixa (próxima faixa)
→ Desativar faixa atual (ativa = false, dt_fim = hoje)
→ Criar registro em aluno_graduacao (histórico)
→ Reset: graus_atual = 0, presencas_no_ciclo = 0
```

---

## 📝 Observações Importantes

1. **Flexibilidade**: O sistema permite graduação por tempo OU por graus, não necessariamente ambos
2. **Decisão do Professor**: O sistema apenas indica elegibilidade, a decisão final é do instrutor
3. **Histórico Completo**: Todas as graduações ficam registradas em `aluno_graduacao`
4. **Graus Infantis**: Faixas infantis podem ter regras diferentes (campo `categoria`)
5. **Eventos Especiais**: Graduações podem ser vinculadas a eventos específicos via `graduacao_parametros`

---

## 🚀 Endpoints da API

### Status de Graduação

```typescript
GET /api/graduacao/status
Response: {
  faixaAtual: string,
  grausAtual: number,
  grausMax: number,
  presencasNoCiclo: number,
  diasNaFaixa: number,
  diasRestantes: number,
  tempoMinimoAnos: number,
  prontoParaGraduar: boolean,
  progressoAulas: number,
  progressoTempo: number,
  proximaFaixa: string
}
```

### Conceder Grau

```typescript
POST /api/graduacao/conceder-grau
Body: {
  alunoId: string,
  observacoes: string
}
```

### Graduar Faixa

```typescript
POST /api/graduacao/graduar-faixa
Body: {
  alunoId: string,
  eventoId?: string,
  observacoes: string
}
```

---

**Última atualização**: 20/10/2025
**Sistema**: TeamCruz - Check Belt System
