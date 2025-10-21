# 📅 Formatação de Tempo na Faixa

## 🎯 Objetivo

Melhorar a legibilidade do tempo que o aluno está na faixa atual, convertendo dias em anos e meses ao invés de exibir apenas em dias.

## 📊 Exemplos de Formatação

### Antes

```
717 dias na faixa
```

### Depois

```
1 ano e 11 meses na faixa
```

## 🔧 Implementação

### Função Helper: `formatarTempoNaFaixa()`

```typescript
function formatarTempoNaFaixa(dias: number): string {
  if (dias < 30) {
    return `${dias} dia${dias !== 1 ? "s" : ""}`;
  }

  const anos = Math.floor(dias / 365);
  const mesesRestantes = Math.floor((dias % 365) / 30);
  const diasRestantes = dias % 30;

  const partes: string[] = [];

  if (anos > 0) {
    partes.push(`${anos} ano${anos > 1 ? "s" : ""}`);
  }

  if (mesesRestantes > 0) {
    partes.push(`${mesesRestantes} mês${mesesRestantes > 1 ? "es" : ""}`);
  }

  // Inclui dias restantes apenas se for menos de 1 mês
  if (diasRestantes > 0 && anos === 0 && mesesRestantes === 0) {
    partes.push(`${diasRestantes} dia${diasRestantes > 1 ? "s" : ""}`);
  }

  return partes.join(" e ");
}
```

## 📋 Exemplos de Saída

| Dias | Formatado        |
| ---- | ---------------- |
| 15   | 15 dias          |
| 29   | 29 dias          |
| 45   | 1 mês            |
| 90   | 3 meses          |
| 365  | 1 ano            |
| 395  | 1 ano e 1 mês    |
| 730  | 2 anos           |
| 717  | 1 ano e 11 meses |
| 1095 | 3 anos           |
| 1125 | 3 anos e 1 mês   |

## 🎨 Uso no Dashboard

### Card de Graduação Atual

```tsx
<p className="text-xs text-blue-200">
  {formatarTempoNaFaixa(statusGraduacao?.diasNaFaixa || 0)} na faixa
</p>
```

### Onde Aparece

```
┌─────────────────────────────────┐
│ 🏆 Graduação Atual              │
├─────────────────────────────────┤
│ ROXA                            │
│ 0 / 4 graus                     │
│ 1 ano e 11 meses na faixa  ←─── AQUI
└─────────────────────────────────┘
```

## 🧮 Lógica de Conversão

### Cálculo de Anos

```typescript
const anos = Math.floor(dias / 365);
// 717 dias → 1 ano
```

### Cálculo de Meses

```typescript
const mesesRestantes = Math.floor((dias % 365) / 30);
// 717 % 365 = 352 dias restantes
// 352 / 30 = 11 meses
```

### Cálculo de Dias

```typescript
const diasRestantes = dias % 30;
// Usado apenas quando total < 30 dias
```

## 📝 Regras de Formatação

1. **Menos de 30 dias**: Mostra apenas dias

   - `15 dias`
   - `1 dia`

2. **30 dias ou mais, menos de 1 ano**: Mostra meses

   - `1 mês`
   - `11 meses`

3. **1 ano ou mais**: Mostra anos e meses

   - `1 ano`
   - `1 ano e 1 mês`
   - `2 anos e 6 meses`

4. **Plural correto**: Singular/plural automático
   - `1 dia` / `2 dias`
   - `1 mês` / `2 meses`
   - `1 ano` / `2 anos`

## 🔍 Benefícios

### Legibilidade

- ✅ Mais fácil de entender
- ✅ Contextualização imediata
- ✅ Melhor UX

### Exemplos Práticos

**Antes:**

> "Você está há 717 dias na faixa roxa"
> _(usuário precisa calcular mentalmente)_

**Depois:**

> "Você está há 1 ano e 11 meses na faixa roxa"
> _(compreensão imediata)_

## 🎯 Casos de Uso

### Aluno Recém-Promovido

```
Input:  5 dias
Output: "5 dias na faixa"
```

### Aluno Há Alguns Meses

```
Input:  120 dias
Output: "4 meses na faixa"
```

### Aluno Próximo da Graduação

```
Input:  717 dias (1 ano e 11 meses)
Output: "1 ano e 11 meses na faixa"

Requisito faixa roxa: 2 anos
Falta: 1 mês
```

### Aluno Há Vários Anos

```
Input:  1825 dias (5 anos)
Output: "5 anos na faixa"
```

## 🚀 Arquivo Modificado

- `frontend/components/dashboard/AlunoDashboard.tsx`
  - Adicionada função `formatarTempoNaFaixa()`
  - Atualizado card "Graduação Atual"

## ✅ Validação

Para testar a formatação:

```typescript
console.log(formatarTempoNaFaixa(15)); // "15 dias"
console.log(formatarTempoNaFaixa(45)); // "1 mês"
console.log(formatarTempoNaFaixa(90)); // "3 meses"
console.log(formatarTempoNaFaixa(365)); // "1 ano"
console.log(formatarTempoNaFaixa(717)); // "1 ano e 11 meses"
console.log(formatarTempoNaFaixa(730)); // "2 anos"
console.log(formatarTempoNaFaixa(1095)); // "3 anos"
```

---

**Data**: 21/10/2025
**Status**: ✅ Implementado
**Impacto**: Melhoria de UX no Dashboard do Aluno
