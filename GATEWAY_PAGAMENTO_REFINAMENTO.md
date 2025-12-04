# 🏦 GATEWAY DE PAGAMENTOS TEAMCRUZ - REFINAMENTO COMPLETO

## 📋 VISÃO GERAL

Gateway próprio que atua como **intermediário inteligente** entre o sistema TeamCruz e operadoras de pagamento (Paytime, MercadoPago, Stripe, etc).

### Objetivo Principal

Centralizar, padronizar e gerenciar todas as transações financeiras do sistema, permitindo:

- Troca de operadora sem alterar código do TeamCruz
- Múltiplas operadoras simultâneas (fallback automático)
- Controle total sobre taxas, splits e comissionamento
- Analytics e monitoramento centralizado
- Compliance e auditoria

---

## 🎯 ANÁLISE DO SISTEMA ATUAL

### Entidades que Dependem do Gateway

#### 1. **Fatura** (Principal)

```typescript
{
  id: uuid
  numero_fatura: string (único)
  aluno_id: uuid
  assinatura_id: uuid (nullable)

  // Valores
  valor_original: decimal(10,2)
  valor_desconto: decimal(10,2)
  valor_acrescimo: decimal(10,2)
  valor_total: decimal(10,2)
  valor_pago: decimal(10,2)

  // Datas
  data_vencimento: date
  data_pagamento: date (nullable)

  // Status e Método
  status: PENDENTE | PAGA | VENCIDA | CANCELADA | PARCIALMENTE_PAGA | NEGOCIADA
  metodo_pagamento: PIX | CARTAO | BOLETO | DINHEIRO | TRANSFERENCIA

  // 🔑 Campos Críticos para Gateway
  gateway_payment_id: string (ID da transação na operadora)
  link_pagamento: string (URL checkout)
  qr_code_pix: text (Base64 ou URL)
  codigo_barras_boleto: string
  dados_gateway: jsonb (metadados da operadora)

  // Relacionamentos
  transacoes: Transacao[]
}
```

#### 2. **Assinatura** (Recorrência)

```typescript
{
  id: uuid
  aluno_id: uuid
  plano_id: uuid
  unidade_id: uuid

  status: ATIVA | PAUSADA | CANCELADA | INADIMPLENTE | EXPIRADA
  metodo_pagamento: PIX | CARTAO | BOLETO | DINHEIRO | TRANSFERENCIA

  valor: decimal(10,2)
  data_inicio: date
  data_fim: date
  proxima_cobranca: date
  dia_vencimento: int (1-31)

  // 🔑 Campos Críticos para Gateway
  token_cartao: string (token para cobrança recorrente)
  dados_pagamento: jsonb (dados seguros do cartão/pix)

  // Relacionamentos
  faturas: Fatura[] (geradas automaticamente)
}
```

#### 3. **Venda** (Pagamentos Instantâneos)

```typescript
{
  id: uuid;
  numero_venda: string(único);
  aluno_id: uuid;
  unidade_id: uuid;

  tipo_venda: PRODUTO | AULA_AVULSA | COMPETICAO | OUTRO;
  descricao: string;

  valor_bruto: decimal(10, 2);
  valor_desconto: decimal(10, 2);
  valor_liquido: decimal(10, 2);

  status: AGUARDANDO_PAGAMENTO | PAGO | CANCELADO | ESTORNADO | FALHOU;
  metodo_pagamento: PIX | CARTAO | BOLETO;

  // 🔑 Campos Críticos para Gateway
  gateway_payment_id: string;
  link_pagamento: string;
  qr_code_pix: text;
  dados_gateway: jsonb;

  data_venda: timestamp;
  data_pagamento: timestamp;
}
```

#### 4. **Transacao** (Registro Financeiro)

```typescript
{
  id: uuid
  tipo: ENTRADA | SAIDA
  origem: FATURA | VENDA | DESPESA | MANUAL | ESTORNO | GYMPASS | CORPORATE
  categoria: MENSALIDADE | PRODUTO | AULA_AVULSA | COMPETICAO | TAXA | OUTRO

  descricao: string
  aluno_id: uuid
  unidade_id: uuid
  fatura_id: uuid
  despesa_id: uuid

  valor: decimal(10,2)
  data: date
  status: CONFIRMADA | PENDENTE | CANCELADA | ESTORNADA

  metodo_pagamento: string
  comprovante: string (URL ou hash)
  observacoes: text
}
```

