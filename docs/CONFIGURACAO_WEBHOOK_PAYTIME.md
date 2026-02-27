# 🔔 Configuração de Webhook Paytime

## ✅ Status Atual
- ✅ Backend preparado e funcionando
- ✅ Endpoint: `/paytime/webhooks` (público, sem JWT, **sem prefixo /api**)
- ✅ Eventos suportados: `new-sub-transaction`, `updated-sub-transaction`, `new-billet`, `updated-billet-status`
- ✅ Interface de ativação de gateways disponível em `/admin/estabelecimentos`
- ⚠️ **Falta configurar no portal Paytime**

## 🧪 Teste Local (Desenvolvimento)

### Opção 1: Usando ngrok (Recomendado para testes)

1. **Instale o ngrok**:
   ```bash
   # Windows (via Chocolatey)
   choco install ngrok
   
   # Ou baixe de: https://ngrok.com/download
   ```

2. **Inicie seu backend local**:
   ```bash
   cd backend
   npm run start:dev
   # Backend rodando em http://localhost:3000
   ```

3. **Crie um túnel público**:
   ```bash
   ngrok http 3000
   ```

4. **Copie a URL gerada** (exemplo):
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:3000
   ```

5. **Configure no Portal Paytime**:
   - URL Webhook: `https://abc123.ngrok.io/paytime/webhooks`
   - Eventos: Marque todos
   - Salve

6. **Teste processando um pagamento**:
   - Faça um pagamento com cartão
   - Acompanhe logs no terminal do ngrok
   - Verifique logs do backend

### Opção 2: IP Público (se tiver)

Se seu servidor de desenvolvimento tem IP público (ex: `http://200.98.72.161:3000`):

1. **Certifique-se que a porta 3000 está aberta** no firewall
2. **Configure no Portal Paytime**:
   - URL: `http://200.98.72.161:3000/paytime/webhooks`
   - Eventos: Marque todos

⚠️ **Atenção**: IP público sem HTTPS pode ter restrições de segurança

## 🚀 Produção

### 1. Deploy do Backend

Certifique-se que o backend está rodando em produção:
```bash
# Exemplo com PM2
pm2 start ecosystem.config.js
pm2 logs
```

### 2. URL de Produção

Sua URL de webhook será:
```
https://api.teamcruz.com.br/paytime/webhooks
```

### 3. Configurar no Portal Paytime/Rykon-Pay

#### Acesse o Portal:
- **Sandbox**: https://dashboard.sandbox.paytime.com.br (ou similar)
- **Produção**: https://dashboard.paytime.com.br (ou similar)

#### Passos no Portal:

1. **Login** com suas credenciais

2. **Navegue para Configurações**:
   - Menu lateral → **Webhooks** ou **Integrações**
   - Ou: Configurações → API → Webhooks

3. **Adicionar Novo Webhook**:
   ```
   URL: https://api.teamcruz.com.br/paytime/webhooks
   Método: POST
   ```

4. **Selecione os Eventos**:
   - ✅ `new-billet` - Novo boleto criado
   - ✅ `updated-billet-status` - Status do boleto mudou
   - ✅ `new-sub-transaction` - Nova transação (PIX/Cartão)
   - ✅ `updated-sub-transaction` - Status da transação mudou

5. **Configurações Adicionais** (se disponível):
   - **Timeout**: 30 segundos
   - **Retentativas**: Sim (3 tentativas)
   - **Versão API**: v1 (ou a mais recente)

6. **Salvar** a configuração

7. **Testar** (se o portal tiver opção):
   - Clique em "Testar Webhook" ou "Test"
   - Verifique se recebeu no backend

## 🔍 Validar Funcionamento

### 1. Verificar Logs do Backend

```bash
# PM2
pm2 logs backend --lines 100

# Ou direto no terminal
tail -f backend.log
```

**O que procurar**:
```
[PaytimeWebhookController] 🔔 Webhook recebido: updated-sub-transaction
[PaytimeWebhookService] 📨 Webhook recebido: updated-sub-transaction
[PaytimeWebhookService] 🔍 Transação encontrada: xxx - Status atual: PENDENTE
[PaytimeWebhookService] ✅ Transação PAGA - Fatura baixada automaticamente
```

### 2. Testar com Pagamento Real

1. **Faça um pagamento com cartão** na aplicação
2. **Status inicial**: PENDING
3. **Aguarde 5-30 segundos**
4. **Verifique os logs** - deve aparecer o webhook
5. **O modal deve fechar automaticamente** e mostrar "✅ Pagamento aprovado!"
6. **Verifique no banco** - status deve estar CONFIRMADA

### 3. Verificar no Banco de Dados

```sql
-- Ver últimas transações
SELECT 
    id,
    descricao,
    valor,
    status,
    paytime_transaction_id,
    paytime_metadata->>'status' as paytime_status,
    created_at
FROM teamcruz.transacoes
ORDER BY created_at DESC
LIMIT 10;

-- Ver se fatura foi baixada
SELECT 
    f.numero_fatura,
    f.status as fatura_status,
    f.data_pagamento,
    t.status as transacao_status
FROM teamcruz.faturas f
LEFT JOIN teamcruz.transacoes t ON t.fatura_id = f.id
WHERE f.id = 'ID_DA_FATURA';
```

