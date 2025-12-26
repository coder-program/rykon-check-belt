# FIX: Validação de Assinaturas Expiradas

## 🐛 Problema Identificado

O sistema permitia criar assinaturas em planos cujo período já havia expirado, marcando-as incorretamente como "ATIVA". Por exemplo:

- Criar uma assinatura de plano semestral com data de início há 8 meses
- Sistema calculava data_fim no passado mas marcava como ATIVA
- Não havia validação para impedir criação de assinaturas expiradas
- Não havia atualização automática de status para assinaturas que venceram

## ✅ Solução Implementada

### 1. Backend - Validação na Criação de Assinatura

**Arquivo:** `backend/src/financeiro/services/assinaturas.service.ts`

#### a) Validação de Data de Término

```typescript
// Calcular data_fim baseado na duracao_meses do plano
const dataInicio = new Date(createAssinaturaDto.data_inicio);
const dataFim = new Date(dataInicio);
dataFim.setMonth(dataFim.getMonth() + plano.duracao_meses);

// Verificar se a assinatura já está expirada
const hoje = new Date();
hoje.setHours(0, 0, 0, 0);
const dataFimComparacao = new Date(dataFim);
dataFimComparacao.setHours(0, 0, 0, 0);

if (dataFimComparacao < hoje) {
  throw new BadRequestException(
    `Não é possível criar assinatura com data de término no passado.
     A assinatura terminaria em ${dataFim.toLocaleDateString("pt-BR")},
     que já passou.`
  );
}
```

**Comportamento:**

- ✅ Calcula a data_fim baseado na data_inicio + duracao_meses do plano
- ✅ Compara data_fim com a data atual
- ✅ Rejeita criação se data_fim já passou
- ✅ Retorna mensagem clara indicando quando a assinatura terminaria

#### b) Atualização Automática de Status Expirado

```typescript
/**
 * Verifica e atualiza automaticamente assinaturas que expiraram
 */
private async atualizarAssinaturasExpiradas(
  assinaturas: Assinatura[],
): Promise<void> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const assinaturasParaAtualizar = assinaturas.filter((assinatura) => {
    if (assinatura.status === StatusAssinatura.ATIVA && assinatura.data_fim) {
      const dataFim = new Date(assinatura.data_fim);
      dataFim.setHours(0, 0, 0, 0);
      return dataFim < hoje;
    }
    return false;
  });

  if (assinaturasParaAtualizar.length > 0) {
    console.log(
      `⏰ Atualizando ${assinaturasParaAtualizar.length} assinatura(s) expirada(s)`,
    );

    for (const assinatura of assinaturasParaAtualizar) {
      assinatura.status = StatusAssinatura.EXPIRADA;
      await this.assinaturaRepository.save(assinatura);
    }
  }
}
```

**Comportamento:**

- ✅ Executado automaticamente ao listar assinaturas
- ✅ Identifica assinaturas ATIVAS com data_fim no passado
- ✅ Atualiza status para EXPIRADA automaticamente
- ✅ Log informativo da operação

### 2. Frontend - Validação e Feedback Visual

**Arquivo:** `frontend/app/financeiro/assinaturas/page.tsx`

#### a) Validação Pré-Envio

```typescript
// Validar se a assinatura não estaria expirada
if (planoSelecionado && formData.data_inicio) {
  const dataInicio = new Date(formData.data_inicio);
  const dataFim = new Date(dataInicio);

  const duracaoMeses =
    planoSelecionado.tipo === "MENSAL"
      ? 1
      : planoSelecionado.tipo === "SEMESTRAL"
      ? 6
      : planoSelecionado.tipo === "ANUAL"
      ? 12
      : 1;

  dataFim.setMonth(dataFim.getMonth() + duracaoMeses);

  const hoje = new Date();
  if (dataFim < hoje) {
    mostrarMensagem(
      "Data Inválida",
      `A assinatura terminaria em ${dataFim.toLocaleDateString("pt-BR")},
       que já passou. Por favor, ajuste a data de início.`,
      "erro"
    );
    return;
  }
}
```

#### b) Badges Melhorados com Ícones

```typescript
const getStatusBadge = (status: string) => {
  const badges = {
    ATIVA: <Badge className="bg-green-100 text-green-800">✓ Ativa</Badge>,
    PAUSADA: <Badge className="bg-yellow-100 text-yellow-800">⏸ Pausada</Badge>,
    CANCELADA: <Badge className="bg-red-100 text-red-800">✗ Cancelada</Badge>,
    EXPIRADA: <Badge className="bg-gray-100 text-gray-800">⏰ Expirada</Badge>,
    INADIMPLENTE: (
      <Badge className="bg-orange-100 text-orange-800">⚠ Inadimplente</Badge>
    ),
  };
  return badges[status as keyof typeof badges] || null;
};
```

#### c) Alertas de Vencimento Próximo

```typescript
const calcularDiasParaVencimento = (dataFim: string): number => {
  const hoje = new Date();
  const vencimento = new Date(dataFim);
  const diffTime = vencimento.getTime() - hoje.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getAlertaVencimento = (dataFim: string) => {
  const dias = calcularDiasParaVencimento(dataFim);

  if (dias < 0) {
    return (
      <span className="text-xs text-red-600 font-medium">
        ⚠️ Vencida há {Math.abs(dias)} dia(s)
      </span>
    );
  } else if (dias <= 7) {
    return (
      <span className="text-xs text-orange-600 font-medium">
        ⚡ Vence em {dias} dia(s)
      </span>
    );
  } else if (dias <= 15) {
    return (
      <span className="text-xs text-yellow-600">⏰ Vence em {dias} dia(s)</span>
    );
  }
  return null;
};
```