#### 5. **ConfiguracaoCobranca** (Regras da Unidade)

```typescript
{
  id: uuid
  unidade_id: uuid

  // Métodos Aceitos
  aceita_pix: boolean
  aceita_cartao: boolean
  aceita_boleto: boolean
  aceita_dinheiro: boolean
  aceita_transferencia: boolean

  // Regras de Cobrança
  multa_atraso_percentual: decimal(5,2) (ex: 2%)
  juros_diario_percentual: decimal(5,3) (ex: 0.033%)
  dias_bloqueio_inadimplencia: int (ex: 30)
  dia_vencimento_padrao: int (1-31)
  faturas_vencidas_para_inadimplencia: int (ex: 2)

  // 🔑 Configurações do Gateway
  gateway_tipo: string (PAYTIME | MERCADOPAGO | STRIPE)
  gateway_api_key: string (criptografado)
  gateway_secret_key: string (criptografado)
  gateway_modo_producao: boolean

  // Integrações Externas
  gympass_ativo: boolean
  gympass_unidade_id: string
  gympass_percentual_repasse: decimal(5,2)

  // Notificações
  enviar_lembrete_vencimento: boolean
  dias_antecedencia_lembrete: int (ex: 3)
}
```

### Fluxos Identificados

#### Fluxo 1: Cobrança Recorrente (Assinatura)

```
1. CRON Job (dia X do mês)
2. Sistema busca assinaturas ativas com proxima_cobranca = hoje
3. Gateway cria fatura para cada assinatura
4. Gateway chama operadora (Paytime) para gerar cobrança
5. Operadora retorna:
   - PIX: QR Code + copia-e-cola
   - Boleto: Código de barras + PDF
   - Cartão: Debita automático via token
6. Gateway atualiza fatura com dados da operadora
7. Gateway envia notificação ao aluno (email/WhatsApp)
8. Webhook da operadora confirma pagamento
9. Gateway atualiza status da fatura
10. Gateway cria transação de entrada
11. Gateway agenda próxima cobrança
```

#### Fluxo 2: Venda Instantânea (Produto/Aula Avulsa)

```
1. Recepcionista/Admin cria venda no sistema
2. Sistema chama Gateway para gerar pagamento
3. Gateway chama operadora (Paytime)
4. Operadora retorna link de checkout
5. Sistema exibe QR Code/Link para cliente
6. Cliente paga
7. Webhook da operadora notifica Gateway
8. Gateway atualiza venda para PAGO
9. Gateway cria transação de entrada
10. Gateway libera produto/aula
```

#### Fluxo 3: Pagamento Manual (Dinheiro/Transferência)

```
1. Recepcionista registra pagamento manual
2. Sistema cria transação diretamente
3. Sistema atualiza fatura para PAGA
4. Sistema NÃO chama Gateway/Operadora
5. Sistema gera comprovante interno
```

#### Fluxo 4: Estorno/Cancelamento

```
1. Admin solicita estorno de fatura
2. Gateway verifica se foi pago por operadora
3. Se SIM: Gateway chama API de refund da operadora
4. Operadora processa estorno
5. Webhook confirma estorno
6. Gateway cria transação de saída (estorno)
7. Gateway atualiza fatura para CANCELADA
8. Gateway notifica aluno
```

---

## 🏗️ ARQUITETURA DO GATEWAY TEAMCRUZ

### Camadas do Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    TEAMCRUZ FRONTEND                     │
│  (Dashboard, Faturas, Vendas, Assinaturas, Config)      │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS/REST
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   TEAMCRUZ BACKEND                       │
│         (NestJS - Controllers e Services)                │
└────────────────────┬────────────────────────────────────┘
                     │ Internal API
                     ▼
