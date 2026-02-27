# 📋 Evidências de Integração Paytime

**Empresa:** TeamCruz (Rykon Check Belt)  
**CNPJ:** [A PREENCHER]  
**Data:** 12/02/2026  
**Sistema:** rykon-check-belt → rykon-pay → paytime

---

## 📝 Observação Importante sobre Arquitetura

Nossa integração utiliza uma **arquitetura intermediária (BFF - Backend for Frontend)**:

```
rykon-check-belt → rykon-pay → Paytime API
```

- As credenciais Paytime (`integration-key`, `x-token`, `authentication-key`) ficam **protegidas no servidor rykon-pay**
- O sistema principal (rykon-check-belt) se comunica com rykon-pay usando autenticação básica
- O rykon-pay faz as chamadas reais à API Paytime com as credenciais oficiais

**Benefícios dessa abordagem:**
- ✅ Maior segurança (credenciais nunca expostas no sistema principal)
- ✅ Centralização da lógica de comunicação com Paytime
- ✅ Facilita manutenção e atualizações

---

## 📸 COMO USAR ESTA SEÇÃO

Para cada endpoint listado abaixo, você deve:

1. **Fazer a requisição real** usando Postman, Insomnia ou similar
2. **Tirar screenshot mostrando:**
   - URL completa da requisição
   - Método HTTP (POST, GET, PUT)
   - Headers (Authorization, Content-Type, establishment_id)
   - Body da requisição (se houver)
   - Response completa com status code
   - IDs retornados (_id, id, etc.)

3. **Salvar os prints** com nomes descritivos:
   - `01-auth-request.png`
   - `02-auth-response.png`
   - `03-establishment-create-request.png`
   - etc.

4. **Inserir no PDF final** após cada seção de código

---

## 1️⃣ CÓDIGO E HEADERS - AUTENTICAÇÃO

### Endpoint de Autenticação com RykonPay

**Arquivo:** `backend/src/paytime/paytime.service.ts` (linha 152)

```typescript
async authenticate(): Promise<string> {
  const response = await fetch(`${this.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: this.paytimeUsername,  // RYKON_PAY_USERNAME
      password: this.paytimePassword   // RYKON_PAY_PASSWORD
    })
  });

  const data: PaytimeAuthResponse = await response.json();
  
  // Token retornado válido por 1 hora
  this.token = data.access_token;
  this.tokenExpires = Date.now() + (data.expires_in * 1000) - 60000;
  
  return this.token;
}
```

**Headers da Requisição:**
```
POST https://rykon-pay-production.up.railway.app/api/auth/login
Content-Type: application/json
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
```

**🖼️ PRINT NECESSÁRIO:**
- [ ] Screenshot do Postman/Insomnia mostrando requisição de autenticação
- [ ] Screenshot mostrando response com access_token

**📋 O QUE DEVE APARECER NO PRINT:**

**ENDPOINT 1: Requisição de Autenticação**
```
[INSERIR PRINT AQUI - Exemplo do que deve conter:]

Postman/Insomnia mostrando:
┌─────────────────────────────────────────────────────────────┐
│ POST https://rykon-pay-production.up.railway.app/api/auth/login │
├─────────────────────────────────────────────────────────────┤
│ Headers:                                                     │
│   Content-Type: application/json                            │
│                                                              │
│ Body (JSON):                                                 │
│   {                                                          │
│     "username": "admin",                                     │
│     "password": "!Rykon@pay"                                 │
│   }                                                          │
└─────────────────────────────────────────────────────────────┘
```

**ENDPOINT 2: Response de Autenticação**
```
[INSERIR PRINT AQUI - Exemplo do que deve conter:]

