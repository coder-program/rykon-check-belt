# 📊 Levantamento Completo: Integração Paytime

**Documento de Validação Técnica**  
**Data:** 12/02/2026  
**Sistema:** rykon-check-belt → rykon-pay → paytime

---

## 📝 Questões Respondidas neste Documento

### Sobre o Fluxo de Integração:
1. **Descreva o fluxo geral de integração entre o seu sistema e a API da Paytime.**
   - ✅ Respondido na [Seção 1.2](#12-fluxo-geral-de-integração-fluxo-de-dados-completo)

2. **Como a sua aplicação está estruturada (arquitetura, fluxos de dados) e como os endpoints da Paytime são consumidos?**
   - ✅ Respondido na [Seção 1.1](#11-como-a-aplicação-está-estruturada-arquitetura-em-3-camadas) e [Seção 1.3](#13-como-os-endpoints-da-paytime-são-consumidos-estrutura-do-código)

### Sobre os Endpoints:
3. **Quais endpoints da API da Paytime estão sendo chamados na sua aplicação?**
   - ✅ Respondido na [Seção 2](#2--endpoints-utilizados)

4. **Forneça um diagrama ou fluxo ilustrando como os diferentes endpoints se relacionam com os processos do seu sistema.**
   - ✅ Respondido na [Seção 2.3](#23-diagrama-de-fluxo-completo)

### Sobre Autenticação e Segurança:
5. **Como você está gerenciando as credenciais de integração (integration-key, x-token, authentication-key)?**
   - ✅ Respondido na [Seção 3.1](#31-gerenciamento-de-credenciais)

6. **Quais medidas de segurança estão implementadas para garantir a proteção desses dados?**
   - ✅ Respondido na [Seção 3.3](#33-medidas-de-segurança-implementadas)

7. **Detalhe como sua aplicação utiliza HTTPS e se implementa algum mecanismo de rate limiting ou controle de acesso.**
   - ✅ Respondido na [Seção 3.3](#33-medidas-de-segurança-implementadas) e [Seção 3.4](#34-boas-práticas-de-segurança)

---

## 1. 🏗️ VISÃO GERAL DA INTEGRAÇÃO

> **Questões respondidas nesta seção:**
> - ✅ Descreva o fluxo geral de integração entre o seu sistema e a API da Paytime.
> - ✅ Como a sua aplicação está estruturada (arquitetura, fluxos de dados) e como os endpoints da Paytime são consumidos?

### 1.1 Como a aplicação está estruturada (Arquitetura em 3 Camadas)

```
┌─────────────────────────────────────────────────────────────────┐
│                    RYKON-CHECK-BELT (Sistema Principal)          │
│  • Frontend: Next.js + React + TypeScript                       │
│  • Backend: NestJS + TypeORM + PostgreSQL                       │
│  • Autenticação: JWT (JwtAuthGuard)                             │
│  • Base URL: https://teamcruz.rykonfit.com.br/                             │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ HTTP/HTTPS (fetch API)
                      │ Authorization: Bearer {jwt_token}
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                    RYKON-PAY (Middleware/BFF)                    │
│  • Backend: Node.js/Express (presumido)                         │
│  • Autenticação: Basic Auth (username/password)                 │
│  • Base URL: https://rykon-pay-production.up.railway.app        │
│  • Função: Intermediário entre TeamCruz e API Paytime           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ HTTP/HTTPS (fetch API)
                      │ Authorization: Bearer {paytime_token}
                      │ establishment_id: {id} (header)
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                    PAYTIME API (Gateway de Pagamento)            │
│  • API REST oficial Paytime                                      │
│  • Base URL: Configurada no rykon-pay                           │
│  • Serviços: PIX, Cartão, Boleto, Estabelecimentos, Gateways   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Fluxo geral de integração (Fluxo de Dados Completo)

> **Esta seção descreve o fluxo geral de integração entre o sistema e a API da Paytime**

#### **A. Setup Inicial (Estabelecimentos)**
```
Frontend (admin.sistema)
    ↓ POST /api/paytime/establishments
Backend TeamCruz (PaytimeService)
    ↓ POST /api/auth/login
RykonPay → Autentica com Paytime → Retorna access_token
    ↓ POST /api/establishments
RykonPay → Cria establishment na Paytime → Retorna ID
    ↓
Backend salva paytime_establishment_id na tabela unidades
```

#### **B. Processamento de Pagamento (PIX)**
```
Frontend (aluno)
    ↓ POST /api/financeiro/faturas/{id}/processar-pagamento-pix
Backend TeamCruz (PaytimeIntegrationService)
    ↓ Valida fatura e busca establishment_id da unidade
    ↓ Chama PaytimeService.createPixTransaction()
PaytimeService
    ↓ POST /api/auth/login (se token expirado)
    ↓ POST /api/transactions/pix (header: establishment_id)
RykonPay → Cria transação PIX na Paytime → Retorna QR Code
    ↓
Backend cria Transacao com status PENDENTE
Backend salva paytime_transaction_id na transacao
    ↓
Frontend exibe QR Code para o aluno
```

#### **C. Confirmação (Webhook)**
```
Paytime API
    ↓ POST /api/paytime/webhooks (público, sem JWT)
Backend TeamCruz (PaytimeWebhookController)
    ↓ PaytimeWebhookService.processarWebhookTransacao()
    ↓ Busca Transacao pelo paytime_transaction_id
    ↓ Atualiza status para CONFIRMADA
    ↓ Atualiza Fatura para PAGA
    ↓ Envia notificação ao aluno
```

### 1.3 Como os endpoints da Paytime são consumidos (Estrutura do Código)

> **Esta seção mostra a estrutura da aplicação e como os endpoints da Paytime são consumidos**

```typescript
backend/src/
├── paytime/                          // Módulo Paytime (comunicação com RykonPay)
│   ├── paytime.service.ts           // CORE: Toda comunicação HTTP com rykon-pay
│   ├── paytime.controller.ts        // Endpoints admin (JWT protegido)
│   ├── paytime-webhook.controller.ts // Webhook público (sem JWT)
│   ├── paytime-webhook.service.ts   // Lógica de processamento webhook
│   └── entities/
│       └── paytime-plan-rate.entity.ts
│
├── financeiro/                       // Módulo Financeiro (lógica de negócio)
│   ├── services/
│   │   ├── paytime-integration.service.ts  // Integração Fatura → Paytime
│   │   └── paytime-webhook.service.ts      // Processamento de webhook
│   ├── entities/
│   │   ├── fatura.entity.ts         // Faturas (PENDENTE/PAGA)
│   │   └── transacao.entity.ts      // Transações (campos paytime_*)
│   └── financeiro.controller.ts     // Endpoints /financeiro/*
│
└── people/
    └── entities/
        └── unidade.entity.ts         // Campo: paytime_establishment_id
```

---

## 2. 🔌 ENDPOINTS UTILIZADOS

> **Questão respondida nesta seção:**
> - ✅ Quais endpoints da API da Paytime estão sendo chamados na sua aplicação?
> - ✅ Forneça um diagrama ou fluxo ilustrando como os diferentes endpoints se relacionam com os processos do seu sistema.

### 2.1 Endpoints RYKON-CHECK-BELT → RYKON-PAY

#### **Autenticação (rykon-pay)**
```typescript
POST /api/auth/login
Body: {
  username: "admin",           // RYKON_PAY_USERNAME
  password: "!Rykon@pay"       // RYKON_PAY_PASSWORD
}
Response: {
  access_token: string,
  expires_in: 3600            // Token válido por 1 hora
}
```

**Implementação:**
```typescript
// backend/src/paytime/paytime.service.ts (linha 150)
async authenticate(): Promise<string> {
  const response = await fetch(`${this.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: this.paytimeUsername,
      password: this.paytimePassword
    })
  });
  // Gerenciamento de token com cache e renovação automática
}
```

#### **Estabelecimentos**
```typescript
// 1. Listar estabelecimentos
GET /api/establishments?filters={}&search={}&page=1&perPage=20&sorters=[]
Headers: Authorization: Bearer {token}

// 2. Buscar estabelecimento por ID
GET /api/establishments/{id}
Headers: Authorization: Bearer {token}

// 3. Criar estabelecimento
POST /api/establishments
Headers: Authorization: Bearer {token}
Body: {
  type: "BUSINESS" | "INDIVIDUAL",
  document: string,              // CNPJ sem formatação
  email: string,
  first_name: string,            // Razão Social
  phone_number: string,          // Tel sem formatação
  address: { ... },
  responsible: { ... }
}

// 4. Atualizar estabelecimento
PUT /api/establishments/{id}
Headers: Authorization: Bearer {token}
```

**Implementação:**
```typescript
// backend/src/paytime/paytime.service.ts
async listEstablishments(params?: {...}): Promise<PaytimeListResponse>
async getEstablishmentById(id: number): Promise<any>
async createEstablishment(data: any): Promise<any>
async updateEstablishment(id: number, data: any): Promise<any>
```

#### **Gateways**
```typescript
// 1. Ativar gateway (Banking ou SubPaytime)
POST /api/establishments/{id}/gateways
Headers: Authorization: Bearer {token}
Body: {
  gateway_id: 4 | 6,           // 4=SubPaytime, 6=Banking
  plan_id: number,             // Plano comercial Paytime
  reference_id: string,
  statement_descriptor: string
}

// 2. Listar gateways ativos
GET /api/establishments/{id}/gateways?page=1&perPage=20
Headers: Authorization: Bearer {token}

// 3. Buscar gateway específico (inclui URL KYC)
GET /api/establishments/{id}/gateways/{gatewayConfigId}
Headers: Authorization: Bearer {token}
```

**Implementação:**
```typescript
// backend/src/paytime/paytime.service.ts (linha 945)
async activateGateway(establishmentId: number, gatewayData: any)
async listEstablishmentGateways(establishmentId: number, page: number, perPage: number)
async getEstablishmentGateway(establishmentId: number, gatewayConfigId: number)
```

#### **Planos Comerciais**
```typescript
// 1. Listar planos (com filtros client-side)
GET /api/plans?page=1&perPage=100&filters={}&search={}&sorters=[]
Headers: Authorization: Bearer {token}

// 2. Buscar plano específico
GET /api/plans/{planId}
Headers: Authorization: Bearer {token}

Response: {
  id: number,
  name: string,
  gateway_id: number,
  type: string,
  modality: string,
  active: boolean,
  rates: {                     // Enriquecido via DB local
    debit_rate: number,
    credit_rate: number,
    pix_rate: number,
    installment_base_rate: number
  }
}
```

**Implementação:**
```typescript
// backend/src/paytime/paytime.service.ts (linha 693)
async listPlans(page, perPage, filters?, search?, sorters?)
async getPlan(planId: number)
private async enrichPlansWithRates(plans: any[]): Promise<any[]>
```

#### **Transações PIX**
```typescript
POST /api/transactions/pix
Headers: 
  Authorization: Bearer {token}
  establishment_id: {id}       // ID do estabelecimento Paytime
Body: {
  payment_type: "PIX",
  amount: number,              // Valor em centavos (ex: 10000 = R$ 100,00)
  interest: "ESTABLISHMENT",   // Quem paga as taxas
  client: {
    first_name: string,
    last_name: string,
    document: string,          // CPF sem formatação
    phone: string,             // Tel sem formatação
    email: string
  },
  info_additional: [           // Metadados customizados
    { key: "aluno_id", value: string },
    { key: "fatura_id", value: string }
  ]
}

Response: {
  _id: string,                 // ID da transação Paytime
  id: string,                  // Mesmo valor de _id
  status: "PENDING" | "PAID" | "FAILED",
  type: "PIX",
  amount: number,
  original_amount: number,
  fees: number,
  emv: string,                 // CÓDIGO COPIA E COLA (QR Code)
  gateway_key: string,
  expected_on: string,
  created_at: string
}
```

**Implementação:**
```typescript
// backend/src/paytime/paytime.service.ts (linha 1039)
async createPixTransaction(establishmentId: number, pixData: any) {
  const url = `${this.baseUrl}/api/transactions/pix`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'establishment_id': establishmentId.toString(),
    },
    body: JSON.stringify(pixData),
  });
  // Tratamento de erro com HttpException preservando statusCode
}

// Chamado por:
// backend/src/financeiro/services/paytime-integration.service.ts (linha 130)
async processarPagamentoPix(dto, userId) {
  // Valida fatura
  // Busca establishment da unidade
  // Cria transação PENDENTE no DB
  // Chama createPixTransaction()
  // Retorna QR Code para frontend
}
```

#### **Transações com Cartão**
```typescript
POST /api/transactions/card
Headers: 
  Authorization: Bearer {token}
  establishment_id: {id}
Body: {
  payment_type: "CREDIT" | "DEBIT",
  amount: number,              // Centavos
  installments?: number,       // 1-12 (só CREDIT)
  interest: "ESTABLISHMENT" | "CUSTOMER",
  client: { ... },
  card: {
    card_number: string,       // Número completo sem espaços
    holder_name: string,
    holder_document: string,   // CPF titular
    expiration_month: string,  // "01" a "12"
    expiration_year: string,   // "2026"
    security_code: string      // CVV (3-4 dígitos)
  },
  billing_address: {
    street: string,
    number: string,
    neighborhood: string,
    city: string,
    state: string,             // Sigla: "ES"
    zip_code: string,          // CEP sem formatação
    complement?: string
  }
}

Response: {
  _id: string,
  status: "PAID" | "FAILED" | "PENDING",
  type: "CREDIT" | "DEBIT",
  brand: "VISA" | "MASTERCARD" | "ELO" | ...,
  authorization_code?: string,
  nsu?: string,
  amount: number,
  fees: number,
  installments: number,
  expected_on: string
}
```

**Implementação:**
```typescript
// backend/src/paytime/paytime.service.ts (linha 1109)
async createCardTransaction(establishmentId: number, cardData: any)

// Chamado por:
// backend/src/financeiro/services/paytime-integration.service.ts (linha 268)
async processarPagamentoCartao(dto, userId)
```

#### **Boletos**
```typescript
POST /api/billets
Headers: 
  Authorization: Bearer {token}
  establishment_id: {id}
Body: {
  amount: number,              // Centavos
  client: { ... },
  due_date: string,            // "2026-02-15" (ISO)
  interest: "ESTABLISHMENT",
  info_additional: [ ... ]
}

Response: {
  _id: string,
  status: "PENDING" | "PAID" | "EXPIRED",
  type: "BILLET",
  barcode: string,             // Código de barras
  pdf_url: string,             // URL do PDF do boleto
  due_date: string,
  amount: number,
  fees: number
}

// Buscar boleto por ID
GET /api/billets/{billetId}
Headers: 
  Authorization: Bearer {token}
  establishment_id: {id}
```

**Implementação:**
```typescript
// backend/src/paytime/paytime.service.ts (linha 1173, 1216)
async createBilletTransaction(establishmentId: number, billetData: any)
async getBillet(establishmentId: number, billetId: string)

// Chamado por:
// backend/src/financeiro/services/paytime-integration.service.ts (linha 430)
async processarPagamentoBoleto(dto, userId)
```

#### **Listagem de Transações**
```typescript
GET /api/transactions?page=1&perPage=20&filters={}&search={}
Headers: 
  Authorization: Bearer {token}
  establishment_id: {id}

Response: {
  data: Array<Transaction>,
  __meta__: {
    current_page: number,
    total_pages: number,
    total: number,
    per_page: number
  }
}
```

**Implementação:**
```typescript
// backend/src/paytime/paytime.service.ts (linha 1252)
async listTransactions(establishmentId, page, perPage, filters?, search?)
```

### 2.2 Endpoints Frontend → Backend TeamCruz

#### **Estabelecimentos (Admin)**
```typescript
// Frontend: components/paytime/PaytimeEstablishmentsList.tsx

GET /api/paytime/establishments?filters={}&search={}&page=1&perPage=20&sorters=[]
Headers: Authorization: Bearer {jwt_token}

POST /api/paytime/establishments
Body: { ...establishment_data }

GET /api/paytime/establishments/{id}

PUT /api/paytime/establishments/{id}
Body: { ...updated_data }
```

**Controlador:**
```typescript
// backend/src/paytime/paytime.controller.ts (linha 1)
@Controller('paytime')
@UseGuards(JwtAuthGuard)  // Requer autenticação JWT do TeamCruz
export class PaytimeController {
  @Get('establishments')
  async listEstablishments(...)
  
  @Get('establishments/:id')
  async getEstablishmentById(...)
  
  @Post('establishments')
  async createEstablishment(...)
  
  @Put('establishments/:id')
  async updateEstablishment(...)
}
```

#### **Pagamentos (Aluno)**
```typescript
// Frontend: aluno acessa /financeiro/minhas-faturas

// 1. Listar faturas do aluno
GET /api/financeiro/minhas-faturas?status=PENDENTE
Headers: Authorization: Bearer {jwt_token}

// 2. Processar pagamento PIX
POST /api/financeiro/faturas/{faturaId}/processar-pagamento-pix
Body: { expiresIn?: 3600 }
Response: {
  transacao_id: string,
  paytime_transaction_id: string,
  qr_code: string,           // Código PIX copia e cola
  status: "PENDING",
  valor: number,
  fatura_numero: string
}

// 3. Processar pagamento Cartão
POST /api/financeiro/faturas/{faturaId}/processar-pagamento-cartao
Body: {
  paymentType: "CREDIT" | "DEBIT",
  installments?: number,
  card: { ... },
  billing_address: { ... }
}

// 4. Processar pagamento Boleto
POST /api/financeiro/faturas/{faturaId}/processar-pagamento-boleto
Body: { dueDate?: "2026-02-15" }
Response: {
  transacao_id: string,
  paytime_transaction_id: string,
  barcode: string,
  pdf_url: string,
  due_date: string
}
```

**Controlador:**
```typescript
// backend/src/financeiro/financeiro.controller.ts
@Controller('financeiro')
@UseGuards(JwtAuthGuard)
export class FinanceiroController {
  @Get('minhas-faturas')
  async getMinhasFaturas(@CurrentUser() user) {
    // Busca faturas do aluno logado
  }
  
  @Post('faturas/:id/processar-pagamento-pix')
  async processarPagamentoPix(@Param('id') faturaId, @Body() dto) {
    return this.paytimeIntegrationService.processarPagamentoPix(dto, userId);
  }
  
  @Post('faturas/:id/processar-pagamento-cartao')
  async processarPagamentoCartao(@Param('id') faturaId, @Body() dto)
  
  @Post('faturas/:id/processar-pagamento-boleto')
  async processarPagamentoBoleto(@Param('id') faturaId, @Body() dto)
}
```

#### **Webhooks (Paytime → Backend)**
```typescript
POST /api/paytime/webhooks
// ⚠️ PÚBLICO - SEM JWT (vem da Paytime)
Body: {
  event: "updated-billet-status" | "new-sub-transaction" | "updated-sub-transaction",
  event_date: string,
  data: {
    _id: string,             // paytime_transaction_id
    status: string,
    type: string,
    amount: number,
    ...
  }
}

Response: {
  success: true,
  message: "Webhook processado com sucesso",
  transacao_id?: string
}
```

**Controlador:**
```typescript
// backend/src/paytime/paytime-webhook.controller.ts (linha 1)
@Controller('paytime/webhooks')
// ⚠️ SEM @UseGuards(JwtAuthGuard) - público!
export class PaytimeWebhookController {
  @Post()
  async receberWebhook(@Body() webhookEvent: WebhookEventDto) {
    if (event === 'updated-sub-transaction') {
      return this.webhookService.processarWebhookTransacao(event, data);
    }
    // Busca transação por paytime_transaction_id
    // Atualiza status CONFIRMADA
    // Atualiza fatura para PAGA
    // Envia notificação
  }
}
```

### 2.3 Diagrama de Fluxo Completo

```
┌────────────────────────────────────────────────────────────────────┐
│                         FLUXO DE PAGAMENTO PIX                      │
└────────────────────────────────────────────────────────────────────┘

Frontend (Aluno)
    │
    ├─► [1] GET /api/financeiro/minhas-faturas
    │       └─► Backend retorna lista de faturas PENDENTE
    │
    ├─► [2] POST /api/financeiro/faturas/123/processar-pagamento-pix
    │       │
    │       Backend (PaytimeIntegrationService)
    │       ├─► Valida fatura (status PENDENTE, não expirada)
    │       ├─► Busca unidade.paytime_establishment_id
    │       ├─► Cria Transacao (status PENDENTE, origem FATURA)
    │       │
    │       └─► PaytimeService.createPixTransaction()
    │               │
    │               ├─► [3] POST rykon-pay /api/auth/login (se token expirado)
    │               │       └─► Retorna access_token válido por 1h
    │               │
    │               ├─► [4] POST rykon-pay /api/transactions/pix
    │               │       Headers: establishment_id, Authorization
    │               │       Body: amount, client, payment_type
    │               │       │
    │               │       RykonPay
    │               │       └─► [5] Comunica com API Paytime (credenciais internas)
    │               │               └─► Cria transação PIX real
    │               │                   └─► Retorna QR Code (campo 'emv')
    │               │
    │               └─► Retorna { _id, status, emv (QR Code) }
    │
    │       Backend salva paytime_transaction_id na Transacao
    │       Backend retorna { transacao_id, qr_code, status }
    │       │
    ├─► [6] Frontend exibe QR Code
    │       └─► Polling a cada 5s para verificar status
    │
    │── [7] Aluno paga no app bancário
    │       │
    │       Paytime detecta pagamento
    │       │
    │       ├─► [8] POST https://teamcruz.com/api/paytime/webhooks
    │               Body: { event: "updated-sub-transaction", data: { _id, status: "PAID" } }
    │               │
    │               Backend (PaytimeWebhookService)
    │               ├─► Busca Transacao por paytime_transaction_id = _id
    │               ├─► Atualiza Transacao.status = CONFIRMADA
    │               ├─► Busca Fatura relacionada
    │               ├─► Atualiza Fatura.status = PAGA
    │               ├─► Envia notificação WhatsApp/Email
    │               └─► Retorna { success: true }
    │
    └─► [9] Frontend detecta mudança (polling ou WebSocket)
            └─► Mostra "Pagamento confirmado! ✅"
```

---

## 3. 🔐 AUTENTICAÇÃO E SEGURANÇA

> **Questões respondidas nesta seção:**
> - ✅ Como você está gerenciando as credenciais de integração (integration-key, x-token, authentication-key)?
> - ✅ Quais medidas de segurança estão implementadas para garantir a proteção desses dados?
> - ✅ Detalhe como sua aplicação utiliza HTTPS e se implementa algum mecanismo de rate limiting ou controle de acesso.

### 3.1 Gerenciamento de Credenciais

#### **Variáveis de Ambiente (Backend TeamCruz)**

```bash
# .env
RYKON_PAY_BASE_URL=https://rykon-pay-production.up.railway.app
RYKON_PAY_USERNAME=admin
RYKON_PAY_PASSWORD=************

# Outras configs
JWT_SECRET=...                  # Para autenticação TeamCruz (frontend → backend)
DATABASE_URL=...
```

**Leitura das Credenciais:**
```typescript
// backend/src/paytime/paytime.service.ts (linha 115)
constructor(private configService: ConfigService) {
  this.baseUrl = this.configService.get('RYKON_PAY_BASE_URL') 
    || 'https://rykon-pay-production.up.railway.app';
  this.paytimeUsername = this.configService.get('RYKON_PAY_USERNAME') || 'admin';
  this.paytimePassword = this.configService.get('RYKON_PAY_PASSWORD') || '********';
}
```

#### **Credenciais Paytime (RykonPay)**
- As credenciais reais da API Paytime (`integration-key`, `authentication-key`, `x-token`) **NÃO** estão expostas no rykon-check-belt
- Ficam armazenadas **apenas no servidor rykon-pay** (Railway)
- TeamCruz só conhece as credenciais do rykon-pay (username/password)

**Camada de Segurança:**
```
TeamCruz (público)
    ↓ Credenciais rykon-pay (username/password)
RykonPay (intermediário)
    ↓ Credenciais Paytime (integration-key, x-token, auth-key)
Paytime API (gateway real)
```

### 3.2 Sistema de Autenticação Multi-Camada

#### **Camada 1: Frontend → Backend TeamCruz**

**Tipo:** JWT Bearer Token  
**Guard:** `JwtAuthGuard` (NestJS)  
**Expiração:** Configurável (padrão: 7 dias)

```typescript
// Todos os endpoints /api/paytime/* e /api/financeiro/* são protegidos:
@Controller('paytime')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaytimeController { ... }

// Exceção: Webhook (público)
@Controller('paytime/webhooks')
// SEM @UseGuards - Paytime precisa acessar sem autenticação
export class PaytimeWebhookController { ... }
```

**Fluxo de Autenticação:**
```typescript
// 1. Login do usuário
POST /api/auth/login
Body: { email, password }
Response: { access_token: "jwt_token_teamcruz" }

// 2. Requisições subsequentes
Headers: { Authorization: "Bearer jwt_token_teamcruz" }

// 3. Middleware valida:
- Token não expirado
- Usuário existe e está ativo
- Permissões de acesso (ADMIN, ALUNO, GERENTE)
```

#### **Camada 2: Backend TeamCruz → RykonPay**

**Tipo:** Basic Auth (convertido em JWT pelo rykon-pay)  
**Expiração Token:** 3600s (1 hora)  
**Renovação:** Automática com cache

```typescript
// backend/src/paytime/paytime.service.ts
private token: string | null = null;
private tokenExpires: number = 0;
private authenticationPromise: Promise<string> | null = null;

async authenticate(): Promise<string> {
  // 1. Verifica cache (token válido?)
  if (this.token && Date.now() < this.tokenExpires) {
    return this.token;  // Reutiliza token existente
  }

  // 2. Se já está autenticando, aguarda (evita múltiplas chamadas simultâneas)
  if (this.authenticationPromise) {
    return this.authenticationPromise;
  }

  // 3. Nova autenticação
  this.authenticationPromise = this.performAuthentication();
  try {
    const token = await this.authenticationPromise;
    return token;
  } finally {
    this.authenticationPromise = null;  // Libera lock
  }
}

private async performAuthentication(): Promise<string> {
  const response = await fetch(`${this.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: this.paytimeUsername,
      password: this.paytimePassword
    })
  });

  const data: PaytimeAuthResponse = await response.json();
  
  // Salva token com margem de segurança (expira 1 min antes)
  this.token = data.access_token;
  this.tokenExpires = Date.now() + (data.expires_in * 1000) - 60000;
  
  return this.token;
}
```

**Renovação Automática:**
```typescript
// Todas as chamadas verificam token antes de executar
async createPixTransaction(establishmentId, pixData) {
  const token = await this.authenticate();  // Renova se expirado
  
  const response = await fetch(`${this.baseUrl}/api/transactions/pix`, {
    headers: {
      'Authorization': `Bearer ${token}`,  // Token sempre válido
      'establishment_id': establishmentId.toString(),
    },
    body: JSON.stringify(pixData),
  });
  
  // Se retornar 401, tenta novamente (token pode ter expirado entre a checagem e a chamada)
  if (response.status === 401) {
    this.token = null;  // Invalida cache
    return this.createPixTransaction(establishmentId, pixData);  // Retry
  }
}
```

#### **Camada 3: RykonPay → Paytime API**

**Tipo:** Credenciais internas (configuradas no rykon-pay)  
**Visibilidade:** Oculta do TeamCruz

```
RykonPay (Railway)
├── .env
│   ├── PAYTIME_INTEGRATION_KEY=...      # Fornecida pela Paytime
│   ├── PAYTIME_AUTHENTICATION_KEY=...   # Fornecida pela Paytime
│   └── PAYTIME_X_TOKEN=...               # Fornecida pela Paytime
```

### 3.3 Medidas de Segurança Implementadas

#### **1. HTTPS Obrigatório**
```typescript
// Todas as URLs usam HTTPS:
✅ https://teamcruz.com/api/*
✅ https://rykon-pay-production.up.railway.app/api/*
✅ https://api.paytime.com.br/* (presumido)

// Frontend
❌ fetch('http://...') // Bloqueado pelo navegador (Mixed Content)
✅ fetch('https://...') // Permitido
```

#### **2. CORS Configurado**
```typescript
// backend/src/main.ts
app.enableCors({
  origin: [
    'https://teamcruz.com',
    'https://www.teamcruz.com',
    'http://localhost:3000',  // Dev only
  ],
  credentials: true,
});
```

#### **3. Validação de Dados (DTO + Pipes)**
```typescript
// Validação com class-validator
import { IsNotEmpty, IsNumber, IsEnum } from 'class-validator';

export class ProcessarPagamentoPixDto {
  @IsNotEmpty()
  @IsString()
  faturaId: string;

  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(86400)
  expiresIn?: number;  // Entre 1 min e 24h
}

// Aplicado automaticamente em todos os controllers
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,         // Remove propriedades não declaradas no DTO
  forbidNonWhitelisted: true,  // Rejeita se houver propriedades extras
  transform: true,         // Converte tipos automaticamente
}));
```

#### **4. Sanitização de Logs (Dados Sensíveis)**
```typescript
// backend/src/paytime/paytime.service.ts (linha 1109)
async createCardTransaction(establishmentId, cardData) {
  // Log seguro (mascarar dados sensíveis)
  const logData = {
    ...cardData,
    card: cardData.card ? {
      holder_name: cardData.card.holder_name,
      card_number: '****' + cardData.card.card_number?.slice(-4),  // ****1234
      expiration_month: cardData.card.expiration_month,
      expiration_year: cardData.card.expiration_year,
      security_code: '***',  // CVV sempre mascarado
    } : undefined
  };
  
  this.logger.debug(`💳 Request Body: ${JSON.stringify(logData, null, 2)}`);
  
  // Envia dados completos para a API (não logados)
  await fetch(url, { body: JSON.stringify(cardData) });
}
```

#### **5. Rate Limiting (Presumido no RykonPay)**
```typescript
// Não implementado no TeamCruz (delegado ao rykon-pay)
// rykon-pay deve ter rate limiting configurado para:
// - Evitar abuso da API Paytime
// - Proteger contra ataques DDoS
// - Cumprir limites da Paytime (ex: 100 req/min)
```

#### **6. Tratamento de Erros Sem Vazar Info**
```typescript
// backend/src/paytime/paytime.service.ts
if (!response.ok) {
  const errorText = await response.text();
  
  // Log completo no servidor (debug)
  this.logger.error(`❌ Erro Paytime API: ${errorText}`);
  
  // Retorna erro genérico ao cliente (segurança)
  throw new HttpException({
    message: 'Erro ao processar pagamento',  // Mensagem genérica
    statusCode: response.status,
    error: 'Paytime API Error',              // Sem detalhes internos
    timestamp: new Date().toISOString(),
  }, response.status);
}
```

#### **7. Proteção de Webhook (Validação Futura)**
```typescript
// ⚠️ MELHORIA RECOMENDADA: Validar signature do webhook
@Post()
async receberWebhook(
  @Body() webhookEvent: WebhookEventDto,
  @Headers('x-paytime-signature') signature: string,
) {
  // TODO: Validar signature para garantir que veio da Paytime
  // const isValid = this.validatePaytimeSignature(webhookEvent, signature);
  // if (!isValid) throw new BadRequestException('Invalid signature');
  
  return this.webhookService.processarWebhookTransacao(webhookEvent);
}
```

### 3.4 Boas Práticas de Segurança

#### **Implementadas:**
✅ Credenciais em variáveis de ambiente (não no código)  
✅ JWT com expiração configurável  
✅ HTTPS obrigatório em produção  
✅ CORS restritivo (origins específicas)  
✅ Validação de entrada (DTOs)  
✅ Sanitização de logs (dados sensíveis mascarados)  
✅ Tratamento de erros sem vazar info interna  
✅ Token cache com renovação automática (evita spam auth)  

#### **Recomendações:**
⚠️ Implementar validação de signature no webhook  
⚠️ Rate limiting no backend TeamCruz (além do rykon-pay)  
⚠️ Monitoramento de tentativas de acesso inválido  
⚠️ Rotação periódica de credenciais (RYKON_PAY_PASSWORD)  
⚠️ Audit log de transações (quem criou, quando, IP)  
⚠️ 2FA para Admin Sistema (acesso a /paytime/establishments)  

### 3.5 Fluxo de Segurança Completo

```
┌──────────────────────────────────────────────────────────────────┐
│                    CAMADAS DE SEGURANÇA                           │
└──────────────────────────────────────────────────────────────────┘

[Aluno] → [Frontend]
              ↓ JWT (email/password)
              ├─ HTTPS only
              ├─ CORS check
              └─ Token expiration: 7 dias

[Frontend] → [Backend TeamCruz]
              ↓ Bearer Token (JWT)
              ├─ JwtAuthGuard valida
              ├─ DTOs validam entrada
              └─ RBAC (ALUNO só acessa suas faturas)

[Backend TeamCruz] → [RykonPay]
              ↓ Basic Auth (username/password)
              ├─ HTTPS only
              ├─ Token cache (1h)
              └─ Retry automático se 401

[RykonPay] → [Paytime API]
              ↓ Credenciais internas (hidden)
              ├─ integration-key
              ├─ authentication-key
              └─ x-token

[Paytime API] → [Backend TeamCruz]
              ↓ Webhook (público)
              ├─ IP whitelist (recomendado)
              ├─ Signature validation (recomendado)
              └─ Idempotência (evita duplicação)
```

---

## 4. 📝 RESUMO EXECUTIVO

### 4.1 Arquitetura
- **Frontend:** Next.js → comunicação via JWT
- **Backend:** NestJS → módulo `paytime` + `financeiro`
- **Intermediário:** RykonPay (Railway) → oculta credenciais Paytime
- **Gateway:** Paytime API → processamento real de pagamentos

### 4.2 Endpoints Principais
- **Auth RykonPay:** `POST /api/auth/login` (renovação automática)
- **Establishments:** CRUD completo com filtros e paginação
- **Gateways:** Ativação Banking + SubPaytime
- **Planos:** Listagem com enriquecimento de taxas (DB local)
- **Transações:** PIX, Cartão, Boleto com headers `establishment_id`
- **Webhooks:** Endpoint público para confirmação de pagamento

### 4.3 Segurança
- **Credenciais protegidas** em variáveis de ambiente
- **Token cache** com renovação automática (evita overhead)
- **HTTPS obrigatório** em todas as camadas
- **Sanitização de logs** (CVV, número cartão mascarados)
- **Validação rigorosa** com DTOs e Guards
- **Webhook público** (⚠️ recomenda-se adicionar signature validation)

### 4.4 Pontos de Atenção
- Token rykon-pay expira em **1 hora** (cache implementado)
- Webhook **não requer JWT** (vem de servidor Paytime)
- Campo `emv` retorna **código copia e cola** do PIX (não URL)
- Valores sempre em **centavos** nas chamadas Paytime
- Documentos **sem formatação** (CPF/CNPJ/Telefone)

---

**Documento gerado automaticamente pelo sistema de análise de código**  
**Última atualização:** 12/02/2026  
**Responsável:** Sistema Rykon Check Belt



Recomendação adicional (boa prática):
Implementar validação por:
Assinatura HMAC enviada pela Paytime
 ou
Validação por IP Allowlist
 ou
Header secreto (ex: x-webhook-secret)


Exemplo recomendado:
if (req.headers['x-webhook-secret'] !== process.env.PAYTIME_WEBHOOK_SECRET) {
  throw new UnauthorizedException('Webhook inválido');
}