┌─────────────────────────────────────────────────────────┐
│              🏦 GATEWAY TEAMCRUZ (Novo)                  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │           CAMADA DE ABSTRAÇÃO                    │  │
│  │  • PaymentGatewayInterface                       │  │
│  │  • Métodos padronizados para todas operadoras    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │         ADAPTERS (Implementações)                │  │
│  │  • PaytimeAdapter                                │  │
│  │  • MercadoPagoAdapter                            │  │
│  │  • StripeAdapter                                 │  │
│  │  • PicPayAdapter                                 │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │         SERVICES (Lógica de Negócio)             │  │
│  │  • PaymentService                                │  │
│  │  • RecurrenceService                             │  │
│  │  • WebhookService                                │  │
│  │  • RefundService                                 │  │
│  │  • NotificationService                           │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │         MÓDULOS AUXILIARES                       │  │
│  │  • TokenVaultService (PCI Compliance)            │  │
│  │  • AntiFraudService                              │  │
│  │  • SplitService (Comissionamento)                │  │
│  │  • AnalyticsService                              │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │              DATABASE                            │  │
│  │  • gateway_transactions                          │  │
│  │  • gateway_webhooks                              │  │
│  │  • gateway_configs                               │  │
│  │  • gateway_logs                                  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS/API
                     ▼
┌─────────────────────────────────────────────────────────┐
│              OPERADORAS DE PAGAMENTO                     │
│  • Paytime API                                           │
│  • MercadoPago API                                       │
│  • Stripe API                                            │
│  • PicPay API                                            │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 COMPONENTES DETALHADOS

### 1. PaymentGatewayInterface (Contrato Padrão)

```typescript
interface PaymentGatewayInterface {
  // Criação de Pagamentos
  createPixPayment(params: CreatePixParams): Promise<PixPaymentResponse>;
  createBoletoPayment(
    params: CreateBoletoParams
  ): Promise<BoletoPaymentResponse>;
  createCardPayment(params: CreateCardParams): Promise<CardPaymentResponse>;

  // Tokenização (Recorrência)
  tokenizeCard(cardData: CardData): Promise<CardToken>;
  chargeToken(token: string, amount: number): Promise<ChargeResponse>;

  // Consultas
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
  getPaymentDetails(paymentId: string): Promise<PaymentDetails>;

  // Cancelamentos e Estornos
  cancelPayment(paymentId: string): Promise<CancelResponse>;
  refundPayment(paymentId: string, amount?: number): Promise<RefundResponse>;

  // Webhooks
  validateWebhook(signature: string, payload: any): boolean;
  processWebhook(payload: any): Promise<WebhookResult>;

  // Utilitários
  generateCheckoutUrl(paymentId: string): string;
  downloadBoleto(boletoId: string): Promise<Buffer>;
}
```

### 2. Entidades do Gateway (Novas Tabelas)

#### gateway_transactions

```sql
CREATE TABLE teamcruz.gateway_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Referências TeamCruz
  teamcruz_entity_type VARCHAR(50) NOT NULL, -- 'FATURA', 'VENDA', 'ASSINATURA'
  teamcruz_entity_id UUID NOT NULL,
  unidade_id UUID NOT NULL,
  aluno_id UUID,

  -- Dados da Transação
  transaction_type VARCHAR(20) NOT NULL, -- 'PAYMENT', 'REFUND', 'CHARGEBACK'
  payment_method VARCHAR(20) NOT NULL, -- 'PIX', 'BOLETO', 'CREDIT_CARD', 'DEBIT_CARD'

  -- Valores
  amount DECIMAL(10,2) NOT NULL,
  fee DECIMAL(10,2), -- Taxa da operadora
  net_amount DECIMAL(10,2), -- Valor líquido

  -- Status
  status VARCHAR(20) NOT NULL, -- 'PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'

  -- Operadora
  provider VARCHAR(50) NOT NULL, -- 'PAYTIME', 'MERCADOPAGO', 'STRIPE'
  provider_transaction_id VARCHAR(255) UNIQUE, -- ID na operadora
  provider_response JSONB, -- Resposta completa da API

  -- Dados de Pagamento
  pix_qr_code TEXT,
  pix_qr_code_base64 TEXT,
  pix_emv TEXT, -- Copia e cola
  boleto_barcode VARCHAR(255),
  boleto_url VARCHAR(500),
  boleto_pdf_url VARCHAR(500),
  checkout_url VARCHAR(500),

  -- Card (se aplicável)
  card_brand VARCHAR(20), -- VISA, MASTERCARD, ELO
  card_last_digits VARCHAR(4),
  card_token VARCHAR(255), -- Para recorrência

  -- Split de Pagamento
  split_rules JSONB, -- Regras de divisão (academia/franqueador/plataforma)

  -- Datas
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,
  expires_at TIMESTAMP, -- Vencimento do PIX/Boleto

  -- Auditoria
  created_by UUID,
  metadata JSONB, -- Campos extras

  -- Índices
  CONSTRAINT fk_unidade FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id),
  CONSTRAINT fk_aluno FOREIGN KEY (aluno_id) REFERENCES teamcruz.alunos(id)
);

CREATE INDEX idx_gateway_tx_entity ON teamcruz.gateway_transactions(teamcruz_entity_type, teamcruz_entity_id);
CREATE INDEX idx_gateway_tx_provider ON teamcruz.gateway_transactions(provider, provider_transaction_id);
CREATE INDEX idx_gateway_tx_status ON teamcruz.gateway_transactions(status);
CREATE INDEX idx_gateway_tx_unidade ON teamcruz.gateway_transactions(unidade_id);
```