Response mostrando:
┌─────────────────────────────────────────────────────────────┐
│ Status: 200 OK                                               │
│ Time: 150ms                                                  │
├─────────────────────────────────────────────────────────────┤
│ Response Body:                                               │
│   {                                                          │
│     "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",     │
│     "expires_in": 3600                                       │
│   }                                                          │
└─────────────────────────────────────────────────────────────┘
```

**💡 DICA:** Use Ctrl+Shift+S ou ferramenta de captura de tela para salvar os prints

---

## 2️⃣ ESTABELECIMENTOS

### Endpoint: Criar Estabelecimento

**Arquivo:** `backend/src/paytime/paytime.service.ts` (linha 335)

```typescript
async createEstablishment(data: any): Promise<any> {
  const token = await this.authenticate();

  const response = await fetch(
    `${this.baseUrl}/api/establishments`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  const result = await response.json();
  return result;
}
```

**Headers da Requisição:**
```
POST https://rykon-pay-production.up.railway.app/api/establishments
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Body Example:**
```json
{
  "type": "BUSINESS",
  "document": "11222333000181",
  "email": "contato@teamcruz.com",
  "first_name": "TeamCruz LTDA",
  "phone_number": "27998765431",
  "address": {
    "zip_code": "29090390",
    "street": "Rua Exemplo",
    "neighborhood": "Bairro",
    "city": "Vitória",
    "state": "ES",
    "number": "123"
  },
  "responsible": {
    "email": "responsavel@teamcruz.com",
    "document": "12345678901",
    "first_name": "João Silva",
    "phone": "27999999999",
    "birthdate": "1990-01-01"
  }
}
```

### ✅ EVIDÊNCIAS ESTABELECIMENTOS

**IDs dos Estabelecimentos Criados:**

| Estabelecimento | ID Paytime | Status | Data Criação |
|----------------|------------|--------|--------------|
| [Nome 1] | [ID a preencher] | APPROVED | [Data] |
| [Nome 2] | [ID a preencher] | APPROVED | [Data] |

**🖼️ PRINTS NECESSÁRIOS:**
- [ ] Screenshot do código mostrando criação de establishment
- [ ] Screenshot do Postman/Insomnia com requisição POST /establishments
- [ ] Screenshot do response mostrando ID retornado
- [ ] Screenshot da lista de establishments na interface

**📋 O QUE DEVE APARECER NOS PRINTS:**

**ENDPOINT 3: Requisição Criar Estabelecimento**
```
[INSERIR PRINT AQUI - Exemplo do que deve conter:]

Postman/Insomnia mostrando:
┌─────────────────────────────────────────────────────────────┐
│ POST https://rykon-pay-production.up.railway.app/api/establishments │
├─────────────────────────────────────────────────────────────┤
│ Headers:                                                     │
│   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI...     │
│   Content-Type: application/json                            │
│                                                              │
│ Body (JSON):                                                 │
│   {                                                          │
│     "type": "BUSINESS",                                      │
│     "document": "11222333000181",                            │
│     "email": "contato@teamcruz.com",                         │
│     "first_name": "TeamCruz LTDA",                           │
│     ...                                                      │
│   }                                                          │
└─────────────────────────────────────────────────────────────┘
```

**ENDPOINT 4: Response Estabelecimento Criado**
```
[INSERIR PRINT AQUI - Exemplo do que deve conter:]

Response mostrando:
┌─────────────────────────────────────────────────────────────┐
│ Status: 201 Created                                          │
├─────────────────────────────────────────────────────────────┤
│ Response Body:                                               │
│   {                                                          │
│     "id": 12345,              ← IMPORTANTE! Anotar este ID   │
│     "status": "PENDING",                                     │
│     "type": "BUSINESS",                                      │
│     "document": "11222333000181",                            │
│     "email": "contato@teamcruz.com",                         │
│     ...                                                      │
│   }                                                          │
└─────────────────────────────────────────────────────────────┘
```

**Como obter os IDs:**
```bash
# Buscar no banco de dados ou fazer GET:
GET /api/establishments
```

---

## 3️⃣ PIX

### Endpoint: Criar Transação PIX

**Arquivo:** `backend/src/paytime/paytime.service.ts` (linha 1039)

```typescript
async createPixTransaction(establishmentId: number, pixData: any) {
  const token = await this.authenticate();

  const response = await fetch(
    `${this.baseUrl}/api/transactions/pix`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'establishment_id': establishmentId.toString(),
      },
      body: JSON.stringify(pixData),
    }
  );

  const data = await response.json();
  return data;
}
```

**Headers da Requisição:**
```
POST https://rykon-pay-production.up.railway.app/api/transactions/pix
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
establishment_id: 12345
```

**Body Example:**
```json
{
  "payment_type": "PIX",
  "amount": 10000,
  "interest": "ESTABLISHMENT",
  "client": {
    "first_name": "João",
    "last_name": "Silva",
    "document": "12345678901",
    "phone": "27999999999",
    "email": "joao@email.com"
  },
  "info_additional": [
    { "key": "aluno_id", "value": "123" },
    { "key": "fatura_id", "value": "456" }
  ]
}
```

**Response Example:**
```json
{
  "_id": "65abc123def456789",
  "status": "PENDING",
  "type": "PIX",
  "amount": 10000,
  "emv": "00020126580014br.gov.bcb.pix...",
  "gateway_key": "pix_key_123",
  "expected_on": "2026-02-12T18:00:00Z"
}
```

### ✅ EVIDÊNCIAS PIX

**IDs dos PIX Criados:**

| Fatura | ID Transação Paytime | Valor | Status | QR Code Gerado |
|--------|---------------------|-------|--------|----------------|
| [Número] | [_id a preencher] | R$ 100,00 | PENDING | ✅ Sim |
| [Número] | [_id a preencher] | R$ 150,00 | PAID | ✅ Sim |

**🖼️ PRINTS NECESSÁRIOS:**
- [ ] Screenshot do código mostrando criação de PIX
- [ ] Screenshot do Postman/Insomnia com requisição POST /transactions/pix
- [ ] Screenshot do response mostrando campo `emv` (QR Code)
- [ ] Screenshot da interface exibindo QR Code para o aluno
- [ ] Screenshot do webhook recebido com status PAID

**📋 O QUE DEVE APARECER NOS PRINTS:**

**ENDPOINT 5: Requisição Criar PIX**
```
[INSERIR PRINT AQUI - Exemplo do que deve conter:]

Postman/Insomnia mostrando:
┌─────────────────────────────────────────────────────────────┐
│ POST https://rykon-pay-production.up.railway.app/api/transactions/pix │
├─────────────────────────────────────────────────────────────┤
│ Headers:                                                     │
│   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI...     │
│   Content-Type: application/json                            │
│   establishment_id: 12345     ← ID do estabelecimento       │
│                                                              │
│ Body (JSON):                                                 │
│   {                                                          │
│     "payment_type": "PIX",                                   │
│     "amount": 10000,          ← R$ 100,00 em centavos       │
│     "interest": "ESTABLISHMENT",                             │
│     "client": { ... }                                        │
│   }                                                          │
└─────────────────────────────────────────────────────────────┘
```

**ENDPOINT 6: Response PIX Criado (QR Code)**
```
[INSERIR PRINT AQUI - Exemplo do que deve conter:]

Response mostrando:
┌─────────────────────────────────────────────────────────────┐
│ Status: 201 Created                                          │
├─────────────────────────────────────────────────────────────┤
│ Response Body:                                               │
│   {                                                          │
│     "_id": "65abc123def456789",  ← IMPORTANTE! Anotar       │
│     "status": "PENDING",                                     │
│     "type": "PIX",                                           │
│     "amount": 10000,                                         │
│     "emv": "00020126580014br.gov.bcb.pix...",  ← QR CODE!  │
│     "gateway_key": "pix_key_123",                           │
│     "expected_on": "2026-02-12T18:00:00Z"                   │
│   }                                                          │
└─────────────────────────────────────────────────────────────┘
```

**Logs do Sistema (para evidência):**
```typescript
// Logs disponíveis em backend/src/financeiro/services/paytime-integration.service.ts
this.logger.log(`✅ Transação PIX criada - ID: ${paytimeResponse._id}`);
this.logger.log(`✅ Código EMV (copia e cola): ${paytimeResponse.emv ? 'PRESENTE' : 'AUSENTE'}`);
```

---

## 4️⃣ CARTÃO DE CRÉDITO

### Endpoint: Criar Transação com Cartão

**Arquivo:** `backend/src/paytime/paytime.service.ts` (linha 1109)

```typescript
async createCardTransaction(establishmentId: number, cardData: any) {
  const token = await this.authenticate();

  const response = await fetch(
    `${this.baseUrl}/api/transactions/card`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'establishment_id': establishmentId.toString(),
      },
      body: JSON.stringify(cardData),
    }
  );

  const data = await response.json();
  return data;
}
```

**Headers da Requisição:**
```
POST https://rykon-pay-production.up.railway.app/api/transactions/card
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
establishment_id: 12345
```

**Body Example:**
```json
{
  "payment_type": "CREDIT",
  "amount": 15000,
  "installments": 3,
  "interest": "ESTABLISHMENT",
  "client": {
    "first_name": "Maria",
    "last_name": "Santos",
    "document": "98765432100",
    "phone": "27988888888",
    "email": "maria@email.com"
  },
  "card": {
    "card_number": "5555666677778888",
    "holder_name": "MARIA SANTOS",
    "holder_document": "98765432100",
    "expiration_month": "12",
    "expiration_year": "2028",
    "security_code": "123"
  },
  "billing_address": {
    "street": "Rua das Flores",
    "number": "456",
    "neighborhood": "Centro",
    "city": "Vitória",
    "state": "ES",
    "zip_code": "29010000"
  }
}
```

**Response Example:**
```json
{
  "_id": "65xyz789abc123def",
  "status": "PAID",
  "type": "CREDIT",
  "brand": "MASTERCARD",
  "authorization_code": "ABC123",
  "nsu": "789456",
  "amount": 15000,
  "installments": 3,
  "card": {
    "brand_name": "MASTERCARD",
    "first4_digits": "5555",
    "last4_digits": "8888"
  }
}
```

### ✅ EVIDÊNCIAS CARTÃO DE CRÉDITO

**IDs das Transações Criadas:**

| Tipo | ID Transação Paytime | Valor | Parcelas | Status | Bandeira |
|------|---------------------|-------|----------|--------|----------|
| CREDIT | [_id a preencher] | R$ 150,00 | 3x | PAID | MASTERCARD |
| DEBIT | [_id a preencher] | R$ 80,00 | 1x | PAID | VISA |

**🖼️ PRINTS NECESSÁRIOS:**
- [ ] Screenshot do código mostrando criação de transação cartão
- [ ] Screenshot do Postman/Insomnia com requisição POST /transactions/card
- [ ] Screenshot do response mostrando status PAID
- [ ] Screenshot do form de pagamento com cartão na interface
- [ ] Screenshot dos logs mascarados (CVV oculto)

**📋 O QUE DEVE APARECER NOS PRINTS:**

**ENDPOINT 7: Requisição Cartão de Crédito**
```
[INSERIR PRINT AQUI - Exemplo do que deve conter:]

Postman/Insomnia mostrando:
┌─────────────────────────────────────────────────────────────┐
│ POST https://rykon-pay-production.up.railway.app/api/transactions/card │
├─────────────────────────────────────────────────────────────┤
│ Headers:                                                     │
│   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI...     │
│   Content-Type: application/json                            │
│   establishment_id: 12345                                    │
│                                                              │
│ Body (JSON):                                                 │
│   {                                                          │
│     "payment_type": "CREDIT",                                │
│     "amount": 15000,          ← R$ 150,00 em centavos       │
│     "installments": 3,                                       │
│     "card": {                                                │
│       "card_number": "5555666677778888",                     │
│       "holder_name": "MARIA SANTOS",                         │
│       "security_code": "123"                                 │
│       ...                                                    │
│     }                                                        │
│   }                                                          │
└─────────────────────────────────────────────────────────────┘
```

**ENDPOINT 8: Response Cartão Aprovado**
```
[INSERIR PRINT AQUI - Exemplo do que deve conter:]

Response mostrando:
┌─────────────────────────────────────────────────────────────┐
│ Status: 201 Created                                          │
├─────────────────────────────────────────────────────────────┤
│ Response Body:                                               │
│   {                                                          │
│     "_id": "65xyz789abc123def",  ← IMPORTANTE! Anotar       │
│     "status": "PAID",            ← Aprovado!                 │
│     "type": "CREDIT",                                        │
│     "brand": "MASTERCARD",                                   │
│     "authorization_code": "ABC123",                          │
│     "nsu": "789456",                                         │
│     "amount": 15000,                                         │
│     "installments": 3,                                       │
│     "card": {                                                │
│       "first4_digits": "5555",                               │
│       "last4_digits": "8888"                                 │
│     }                                                        │
│   }                                                          │
└─────────────────────────────────────────────────────────────┘
```

**Sanitização de Logs (IMPLEMENTADA):**
```typescript
// Dados sensíveis sempre mascarados nos logs
const logData = {
  card: {
    card_number: '****' + cardData.card.card_number?.slice(-4), // ****8888
    security_code: '***', // CVV mascarado
  }
};
```

---

## 5️⃣ BOLETO

### Endpoint: Criar Boleto

**Arquivo:** `backend/src/paytime/paytime.service.ts` (linha 1173)

```typescript
async createBilletTransaction(establishmentId: number, billetData: any) {
  const token = await this.authenticate();

  const response = await fetch(
    `${this.baseUrl}/api/billets`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'establishment_id': establishmentId.toString(),
      },
      body: JSON.stringify(billetData),
    }
  );

  const data = await response.json();
  return data;
}
```

**Headers da Requisição:**
```
POST https://rykon-pay-production.up.railway.app/api/billets
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
establishment_id: 12345
```

**Body Example:**
```json
{
  "amount": 12000,
  "due_date": "2026-02-20",
  "interest": "ESTABLISHMENT",
  "client": {
    "first_name": "Pedro",
    "last_name": "Oliveira",
    "document": "11122233344",
    "phone": "27977777777",
    "email": "pedro@email.com"
  },
  "info_additional": [
    { "key": "aluno_id", "value": "789" },
    { "key": "fatura_id", "value": "101" }
  ]
}
```

**Response Example:**
```json
{
  "_id": "65billet123456789",
  "status": "PENDING",
  "type": "BILLET",
  "barcode": "34191790010104351004791020150008291070026000",
  "pdf_url": "https://paytime.com.br/boletos/65billet123456789.pdf",
  "due_date": "2026-02-20",
  "amount": 12000
}
```

### ✅ EVIDÊNCIAS BOLETO

**IDs dos Boletos Criados:**

| Fatura | ID Boleto Paytime | Valor | Vencimento | Status | PDF Gerado |
|--------|------------------|-------|------------|--------|------------|
| [Número] | [_id a preencher] | R$ 120,00 | 2026-02-20 | PENDING | ✅ Sim |
| [Número] | [_id a preencher] | R$ 200,00 | 2026-02-25 | PAID | ✅ Sim |

**🖼️ PRINTS NECESSÁRIOS:**
- [ ] Screenshot do código mostrando criação de boleto
- [ ] Screenshot do Postman/Insomnia com requisição POST /api/billets
- [ ] Screenshot do response mostrando `barcode` e `pdf_url`
- [ ] Screenshot do PDF do boleto gerado
- [ ] Screenshot da interface exibindo boleto para o aluno

---

## 6️⃣ IDPAY (ANTIFRAUDE)

### ⚠️ STATUS ATUAL: NÃO IMPLEMENTADO

O sistema está **preparado para receber** dados de antifraude da Paytime, mas **NÃO está enviando** os campos necessários:
- `session_id` (gerado pelo SDK IDPAY)
- `antifraud_type` ("IDPAY" ou "THREEDS")

**Código de Leitura (IMPLEMENTADO):**

**Arquivo:** `backend/src/financeiro/services/paytime-integration.service.ts` (linha 478)

```typescript
// Sistema LÊ dados de antifraude quando retornados pela Paytime
transacaoSalva.paytime_metadata = {
  antifraud: paytimeResponse.antifraud?.[0] ? {
    analyse_status: paytimeResponse.antifraud[0].analyse_status,
    analyse_required: paytimeResponse.antifraud[0].analyse_required,
    antifraud_id: paytimeResponse.antifraud[0].antifraud_id,
  } : null,
};

// Log quando antifraude é requerido
if (antifraudRequired) {
  this.logger.warn(
    `⚠️ Transação requer autenticação ANTIFRAUDE: ${antifraudRequired} (THREEDS ou IDPAY)`
  );
}
```

### ❌ EVIDÊNCIAS IDPAY - NÃO DISPONÍVEIS

**Motivo:** Funcionalidade não contratada/implementada

| Item | Status |
|------|--------|
| ID Transação Validação Aprovada | ❌ Não disponível |
| ID Transação Validação Inconclusiva | ❌ Não disponível |
| Print da Tela de Validação | ❌ Não disponível |

**🔮 PLANEJAMENTO FUTURO:**
- Página admin em `/admin/antifraude` criada mas inativa
- Interface mostra: "Módulo em Desenvolvimento"
- Backend preparado para integração futura

---

## 7️⃣ WEBHOOKS

### Endpoint: Receber Webhooks da Paytime

**Arquivo:** `backend/src/paytime/paytime-webhook.controller.ts`

```typescript
@Controller('paytime/webhooks')
// ⚠️ PÚBLICO - SEM JWT (Paytime precisa acessar)
export class PaytimeWebhookController {
  @Post()
  async receberWebhook(@Body() webhookEvent: WebhookEventDto) {
    const { event, data } = webhookEvent;

    if (event === 'updated-sub-transaction') {
      return this.webhookService.processarWebhookTransacao(event, data);
    }
    // Atualiza status da transação para CONFIRMADA
    // Atualiza fatura para PAGA
  }
}
```

**URL do Webhook (a cadastrar na Paytime):**
```
POST https://teamcruz.com/api/paytime/webhooks
```

**Body Example (enviado pela Paytime):**
```json
{
  "event": "updated-sub-transaction",
  "event_date": "2026-02-12T15:30:00Z",
  "data": {
    "_id": "65abc123def456789",
    "status": "PAID",
    "type": "PIX",
    "amount": 10000
  }
}
```

**🖼️ PRINTS NECESSÁRIOS:**
- [ ] Screenshot do código do webhook controller
- [ ] Screenshot dos logs mostrando webhook recebido
- [ ] Screenshot da fatura mudando de PENDENTE para PAGA

---

## 8️⃣ CONFIGURAÇÃO DE GATEWAYS

### Endpoint: Ativar Gateway SubPaytime

**Arquivo:** `backend/src/paytime/paytime.service.ts` (linha 945)

```typescript
async activateGateway(establishmentId: number, gatewayData: any) {
  const token = await this.authenticate();

  const response = await fetch(
    `${this.baseUrl}/api/establishments/${establishmentId}/gateways`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gatewayData),
    }
  );

  return await response.json();
}
```

**Body Example:**
```json
{
  "gateway_id": 4,
  "plan_id": 123,
  "reference_id": "SUBPAYTIME-12345-1707753600",
  "statement_descriptor": "TEAMCRUZ",
  "form_receipt": "PAYTIME"
}
```

**🖼️ PRINTS NECESSÁRIOS:**
- [ ] Screenshot da ativação do gateway Banking (ID 6)
- [ ] Screenshot da ativação do gateway SubPaytime (ID 4)
- [ ] Screenshot mostrando gateways ativos

---

## 📊 RESUMO DAS EVIDÊNCIAS

### ✅ Implementado e Funcional

| Funcionalidade | Status | Evidências |
|----------------|--------|------------|
| Autenticação | ✅ Implementado | Token JWT com cache (1h) |
| Estabelecimentos | ✅ Implementado | CRUD completo |
| PIX | ✅ Implementado | QR Code gerado |
| Cartão Crédito | ✅ Implementado | Com parcelamento |
| Cartão Débito | ✅ Implementado | Pagamento único |
| Boleto | ✅ Implementado | PDF + código barras |
| Webhooks | ✅ Implementado | Público, atualização automática |
| Gateways | ✅ Implementado | Banking + SubPaytime |

### ❌ Não Implementado

| Funcionalidade | Status | Observação |
|----------------|--------|------------|
| IDPAY | ❌ Não implementado | Backend preparado, aguardando contratação |
| 3D Secure | ❌ Não implementado | Backend preparado, aguardando contratação |

---

## 📸 CHECKLIST DE PRINTS

### Autenticação
- [ ] POST /api/auth/login - Request
- [ ] POST /api/auth/login - Response com access_token

### Estabelecimentos
- [ ] POST /api/establishments - Request com body
- [ ] POST /api/establishments - Response com ID
- [ ] GET /api/establishments - Lista de establishments
- [ ] Interface admin mostrando establishments

### PIX
- [ ] POST /api/transactions/pix - Request
- [ ] POST /api/transactions/pix - Response com campo `emv`
- [ ] Interface aluno mostrando QR Code
- [ ] Webhook recebido com status PAID
- [ ] Logs do sistema mostrando processamento

### Cartão
- [ ] POST /api/transactions/card - Request (dados mascarados)
- [ ] POST /api/transactions/card - Response PAID
- [ ] Interface form de pagamento
- [ ] Logs com CVV mascarado

### Boleto
- [ ] POST /api/billets - Request
- [ ] POST /api/billets - Response com barcode e pdf_url
- [ ] PDF do boleto gerado
- [ ] Interface mostrando boleto

### Webhooks
- [ ] Logs mostrando recebimento de webhook
- [ ] Transação sendo atualizada
- [ ] Fatura sendo baixada

---

## 🎯 TUTORIAL: COMO FAZER OS PRINTS

### Passo 1: Preparar o Postman/Insomnia

1. Abra o Postman ou Insomnia
2. Crie uma nova Collection chamada "Paytime Homologação"
3. Configure as variáveis de ambiente:
   ```
   RYKON_PAY_URL = https://rykon-pay-production.up.railway.app
   RYKON_PAY_USERNAME = admin
   RYKON_PAY_PASSWORD = !Rykon@pay
   ```

### Passo 2: Executar Requisições em Ordem

**Ordem recomendada:**

1. **Autenticação** → Guardar o `access_token`
   ```
   POST {{RYKON_PAY_URL}}/api/auth/login
   ```

2. **Criar Establishment** → Guardar o `id` retornado
   ```
   POST {{RYKON_PAY_URL}}/api/establishments
   Headers: Authorization: Bearer {{access_token}}
   ```

3. **Criar PIX** → Guardar o `_id` e campo `emv`
   ```
   POST {{RYKON_PAY_URL}}/api/transactions/pix
   Headers: 
     Authorization: Bearer {{access_token}}
     establishment_id: {{establishment_id}}
   ```

4. **Criar Cartão** → Guardar o `_id`
   ```
   POST {{RYKON_PAY_URL}}/api/transactions/card
   Headers: 
     Authorization: Bearer {{access_token}}
     establishment_id: {{establishment_id}}
   ```

5. **Criar Boleto** → Guardar o `_id` e `barcode`
   ```
   POST {{RYKON_PAY_URL}}/api/billets
   Headers: 
     Authorization: Bearer {{access_token}}
     establishment_id: {{establishment_id}}
   ```

### Passo 3: Tirar Screenshots

Para cada requisição acima:

1. **ANTES de enviar:** Tire print mostrando:
   - ✅ URL completa
   - ✅ Headers (Authorization visível)
   - ✅ Body formatado (JSON)

2. **DEPOIS de enviar:** Tire print mostrando:
   - ✅ Status code (200, 201, etc.)
   - ✅ Response completo
   - ✅ IDs retornados destacados

**💡 DICA:** Use a função "Screenshot" do próprio Postman (botão 📷)

### Passo 4: Organizar os Arquivos

Crie uma pasta chamada `prints-paytime/` e salve com nomes padronizados:

```
prints-paytime/
├── 01-auth-request.png
├── 02-auth-response.png
├── 03-establishment-request.png
├── 04-establishment-response.png
├── 05-pix-request.png
├── 06-pix-response-qrcode.png
├── 07-pix-interface-frontend.png
├── 08-card-request.png
├── 09-card-response-approved.png
├── 10-card-interface-frontend.png
├── 11-boleto-request.png
├── 12-boleto-response-barcode.png
├── 13-boleto-pdf-gerado.png
├── 14-webhook-log-received.png
├── 15-webhook-transacao-confirmada.png
└── 16-codigo-backend-paytime-service.png
```

### Passo 5: Preencher as Tabelas

Após executar todas as requisições, copie os IDs retornados e preencha as tabelas deste documento:

**Exemplo de preenchimento:**

| Estabelecimento | ID Paytime | Status | Data Criação |
|----------------|------------|--------|--------------|
| TeamCruz Vitória ES | **12345** | APPROVED | 12/02/2026 |
| TeamCruz Serra ES | **12346** | APPROVED | 12/02/2026 |

| Tipo | ID Transação Paytime | Valor | Status |
|------|---------------------|-------|--------|
| PIX | **65abc123def456789** | R$ 100,00 | PAID |
| CREDIT | **65xyz789abc123def** | R$ 150,00 | PAID |
| DEBIT | **65mno456pqr789stu** | R$ 80,00 | PAID |

### Passo 6: Montar o PDF Final

1. **Abrir este arquivo** (evidencias paytime.md) no VS Code
2. **Instalar extensão:** "Markdown PDF" ou usar um conversor online
3. **Inserir os prints** nas seções indicadas:
   - Copie os prints da pasta e cole após cada código
   - Use marcação: `![Descrição](caminho/do/print.png)`

4. **Abrir o outro arquivo** (validacaopaytime.md) 
5. **Converter ambos para PDF**
6. **Mesclar os PDFs** usando uma ferramenta como:
   - PDF24 Tools (online)
   - Adobe Acrobat
   - ou manter separados (total: 2 arquivos PDF)

### Passo 7: Enviar

```
Para: integracao@paytime.com.br
Assunto: Solicitação de Homologação - CNPJ: [SEU_CNPJ]

Anexos:
📄 01-validacao-paytime.pdf (respostas das perguntas)
📄 02-evidencias-paytime.pdf (prints + código)

Corpo do email:
---
Prezados,

Segue documentação completa para homologação da integração Paytime.

- Documento 1: Respostas técnicas sobre a integração
- Documento 2: Evidências de código e testes realizados

Estabelecimentos criados:
- ID 12345 - TeamCruz Vitória ES - Status APPROVED
- ID 12346 - TeamCruz Serra ES - Status APPROVED

Transações testadas:
- PIX: ID 65abc123def456789 - Status PAID
- Cartão Crédito: ID 65xyz789abc123def - Status PAID
- Boleto: ID 65billet123456789 - Status PENDING

Aguardamos retorno.

Atenciosamente,
[Seu Nome]
[Seu Cargo]
TeamCruz
---
```

---

## 📋 CHECKLIST FINAL ANTES DE ENVIAR

### Documentação
- [ ] Arquivo validacaopaytime.md revisado
- [ ] Arquivo evidencias paytime.md completo
- [ ] Todas as tabelas preenchidas com IDs reais
- [ ] Ambos convertidos para PDF

### Prints Obrigatórios (mínimo 16)
- [ ] 01-02: Autenticação (request + response)
- [ ] 03-04: Establishment (request + response com ID)
- [ ] 05-07: PIX (request + response + QR code na interface)
- [ ] 08-10: Cartão (request + response + form na interface)
- [ ] 11-13: Boleto (request + response + PDF)
- [ ] 14-15: Webhook (log recebido + transação confirmada)
- [ ] 16: Código backend (paytime.service.ts)

### Evidências por Produto
- [ ] **Estabelecimentos:** Mínimo 1 ID anotado
- [ ] **PIX:** Mínimo 1 ID com QR Code gerado
- [ ] **Cartão Crédito:** Mínimo 1 ID com status PAID
- [ ] **Boleto:** Mínimo 1 ID com barcode
- [ ] **IDPAY:** Marcar como "Não implementado" (conforme documentado)

### Informações Adicionais
- [ ] CNPJ preenchido no assunto do email
- [ ] Nome da empresa correto
- [ ] Establishment IDs vinculados às unidades corretas
- [ ] Observação sobre arquitetura intermediária incluída

---

## 💡 DICAS FINAIS

### Se alguma transação falhar:

1. **Verifique o token:** Pode ter expirado (validade: 1h)
   ```bash
   # Gere um novo token
   POST /api/auth/login
   ```

2. **Verifique o establishment_id:** Deve estar APPROVED
   ```bash
   GET /api/establishments/12345
   # Verifique: status === "APPROVED"
   ```

3. **Verifique os logs do backend:**
   ```bash
   cd backend
   npm run start:dev
   # Acompanhe logs no terminal
   ```

### Para ambiente de testes:

Use cartões de teste da Paytime (consulte documentação oficial):
- **Aprovado:** 5555 6666 7777 8888
- **Rejeitado:** 4111 1111 1111 1111
- **CVV:** Qualquer 3 dígitos
- **Validade:** Qualquer data futura

### Contato de suporte:

Se tiver dúvidas durante a homologação:
- 📧 integracao@paytime.com.br
- 📱 [Telefone se disponível]
- 📖 Documentação: [Link da doc oficial]

---

**Documento pronto para ser complementado com prints reais!** ✅

---

## 📧 CHECKLIST DE ENVIO

- [ ] Preencher todos os IDs das tabelas (establishments, PIX, cartão, boleto)
- [ ] Adicionar todos os prints listados acima
- [ ] Incluir o documento `validacaopaytime.md` (respostas das perguntas)
- [ ] Converter tudo para PDF
- [ ] Enviar para: integracao@paytime.com.br
- [ ] Assunto: **Solicitação de Homologação - CNPJ: [PREENCHER]**

---

## 🔗 ARQUIVOS RELACIONADOS

1. **validacaopaytime.md** - Respostas das perguntas técnicas
2. **evidencias paytime.md** - Este arquivo
3. Prints das requisições (Postman/Insomnia)
4. Prints da interface do sistema

---

**Documento preparado por:** Sistema Rykon Check Belt  
**Data:** 12/02/2026  
**Pronto para complementar com IDs reais e prints das requisições**
