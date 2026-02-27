# 🚀 Guia de Teste - Integração Paytime

## 📋 Pré-requisitos

1. ✅ Backend rodando em `http://localhost:4000`
2. ✅ Frontend rodando em `http://localhost:3000`
3. ✅ Banco de dados PostgreSQL configurado
4. ✅ Migrations executadas (incluindo `add-paytime-fields-transacoes.sql`)
5. ✅ Configuração Paytime completa (Establishment criado e aprovado)

---

## 🔧 Configuração Inicial

### 1. Executar Migration Paytime

```bash
cd backend
.\run-migration-paytime-transacoes.ps1
```

Ou manualmente:
```bash
psql -h localhost -p 5432 -U postgres -d teamcruz -f migrations/add-paytime-fields-transacoes.sql
```

### 2. Verificar Variáveis de Ambiente

No backend (`.env`):
```env
# Paytime Configuration
PAYTIME_API_URL=https://rykon-pay-production.up.railway.app/api
PAYTIME_WEBHOOK_SECRET=sua_chave_secreta
```

No frontend (`.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_PAYTIME_ENABLED=true
```

### 3. Verificar Configuração no Admin

1. Acesse: `http://localhost:3000/admin/sistema`
2. Navegue para **Paytime** → **Establishments**
3. Verifique que existe um establishment **APPROVED**
4. Confirme que os gateways estão ativos:
   - ✅ Banking (ID 6)
   - ✅ SubPaytime (ID 4)
5. Verifique que planos comerciais estão vinculados

---

## 🧪 Fluxo de Teste Completo

### Cenário 1: Pagamento com PIX

#### Passo 1: Criar uma Fatura de Teste
```sql
-- Executar no PostgreSQL
INSERT INTO teamcruz.faturas (
  id,
  numero_fatura,
  descricao,
  aluno_id,
  assinatura_id,
  valor_original,
  valor_total,
  valor_pago,
  data_vencimento,
  data_emissao,
  status,
  origem
) VALUES (
  gen_random_uuid(),
  'FAT-TEST-001',
  'Mensalidade Teste - Janeiro 2026',
  '{SEU_ALUNO_ID}',  -- Substituir por ID real
  '{SUA_ASSINATURA_ID}',  -- Substituir por ID real
  150.00,
  150.00,
  0.00,
  CURRENT_DATE + INTERVAL '7 days',
  CURRENT_DATE,
  'PENDENTE',
  'ASSINATURA'
);
```

#### Passo 2: Acessar como Aluno
1. Login: `http://localhost:3000/auth/login`
2. Usuário: Aluno com fatura criada
3. Navegar para: **Financeiro** → **Minhas Faturas**

#### Passo 3: Processar Pagamento PIX
1. Localizar a fatura `FAT-TEST-001`
2. Clicar em **Pagar Online**
3. Selecionar aba **PIX**
4. Clicar em **Gerar QR Code**
5. Verificar:
   - ✅ QR Code exibido
   - ✅ Código PIX copiável
   - ✅ Contador de expiração (1 hora)
   - ✅ Botão "Copiar Código PIX" funciona

#### Passo 4: Simular Pagamento (Sandbox)
No ambiente de sandbox da Paytime, o pagamento PIX é confirmado automaticamente após alguns segundos.

Aguardar:
- 🔄 Polling a cada 5 segundos
- ✅ Toast de sucesso "Pagamento confirmado!"
- ✅ Modal fecha automaticamente
- ✅ Fatura marcada como PAGA
- ✅ Transação criada com status CONFIRMADA

#### Verificar no Banco:
```sql
-- Verificar transação criada
SELECT 
  id,
  descricao,
  valor,
  status,
  metodo_pagamento,
  paytime_transaction_id,
  paytime_payment_type,
  paytime_metadata
FROM teamcruz.transacoes
WHERE fatura_id = '{ID_DA_FATURA}'
ORDER BY created_at DESC
LIMIT 1;

-- Verificar fatura atualizada
SELECT 
  numero_fatura,
  status,
  valor_pago,
  data_pagamento
FROM teamcruz.faturas
WHERE numero_fatura = 'FAT-TEST-001';
```

---

### Cenário 2: Pagamento com Cartão

#### Passo 1: Usar Fatura de Teste
Use a mesma fatura criada no Cenário 1, ou crie uma nova.

#### Passo 2: Preencher Formulário de Cartão
1. Clicar em **Pagar Online**
2. Selecionar aba **Cartão**
3. Preencher dados do cartão de teste:
   - **Número:** `5200000000001096` (Mastercard)
   - **Nome:** `JOAO DA SILVA`
   - **Validade:** `12/2028`
   - **CVV:** `123`
   - **CPF:** `12345678901`
   - **Parcelas:** `1x sem juros`

4. Preencher endereço de cobrança:
   - **CEP:** `29090390`
   - **Rua:** `Rua Teste`
   - **Número:** `123`
   - **Bairro:** `Centro`
   - **Cidade:** `Vitória`
   - **Estado:** `ES`

#### Passo 3: Processar Pagamento
1. Clicar em **Pagar com Cartão**
2. Verificar:
   - ✅ Loading exibido
   - ✅ Resposta em ~3 segundos
   - ✅ Toast de sucesso com últimos 4 dígitos
   - ✅ Modal fecha
   - ✅ Fatura atualizada

#### Cartões de Teste (Sandbox Paytime)
```
✅ APROVADO:
- 5200000000001096 (Mastercard)
- 4111111111111111 (Visa)

❌ RECUSADO:
- 5555555555554444 (Mastercard - sem limite)
- 4000000000000002 (Visa - bloqueado)
```

---

### Cenário 3: Pagamento com Boleto

#### Passo 1: Gerar Boleto
1. Clicar em **Pagar Online**
2. Selecionar aba **Boleto**
3. Clicar em **Gerar Boleto**

#### Passo 2: Verificar Dados do Boleto
1. Verificar:
   - ✅ Código de barras exibido
   - ✅ Linha digitável exibida
   - ✅ Botão "Copiar Código" funciona
   - ✅ Botão "Baixar PDF" funciona
   - ✅ Data de vencimento correta (+3 dias úteis)

#### Passo 3: Simular Pagamento (Sandbox)
No sandbox, boletos são confirmados automaticamente após 5 minutos.

Ou manualmente via webhook:
```bash
curl -X POST http://localhost:4000/webhooks/paytime \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: SUA_ASSINATURA" \
  -d '{
    "event": "transaction.paid",
    "data": {
      "id": "ID_TRANSACAO_PAYTIME",
      "status": "PAID",
      "amount": 15000
    }
  }'
```

---

## 🔍 Verificações de Segurança

### 1. Validação de Fatura
Tentar pagar fatura de outro aluno deve retornar:
```json
{
  "statusCode": 403,
  "message": "Você não tem permissão para pagar esta fatura"
}
```

### 2. Validação de Status
Tentar pagar fatura já paga deve retornar:
```json
{
  "statusCode": 400,
  "message": "Esta fatura já foi paga"
}
```

### 3. Validação de Establishment
Se unidade não tiver Paytime configurado:
```json
{
  "statusCode": 404,
  "message": "Esta unidade não possui integração Paytime configurada"
}
```

---

## 📊 Monitoramento de Transações

### Página de Admin: Transações Paytime
1. Acesse: `http://localhost:3000/financeiro/paytime-transacoes`
2. Funcionalidades:
   - ✅ Listar todas as transações Paytime
   - ✅ Filtrar por status (Confirmada/Pendente/Cancelada)
   - ✅ Filtrar por método (PIX/Cartão/Boleto)
   - ✅ Buscar por ID, nome do aluno
   - ✅ Ver totais por status
   - ✅ Exportar relatório

---

## 🐛 Troubleshooting

### Erro: "Establishment não encontrado"
**Solução:**
1. Verificar que a unidade tem vínculo com Establishment
2. Consultar: `SELECT * FROM teamcruz.paytime_unidades;`
3. Se não existir, criar vínculo no admin

### Erro: "Gateway não ativo"
**Solução:**
1. Verificar status dos gateways no Paytime
2. Consultar: `GET /api/establishments/{id}/gateways`
3. Reativar gateway se necessário

### QR Code não exibe
**Solução:**
1. Abrir DevTools (F12)
2. Verificar erro no console
3. Verificar resposta da API em Network tab
4. Confirmar que `paytime_metadata.qr_code` existe

### Polling não detecta pagamento
**Solução:**
1. Verificar se webhook está configurado
2. Testar webhook manualmente
3. Verificar logs do backend: `grep "Webhook recebido" logs/*.log`

### Cartão recusado em sandbox
**Solução:**
1. Usar cartões de teste válidos (lista acima)
2. Verificar se todos os campos estão preenchidos
3. Verificar se establishment está APPROVED

---

## 🎯 Checklist Final

Antes de considerar a integração completa:

### Backend
- [ ] Migration executada com sucesso
- [ ] Entities Transacao com campos Paytime
- [ ] PaytimeIntegrationService implementado
- [ ] PaytimeWebhookService implementado
- [ ] Controllers registrados no módulo
- [ ] Endpoints respondendo corretamente
- [ ] Logs detalhados habilitados

### Frontend
- [ ] ProcessarPagamentoModal funcional
- [ ] Aba PIX com QR Code e polling
- [ ] Aba Cartão com validações
- [ ] Aba Boleto com código de barras
- [ ] Botão "Pagar Online" visível em faturas
- [ ] Toast notifications funcionando
- [ ] Página de transações acessível

### Integração
- [ ] Establishment criado e aprovado
- [ ] Banking gateway ativo
- [ ] SubPaytime gateway ativo
- [ ] Planos comerciais vinculados
- [ ] Webhook configurado (se produção)
- [ ] Teste PIX completo e aprovado
- [ ] Teste Cartão completo e aprovado
- [ ] Teste Boleto completo e aprovado

### Segurança
- [ ] Validação de ownership (aluno só paga sua fatura)
- [ ] Validação de status (não pagar fatura já paga)
- [ ] Validação de establishment ativo
- [ ] Dados sensíveis não salvos (CVV, número completo)
- [ ] Webhook signature validada

---

## 📞 Suporte

Problemas? Verificar:
1. **Logs Backend:** `backend/logs/`
2. **Console Frontend:** DevTools → Console
3. **Network:** DevTools → Network
4. **Banco de Dados:** Queries diretas para debugging

---

**Última Atualização:** 04/02/2026  
**Versão:** 1.0