#### gateway_webhooks

```sql
CREATE TABLE teamcruz.gateway_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  provider VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL, -- 'payment.paid', 'payment.failed', etc

  transaction_id UUID, -- Referência para gateway_transactions
  provider_transaction_id VARCHAR(255),

  payload JSONB NOT NULL, -- Payload completo do webhook
  signature VARCHAR(500), -- Assinatura para validação

  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSED', 'FAILED', 'IGNORED'
  processed_at TIMESTAMP,
  error_message TEXT,
  retry_count INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_transaction FOREIGN KEY (transaction_id) REFERENCES teamcruz.gateway_transactions(id)
);

CREATE INDEX idx_webhook_provider ON teamcruz.gateway_webhooks(provider, event_type);
CREATE INDEX idx_webhook_status ON teamcruz.gateway_webhooks(status);
CREATE INDEX idx_webhook_created ON teamcruz.gateway_webhooks(created_at DESC);
```

#### gateway_provider_configs

```sql
CREATE TABLE teamcruz.gateway_provider_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  unidade_id UUID NOT NULL,
  provider VARCHAR(50) NOT NULL, -- 'PAYTIME', 'MERCADOPAGO', 'STRIPE'

  is_active BOOLEAN DEFAULT TRUE,
  is_production BOOLEAN DEFAULT FALSE,

  -- Credenciais (CRIPTOGRAFADAS)
  api_key_encrypted TEXT NOT NULL,
  secret_key_encrypted TEXT NOT NULL,
  merchant_id VARCHAR(255),

  -- Configurações Específicas
  config JSONB, -- { "webhook_secret": "...", "pix_key": "...", etc }

  -- Split/Comissionamento
  platform_fee_percentage DECIMAL(5,2) DEFAULT 0, -- Taxa da plataforma
  franchise_fee_percentage DECIMAL(5,2) DEFAULT 0, -- Taxa do franqueador

  -- Prioridade (para múltiplas operadoras)
  priority INT DEFAULT 1, -- 1 = principal, 2 = backup

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_unidade FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id),
  CONSTRAINT unique_unidade_provider UNIQUE (unidade_id, provider)
);
```

#### gateway_logs

```sql
CREATE TABLE teamcruz.gateway_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  transaction_id UUID,

  level VARCHAR(20) NOT NULL, -- 'INFO', 'WARNING', 'ERROR', 'DEBUG'
  action VARCHAR(100) NOT NULL, -- 'CREATE_PAYMENT', 'PROCESS_WEBHOOK', 'REFUND', etc

  provider VARCHAR(50),

  request_data JSONB,
  response_data JSONB,
  error_message TEXT,

  duration_ms INT, -- Tempo de resposta da API

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_transaction FOREIGN KEY (transaction_id) REFERENCES teamcruz.gateway_transactions(id)
);

CREATE INDEX idx_logs_transaction ON teamcruz.gateway_logs(transaction_id);
CREATE INDEX idx_logs_created ON teamcruz.gateway_logs(created_at DESC);
CREATE INDEX idx_logs_level ON teamcruz.gateway_logs(level);
```

---

## 🔌 INTEGRAÇÃO COM PAYTIME

### Endpoints Necessários da Paytime

#### 1. Criar Cobrança PIX