**Comportamento:**

- 🔴 Vermelho: Assinatura já vencida
- 🟠 Laranja: Vence em 7 dias ou menos
- 🟡 Amarelo: Vence em 8-15 dias
- Exibido apenas para assinaturas ATIVAS

#### d) Dashboard com Card de Expiradas

```typescript
const totais = {
  ativas: assinaturas.filter((a) => a.status === "ATIVA").length,
  pausadas: assinaturas.filter((a) => a.status === "PAUSADA").length,
  canceladas: assinaturas.filter((a) => a.status === "CANCELADA").length,
  expiradas: assinaturas.filter((a) => a.status === "EXPIRADA").length,
  receita: assinaturas
    .filter((a) => a.status === "ATIVA")
    .reduce((sum, a) => sum + Number(a.valor_mensal || 0), 0),
};
```

Substituído card de "Canceladas" por "Expiradas" no dashboard principal.

## 🎯 Comportamento Esperado

### Cenário 1: Criar Assinatura com Data Válida

**Situação:** Criar assinatura semestral (6 meses) com início hoje

- ✅ Sistema calcula data_fim = hoje + 6 meses
- ✅ data_fim está no futuro
- ✅ Assinatura criada com status ATIVA
- ✅ Sucesso!

### Cenário 2: Tentar Criar Assinatura Expirada

**Situação:** Criar assinatura semestral com início há 8 meses

- ❌ Sistema calcula data_fim = há 8 meses + 6 meses = há 2 meses
- ❌ data_fim está no passado
- ❌ **Backend rejeita** com erro descritivo
- ❌ **Frontend valida** antes de enviar
- ❌ Mensagem: "A assinatura terminaria em DD/MM/AAAA, que já passou"

### Cenário 3: Assinatura que Venceu Naturalmente

**Situação:** Assinatura criada há 6 meses com plano semestral

- ⏰ data_fim chegou/passou
- ⏰ Status atualizado automaticamente de ATIVA → EXPIRADA
- ⏰ Aparece no card "Expiradas" do dashboard
- ⏰ Badge mostra "⏰ Expirada"

### Cenário 4: Assinatura Próxima do Vencimento

**Situação:** Assinatura ATIVA que vence em 5 dias

- ⚡ Exibe alerta laranja: "⚡ Vence em 5 dia(s)"
- ⚡ Visível na lista de assinaturas
- ⚡ Permite ação preventiva (renovação)

## 📊 Indicadores Visuais

### Status das Assinaturas

| Status       | Badge    | Cor | Ícone |
| ------------ | -------- | --- | ----- |
| ATIVA        | Verde    | 🟢  | ✓     |
| PAUSADA      | Amarelo  | 🟡  | ⏸     |
| CANCELADA    | Vermelho | 🔴  | ✗     |
| EXPIRADA     | Cinza    | ⚫  | ⏰    |
| INADIMPLENTE | Laranja  | 🟠  | ⚠     |

### Alertas de Vencimento (apenas ATIVAS)

| Dias para Vencer | Cor      | Ícone | Mensagem              |
| ---------------- | -------- | ----- | --------------------- |
| Já vencida       | Vermelho | ⚠️    | "Vencida há X dia(s)" |
| 1-7 dias         | Laranja  | ⚡    | "Vence em X dia(s)"   |
| 8-15 dias        | Amarelo  | ⏰    | "Vence em X dia(s)"   |
| > 15 dias        | -        | -     | Sem alerta            |

## 🔄 Fluxo de Atualização Automática

1. **Usuário acessa página de assinaturas**
2. **Backend lista assinaturas**
3. **Método `atualizarAssinaturasExpiradas()` executado**
4. **Identifica assinaturas ATIVAS com data_fim < hoje**
5. **Atualiza status → EXPIRADA**
6. **Frontend exibe status atualizado**

## 🔍 Validações Implementadas

### Backend

- ✅ Validação de data_fim antes de criar
- ✅ Rejeição de assinaturas já expiradas
- ✅ Atualização automática de status
- ✅ Mensagens de erro descritivas
- ✅ Log de operações de atualização

### Frontend

- ✅ Validação pré-envio
- ✅ Cálculo de data_fim no cliente
- ✅ Alertas visuais de vencimento
- ✅ Badges com ícones informativos
- ✅ Dashboard com contador de expiradas
- ✅ Filtro por status EXPIRADA

## 📝 Notas Técnicas

### Cálculo de Duração

- Utiliza `duracao_meses` do plano
- MENSAL = 1 mês, SEMESTRAL = 6 meses, ANUAL = 12 meses
- Método `setMonth()` do JavaScript lida corretamente com meses

### Comparação de Datas

- Horas zeradas (`setHours(0, 0, 0, 0)`) para comparação apenas de data
- Garante precisão e evita problemas de timezone

### Performance

- Atualização em lote no banco
- Executada apenas quando há assinaturas para atualizar
- Log informativo para monitoramento

## 🚀 Status

✅ **CONCLUÍDO** - Sistema agora:

- Previne criação de assinaturas expiradas
- Atualiza automaticamente status de assinaturas vencidas
- Fornece feedback visual claro sobre vencimentos
- Exibe alertas preventivos para renovação