## 🐛 Troubleshooting

### Webhook não está chegando

**Problema**: Pagamento fica PENDING, webhook nunca chega

**Verificações**:

1. **URL cadastrada corretamente?**
   ```bash
   # Teste direto
   curl -X POST https://api.teamcruz.com.br/paytime/webhooks \
     -H "Content-Type: application/json" \
     -d '{
       "event": "updated-sub-transaction",
       "event_date": "2026-02-06T10:00:00Z",
       "data": {
         "_id": "test123",
         "status": "PAID"
       }
     }'
   ```

2. **Firewall bloqueando?**
   - Verifique se porta 443 (HTTPS) está aberta
   - Libere IPs da Paytime se necessário

3. **SSL/HTTPS funcionando?**
   ```bash
   # Teste o certificado
   curl -I https://api.teamcruz.com.br
   ```

4. **Ambiente correto?**
   - Sandbox → Configure webhook no portal sandbox
   - Produção → Configure webhook no portal produção

### Webhook chega mas não processa

**Problema**: Logs mostram webhook mas transaction não atualiza

**Debug**:

1. **Verifique os logs detalhados**:
   ```typescript
   // No backend/src/paytime/paytime-webhook.service.ts
   // Os logs já estão configurados, verifique:
   [PaytimeWebhookService] ⚠️ Transação não encontrada para transação XXX
   ```

2. **Verifique se o ID bate**:
   ```sql
   SELECT * FROM teamcruz.transacoes 
   WHERE paytime_transaction_id = 'ID_DO_WEBHOOK';
   ```

3. **Erro no processamento?**
   - Logs devem mostrar o erro específico
   - Pode ser problema de conexão com banco
   - Pode ser validação falhando

### Frontend não detecta mudança

**Problema**: Webhook processou mas frontend não atualiza

**Verificações**:

1. **Polling está ativo?**
   - Deve ter transacaoId setado
   - Deve estar na aba "cartao"
   - Verifica a cada 5 segundos

2. **Endpoint de status funcionando?**
   ```bash
   # Teste direto
   curl https://api.teamcruz.com.br/financeiro/pagamentos-online/status/TRANSACAO_ID \
     -H "Authorization: Bearer SEU_TOKEN"
   ```

3. **Console do navegador**:
   - Abra DevTools (F12)
   - Aba Network
   - Filtre por "status"
   - Deve aparecer requests a cada 5 segundos

## 📊 Monitoramento

### Criar dashboard de webhooks (Opcional)

Adicione uma tabela para registrar webhooks recebidos:

```sql
CREATE TABLE teamcruz.webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event VARCHAR(100) NOT NULL,
    transaction_id VARCHAR(100),
    payload JSONB,
    processed BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_transaction ON teamcruz.webhook_logs(transaction_id);
CREATE INDEX idx_webhook_logs_created ON teamcruz.webhook_logs(created_at DESC);
```

### Alertas (Opcional)

Configure alertas para:
- Webhooks com erro
- Transações PENDING há mais de 1 hora
- Falhas consecutivas de webhook

## 📞 Suporte Paytime

Se mesmo após configurado não funcionar:

**Contato Rykon-Pay/Paytime**:
- Email: suporte@rykon-pay.com.br (verificar)
- Telefone: (verificar na documentação)
- Slack/Discord: (se tiver canal de suporte)

**Informações para o suporte**:
- Establishment ID: `155085` (do seu ambiente)
- Evento que não está funcionando
- Logs de erro (remova informações sensíveis)
- Timestamp do teste

## ✅ Checklist de Configuração

- [ ] Backend rodando em produção
- [ ] URL HTTPS funcionando
- [ ] Webhook cadastrado no portal Paytime
- [ ] Eventos selecionados (new-sub-transaction, updated-sub-transaction)
- [ ] Teste com curl funcionou (retornou 200)
- [ ] Teste com pagamento real
- [ ] Logs mostrando webhook recebido
- [ ] Status mudando de PENDING → CONFIRMADA
- [ ] Frontend detectando mudança (modal fecha)
- [ ] Fatura sendo baixada automaticamente

---

## 🎯 Próximos Passos

Após configurar o webhook:

1. **Teste todos os cenários**:
   - ✅ Cartão aprovado imediatamente
   - ✅ Cartão PENDING → PAID (via webhook)
   - ✅ PIX pago
   - ✅ Boleto gerado e pago
   - ⚠️ Cartão recusado
   - ⚠️ Chargeback

2. **Monitoramento em produção**:
   - Acompanhe primeiros dias
   - Verifique se todos os pagamentos são notificados
   - Ajuste timeouts se necessário

3. **Melhorias futuras**:
   - Implementar retry automático se webhook falhar
   - Dashboard de transações pendentes
   - Notificações por email quando pagamento confirmado
   - Implementar tokenização de cartão

---

**Data última atualização**: 06/02/2026
**Versão sistema**: 1.0.0