```typescript
POST https://api.paytime.com.br/v1/charges/pix

Headers:
  Authorization: Bearer {api_key}
  Content-Type: application/json

Request:
{
  "customer": {
    "name": "João Silva",
    "email": "joao@email.com",
    "cpf": "12345678900",
    "phone": "11999999999"
  },
  "amount": 15000, // em centavos (R$ 150,00)
  "description": "Mensalidade Jiu-Jitsu - Janeiro/2025",
  "external_id": "FATURA-123456", // Nosso ID interno
  "expires_in": 3600, // 1 hora
  "callback_url": "https://teamcruz.com/api/gateway/webhook/paytime"
}

Response:
{
  "id": "pyt_abc123xyz",
  "status": "pending",
  "qr_code": "00020126360014br.gov.bcb.pix...",
  "qr_code_base64": "data:image/png;base64,iVBORw0KG...",
  "qr_code_url": "https://paytime.com.br/qr/abc123",
  "amount": 15000,
  "expires_at": "2025-01-15T12:00:00Z",
  "created_at": "2025-01-15T11:00:00Z"
}
```

#### 2. Criar Cobrança Boleto

```typescript
POST https://api.paytime.com.br/v1/charges/boleto

Request:
{
  "customer": {
    "name": "João Silva",
    "email": "joao@email.com",
    "cpf": "12345678900",
    "address": {
      "street": "Rua Exemplo",
      "number": "123",
      "neighborhood": "Centro",
      "city": "São Paulo",
      "state": "SP",
      "zip_code": "01000000"
    }
  },
  "amount": 15000,
  "description": "Mensalidade Jiu-Jitsu",
  "due_date": "2025-01-20",
  "fine_percentage": 2.0, // 2% após vencimento
  "interest_daily": 0.033, // 1% ao mês (0.033% ao dia)
  "external_id": "FATURA-123456",
  "callback_url": "https://teamcruz.com/api/gateway/webhook/paytime"
}

Response:
{
  "id": "pyt_bol_xyz789",
  "status": "pending",
  "barcode": "34191.09008 61713.301260 67620.178009 1 95340000015000",
  "digitable_line": "34191090086171330126067620178009195340000015000",
  "pdf_url": "https://paytime.com.br/boletos/xyz789.pdf",
  "due_date": "2025-01-20",
  "amount": 15000,
  "created_at": "2025-01-15T11:00:00Z"
}
```

#### 3. Tokenizar Cartão (Recorrência)

```typescript
POST https://api.paytime.com.br/v1/tokens

Request:
{
  "card": {
    "number": "5555666677778888",
    "holder_name": "JOAO SILVA",
    "exp_month": "12",
    "exp_year": "2028",
    "cvv": "123"
  },
  "customer_id": "cust_abc123" // ID do cliente na Paytime
}

Response:
{
  "token": "tok_secure_abc123xyz789",
  "brand": "mastercard",
  "last_digits": "8888",
  "exp_month": "12",
  "exp_year": "2028",
  "created_at": "2025-01-15T11:00:00Z"
}
```

#### 4. Cobrar Cartão Tokenizado

```typescript
POST https://api.paytime.com.br/v1/charges/card

Request:
{
  "customer_id": "cust_abc123",
  "card_token": "tok_secure_abc123xyz789",
  "amount": 15000,
  "description": "Mensalidade Recorrente - Fevereiro/2025",
  "installments": 1,
  "capture": true, // Captura imediata
  "external_id": "FATURA-123457",
  "callback_url": "https://teamcruz.com/api/gateway/webhook/paytime"
}

Response:
{
  "id": "pyt_chr_xyz456",
  "status": "paid",
  "amount": 15000,
  "card": {
    "brand": "mastercard",
    "last_digits": "8888"
  },
  "authorization_code": "123456",
  "paid_at": "2025-02-01T10:30:00Z",
  "created_at": "2025-02-01T10:30:00Z"
}
```

#### 5. Consultar Status

```typescript
GET https://api.paytime.com.br/v1/charges/{charge_id}

Response:
{
  "id": "pyt_abc123xyz",
  "status": "paid", // pending, paid, failed, cancelled, refunded
  "amount": 15000,
  "net_amount": 14250, // Líquido após taxas
  "fee": 750, // Taxa da Paytime
  "payment_method": "pix",
  "paid_at": "2025-01-15T11:15:00Z",
  "created_at": "2025-01-15T11:00:00Z",
  "external_id": "FATURA-123456"
}
```

#### 6. Estornar Pagamento

```typescript
POST https://api.paytime.com.br/v1/charges/{charge_id}/refund

Request:
{
  "amount": 15000, // Opcional (estorno parcial)
  "reason": "Solicitação do cliente"
}

Response:
{
  "id": "pyt_ref_xyz123",
  "charge_id": "pyt_abc123xyz",
  "status": "refunded",
  "amount": 15000,
  "refunded_at": "2025-01-20T14:00:00Z"
}
```

#### 7. Webhook (Notificações)

```typescript
POST https://teamcruz.com/api/gateway/webhook/paytime

Headers:
  X-Paytime-Signature: sha256=abc123...
  Content-Type: application/json

Payload:
{
  "event": "charge.paid", // charge.paid, charge.failed, charge.refunded
  "data": {
    "id": "pyt_abc123xyz",
    "status": "paid",
    "amount": 15000,
    "net_amount": 14250,
    "fee": 750,
    "payment_method": "pix",
    "paid_at": "2025-01-15T11:15:00Z",
    "external_id": "FATURA-123456",
    "customer": {
      "name": "João Silva",
      "email": "joao@email.com"
    }
  },
  "created_at": "2025-01-15T11:15:05Z"
}

Validação da Assinatura:
- Concatenar: payload + webhook_secret
- Gerar: HMAC-SHA256
- Comparar com X-Paytime-Signature
```

---

## 🔐 SEGURANÇA E COMPLIANCE

### 1. PCI DSS Compliance

- **Nunca** armazenar dados completos de cartão
- Usar **tokenização** da operadora
- Criptografar `api_key` e `secret_key` no banco
- Logs sanitizados (sem dados sensíveis)

### 2. Criptografia

```typescript
// Exemplo: Criptografar credenciais
import { createCipheriv, createDecipheriv } from "crypto";

class EncryptionService {
  private readonly algorithm = "aes-256-gcm";
  private readonly key = process.env.GATEWAY_ENCRYPTION_KEY; // 32 bytes

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = createCipheriv(
      this.algorithm,
      Buffer.from(this.key, "hex"),
      iv
    );

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  }

  decrypt(encrypted: string): string {
    const [ivHex, authTagHex, encryptedText] = encrypted.split(":");

    const decipher = createDecipheriv(
      this.algorithm,
      Buffer.from(this.key, "hex"),
      Buffer.from(ivHex, "hex")
    );

    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }
}
```

### 3. Anti-Fraude

```typescript
interface AntiFraudCheck {
  // Validações Básicas
  validateCPF(cpf: string): boolean;
  validateEmail(email: string): boolean;
  validatePhone(phone: string): boolean;

  // Detecção de Fraude
  checkDuplicateTransaction(params: TransactionParams): Promise<boolean>;
  checkVelocity(alunoId: string, timeWindow: number): Promise<number>; // Qtd transações em X minutos
  checkBlacklist(cpf: string): Promise<boolean>;

  // Score de Risco
  calculateRiskScore(transaction: Transaction): Promise<number>; // 0-100
}
```

---

## 📊 ANALYTICS E MONITORAMENTO

### Métricas Essenciais

```typescript
interface GatewayMetrics {
  // Performance
  avg_response_time_ms: number;
  success_rate_percentage: number;
  webhook_processing_time_ms: number;

  // Financeiro
  total_processed_amount: number;
  total_fees: number;
  net_revenue: number;

  // Por Método de Pagamento
  pix_volume: number;
  boleto_volume: number;
  card_volume: number;

  // Por Status
  pending_count: number;
  paid_count: number;
  failed_count: number;
  refunded_count: number;

  // Operadoras
  paytime_success_rate: number;
  mercadopago_success_rate: number;

  // Período
  period_start: Date;
  period_end: Date;
}
```

### Dashboard do Gateway

```
┌─────────────────────────────────────────────────────────┐
│            DASHBOARD GATEWAY TEAMCRUZ                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📊 HOJE                                                 │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │ Receita  │ Transaç. │ Taxa Suc.│ Ticket Md│          │
│  │ R$ 45.2k │   382    │  98.7%   │ R$ 118   │          │
│  └──────────┴──────────┴──────────┴──────────┘          │
│                                                          │
│  🏦 POR OPERADORA                                        │
│  ┌─────────────────────────────────────────┐            │
│  │ Paytime      │ 245 │ 99.2% │ R$ 28.5k   │            │
│  │ MercadoPago  │ 102 │ 97.8% │ R$ 12.1k   │            │
│  │ Stripe       │  35 │ 100%  │ R$  4.6k   │            │
│  └─────────────────────────────────────────┘            │
│                                                          │
│  💳 POR MÉTODO                                           │
│  ┌─────────────────────────────────────────┐            │
│  │ PIX          │ 198 │ 99.5% │ R$ 22.3k   │            │
│  │ Cartão       │ 142 │ 97.9% │ R$ 18.7k   │            │
│  │ Boleto       │  42 │ 100%  │ R$  4.2k   │            │
│  └─────────────────────────────────────────┘            │
│                                                          │
│  ⚠️ ALERTAS                                              │
│  • 3 webhooks com falha (retry em andamento)            │
│  • Tempo médio de resposta Paytime: 850ms (acima)       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 ENDPOINTS DO GATEWAY (API Interna TeamCruz)

### Para o Backend TeamCruz Consumir

#### 1. Criar Pagamento

```typescript
POST /api/gateway/payments/create

Request:
{
  "entity_type": "FATURA", // FATURA | VENDA | ASSINATURA
  "entity_id": "uuid-da-fatura",
  "unidade_id": "uuid-da-unidade",
  "aluno_id": "uuid-do-aluno",

  "payment_method": "PIX", // PIX | BOLETO | CARD
  "amount": 150.00,

  "customer": {
    "name": "João Silva",
    "email": "joao@email.com",
    "cpf": "12345678900",
    "phone": "11999999999"
  },

  "metadata": {
    "description": "Mensalidade Janeiro/2025",
    "due_date": "2025-01-20"
  }
}

Response:
{
  "success": true,
  "transaction_id": "uuid-gateway-transaction",
  "provider": "PAYTIME",
  "provider_transaction_id": "pyt_abc123",
  "status": "PENDING",

  "payment_data": {
    "pix": {
      "qr_code": "00020126360014br.gov.bcb.pix...",
      "qr_code_base64": "data:image/png;base64,...",
      "qr_code_url": "https://paytime.com.br/qr/abc123",
      "expires_at": "2025-01-15T12:00:00Z"
    },
    // OU boleto, OU card
  },

  "checkout_url": "https://pay.teamcruz.com/checkout/abc123"
}
```

#### 2. Tokenizar Cartão

```typescript
POST /api/gateway/cards/tokenize

Request:
{
  "aluno_id": "uuid-do-aluno",
  "card": {
    "number": "5555666677778888",
    "holder_name": "JOAO SILVA",
    "exp_month": "12",
    "exp_year": "2028",
    "cvv": "123"
  }
}

Response:
{
  "success": true,
  "card_token": "tok_encrypted_abc123",
  "card_brand": "mastercard",
  "card_last_digits": "8888",
  "expires_at": "2028-12-31"
}
```

#### 3. Cobrar Cartão Tokenizado (Recorrência)

```typescript
POST /api/gateway/cards/charge-token

Request:
{
  "entity_type": "FATURA",
  "entity_id": "uuid-da-fatura",
  "aluno_id": "uuid-do-aluno",
  "card_token": "tok_encrypted_abc123",
  "amount": 150.00,
  "description": "Mensalidade Recorrente"
}

Response:
{
  "success": true,
  "transaction_id": "uuid-gateway-transaction",
  "status": "PAID",
  "paid_at": "2025-02-01T10:30:00Z",
  "authorization_code": "123456"
}
```

#### 4. Consultar Status

```typescript
GET /api/gateway/payments/:transaction_id/status

Response:
{
  "transaction_id": "uuid-gateway-transaction",
  "status": "PAID", // PENDING | PROCESSING | PAID | FAILED | REFUNDED
  "amount": 150.00,
  "net_amount": 142.50,
  "fee": 7.50,
  "payment_method": "PIX",
  "paid_at": "2025-01-15T11:15:00Z",
  "provider": "PAYTIME",
  "provider_transaction_id": "pyt_abc123"
}
```

#### 5. Estornar

```typescript
POST /api/gateway/payments/:transaction_id/refund

Request:
{
  "amount": 150.00, // Opcional (parcial)
  "reason": "Solicitação do aluno"
}

Response:
{
  "success": true,
  "refund_id": "uuid-refund",
  "status": "REFUNDED",
  "refunded_amount": 150.00,
  "refunded_at": "2025-01-20T14:00:00Z"
}
```

#### 6. Webhook (Receber da Paytime)

```typescript
POST /api/gateway/webhook/paytime

Headers:
  X-Paytime-Signature: sha256=...

Body: (payload da Paytime)

Processamento:
1. Validar assinatura
2. Buscar transaction pelo provider_transaction_id
3. Atualizar status da gateway_transaction
4. Atualizar entidade original (Fatura/Venda)
5. Criar Transacao no TeamCruz
6. Enviar notificação ao aluno
7. Retornar 200 OK
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Estrutura Base (Semana 1-2)

- [ ] Criar tabelas do gateway no banco
- [ ] Criar módulo `GatewayModule` no NestJS
- [ ] Implementar `PaymentGatewayInterface`
- [ ] Criar entidades TypeORM (GatewayTransaction, Webhook, Config, Log)
- [ ] Implementar `EncryptionService`
- [ ] Implementar `TokenVaultService`

### Fase 2: Adapter Paytime (Semana 3-4)

- [ ] Criar `PaytimeAdapter` implementando interface
- [ ] Integrar API PIX da Paytime
- [ ] Integrar API Boleto da Paytime
- [ ] Integrar API Cartão da Paytime
- [ ] Implementar tokenização de cartão
- [ ] Implementar cobrança recorrente
- [ ] Implementar estorno

### Fase 3: Services do Gateway (Semana 5)

- [ ] `PaymentService` (orquestração)
- [ ] `RecurrenceService` (CRON para assinaturas)
- [ ] `WebhookService` (processar notificações)
- [ ] `RefundService` (estornos)
- [ ] `NotificationService` (email/WhatsApp)
- [ ] `AntiFraudService` (validações)

### Fase 4: API e Frontend (Semana 6)

- [ ] Criar controllers do gateway
- [ ] Endpoints REST internos
- [ ] Tela de configuração de gateway (Config)
- [ ] Exibir QR Code PIX nas faturas
- [ ] Exibir boleto PDF nas faturas
- [ ] Dashboard do gateway (métricas)

### Fase 5: Testes e Homologação (Semana 7)

- [ ] Testes unitários (80%+ cobertura)
- [ ] Testes de integração com Paytime Sandbox
- [ ] Testes de webhook
- [ ] Testes de estorno
- [ ] Testes de recorrência
- [ ] Documentação completa

### Fase 6: Produção (Semana 8)

- [ ] Deploy em ambiente de staging
- [ ] Migração de credenciais para produção
- [ ] Monitoramento e alertas (Sentry, Datadog)
- [ ] Rollout gradual (10% → 50% → 100%)
- [ ] Treinamento da equipe

### Fase 7: Expansão (Futuro)

- [ ] Adapter MercadoPago
- [ ] Adapter Stripe
- [ ] Adapter PicPay
- [ ] Split de pagamento (franqueador/academia)
- [ ] Antecipação de recebíveis
- [ ] Conciliação bancária automática

---

## 💡 DIFERENCIAIS DO GATEWAY TEAMCRUZ

### 1. **Multi-Operadora com Fallback Automático**

Se Paytime cair, o gateway tenta MercadoPago automaticamente.

### 2. **Split Inteligente**

- 70% para academia
- 20% para franqueador
- 10% para plataforma TeamCruz

### 3. **Retry Automático**

Webhooks com falha são reprocessados automaticamente (3 tentativas).

### 4. **Conciliação Bancária**

Compara transações do gateway com extrato bancário (OFX/CSV).

### 5. **Análise Preditiva**

ML para prever inadimplência e sugerir ações.

### 6. **API Pública (Futuro)**

Permitir terceiros integrarem com TeamCruz.

---

## 🎯 RESUMO EXECUTIVO

O **Gateway TeamCruz** será a **ponte inteligente** entre o sistema e as operadoras de pagamento, proporcionando:

✅ **Flexibilidade**: Trocar de operadora sem alterar código
✅ **Resiliência**: Múltiplas operadoras com fallback
✅ **Segurança**: PCI compliant, criptografia end-to-end
✅ **Controle**: Split automático, analytics detalhado
✅ **Escalabilidade**: Suporta milhares de transações/dia
✅ **Experiência**: Checkout rápido, notificações instantâneas

**Investimento Estimado**: 8 semanas (1 dev fullstack sênior)
**ROI Esperado**: Redução de 40% em custos com operadoras (negociação em volume)
**Impacto**: 100% das academias poderão aceitar pagamentos online
