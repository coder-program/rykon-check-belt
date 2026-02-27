# 🚀 Fluxo Completo de Integração Paytime

Guia passo a passo para integração completa com a API Paytime - do cadastro ao processamento de pagamentos.

---

## 📋 Pré-requisitos

Antes de começar, você precisa ter:

- ✅ Credenciais Paytime (fornecidas pela equipe de integração):
  - `integration-key`
  - `authentication-key`
  - `x-token`
- ✅ Backend RykonPay configurado e rodando
- ✅ Variáveis de ambiente configuradas no `.env`

---

## 🔐 1. Autenticação

### Endpoint
```http
POST /api/auth/login
```

### Body
```json
{
  "password": "!Rykon@pay"
}
```

### Resposta
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
```

### ⚠️ Importante
- Token expira em **1 hora**
- Use o `access_token` em todas as próximas requisições
- Header: `Authorization: Bearer {access_token}`

---

## 🏢 2. Criar Estabelecimento

### Endpoint
```http
POST /api/establishments
```

### Headers
```
Authorization: Bearer {seu_token}
Content-Type: application/json
```

### Body Exemplo
```json
{
  "type": "BUSINESS",
  "activity_id": 30,
  "notes": "Observação sobre o EC",
  "visited": false,
  "responsible": {
    "email": "responsavel@email.com",
    "document": "12345678901",
    "first_name": "João Desenvolvedor",
    "phone": "27999999999",
    "birthdate": "2000-10-12"
  },
  "address": {
    "zip_code": "29090390",
    "street": "Rua Dos Desenvolvedores",
    "neighborhood": "Bairro da Programação",
    "city": "Vitória",
    "state": "ES",
    "number": "01"
  },
  "first_name": "Razão Social LTDA",
  "last_name": "Nome Fantasia",
  "cnae": "0111302",
  "document": "11222333000181",
  "phone_number": "27998765431",
  "email": "estabelecimento@email.com",
  "birthdate": "2022-01-01",
  "revenue": 10000,
  "format": "LTDA",
  "gmv": 13000
}
```

### ⚠️ Validações Importantes
- **Documentos:** Sempre sem formatação (sem pontos, barras ou hífens)
  - CNPJ: `"11222333000181"` ✅ | `"11.222.333/0001-81"` ❌
  - CPF: `"12345678901"` ✅ | `"123.456.789-01"` ❌
- **Telefones:** Formato brasileiro com DDD (11 dígitos)
  - `"27999999999"` ✅ | `"00000000001"` ❌
- **CNPJ/CPF:** Devem ser únicos (não podem estar cadastrados)
- **Email:** Recomendado usar único para cada estabelecimento

### Resposta
```json
{
  "id": 123,
  "status": "PENDING",
  "document": "11222333000181",
  ...
}
```

**Guarde o `id` retornado** - você usará nas próximas etapas!

---

## 📊 3. Verificar Status do Estabelecimento

### Endpoint
```http
GET /api/establishments/{establishment_id}
```

### Headers
```
Authorization: Bearer {seu_token}
```

### Resposta
```json
{
  "id": 123,
  "status": "APPROVED",  // ✅ Precisa estar APPROVED para ativar gateways
  "type": "BUSINESS",
  "document": "11222333000181",
  "email": "estabelecimento@email.com",
  ...
}
```

### Status Possíveis
- `PENDING` - Aguardando validação
- `VALIDATION` - Em validação de documentos
- `RISK_ANALYSIS` - Em análise de risco
- `APPROVED` - ✅ Aprovado (pode ativar gateways)
- `DISAPPROVED` - Reprovado

### 🎯 Teste em Sandbox
Use o último dígito do telefone para simular status:
- **1**: Aprovação automática
- **2**: Análise de risco
- **3**: Reprovação
- **Outros**: PENDING

---

## 🔌 4. Listar Gateways Disponíveis

### Endpoint
```http
GET /api/gateways
```

### Headers
```
Authorization: Bearer {seu_token}
```

### Resposta
```json
{
  "total": 3,
  "page": 1,
  "perPage": 20,
  "lastPage": 1,
  "data": [
    {
      "id": 2,
      "name": "PAGSEGURO",
      "type": "ACQUIRER"
    },
    {
      "id": 4,
      "name": "PAYTIME",
      "type": "ACQUIRER"
    },
    {
      "id": 6,
      "name": "CELCOIN",
      "type": "BANKING"
    }
  ]
}
```

### Gateways Disponíveis
- **ID 2:** PagSeguro (Adquirente)
- **ID 4:** SubPaytime (Adquirente - para Split)
- **ID 6:** Banking Paytime (Serviços bancários)

---

## 💳 5. Listar Planos Comerciais

### Endpoint
```http
GET /api/plans
```

### Headers
```
Authorization: Bearer {seu_token}
```

### Resposta
```json
{
  "total": 150,
  "data": [
    {
      "id": 93,
      "name": "Plano E-commerce",
      "gateway_id": 4,
      "active": true,
      "type": "COMMERCIAL",
      "modality": "ONLINE"
    },
    ...
  ]
}
```

**Guarde os IDs dos planos** - você precisará vincular ao ativar SubPaytime!

---

## 🏦 6. Ativar Gateway Banking (Obrigatório para Split)

### Endpoint
```http
POST /api/establishments/{establishment_id}/gateways
```

### Headers
```
Authorization: Bearer {seu_token}
Content-Type: application/json
```

### Body
```json
{
  "reference_id": "REF-BANKING-001",
  "gateway_id": 6,
  "active": true,
  "form_receipt": "PAYTIME",
  "fees_banking_id": 2
}
```

### Campos Obrigatórios
- `reference_id`: Identificador único do seu sistema
- `gateway_id`: **6** (Banking)
- `active`: **true**
- `form_receipt`: **PAYTIME** (forma de recebimento)
- `fees_banking_id`: ID do pacote de tarifas (geralmente **2**)

### Resposta
```json
{
  "id": 456,
  "gateway": {
    "id": 6,
    "name": "CELCOIN"
  },
  "status": "PENDING",
  "active": true,
  ...
}
```

**Guarde o `id` do gateway configurado** para a próxima etapa!

---

## 📄 7. Obter URL do KYC (Banking)

### Endpoint
```http
GET /api/establishments/{establishment_id}/gateways/{gateway_config_id}
```

### Headers
```
Authorization: Bearer {seu_token}
```

### Resposta
```json
{
  "id": 456,
  "gateway": {
    "id": 6,
    "name": "CELCOIN"
  },
  "metadata": {
    "url_documents_copy": "https://paytime.com.br/kyc/abc123...",
    "email": "estabelecimento@email.com",
    "token": "abc123..."
  },
  ...
}
```

### 🎯 Próximo Passo
1. Pegue a URL em `metadata.url_documents_copy`
2. Envie para o cliente completar o KYC
3. Cliente faz upload dos documentos
4. Aguarde aprovação da Paytime
5. Banking será ativado automaticamente após aprovação

---

## 💰 8. Ativar SubPaytime (Gateway de Pagamentos)

### Endpoint
```http
POST /api/establishments/{establishment_id}/gateways
```

### Headers
```
Authorization: Bearer {seu_token}
Content-Type: application/json
```

### Body
```json
{
  "reference_id": "REF-SUBPAYTIME-001",
  "gateway_id": 4,
  "active": true,
  "form_receipt": "PAYTIME",
  "statement_descriptor": "Minha Empresa",
  "plans": [
    { "id": 93, "active": true },
    { "id": 15, "active": true }
  ]
}
```

### Campos Obrigatórios
- `reference_id`: Identificador único
- `gateway_id`: **4** (SubPaytime)
- `active`: **true**
- `form_receipt`: **PAYTIME**
- `statement_descriptor`: Nome que aparece na fatura do cliente (máx 22 caracteres)
- `plans`: Array com IDs dos planos comerciais (obtidos no passo 5)

### Resposta
```json
{
  "id": 789,
  "gateway": {
    "id": 4,
    "name": "PAYTIME"
  },
  "status": "APPROVED",
  "active": true,
  ...
}
```

---

## 🚀 9. Processar Pagamentos

Agora você pode criar transações!

### 9.1. Pagamento PIX

#### Endpoint
```http
POST /api/transactions/pix
```

#### Headers
```
Authorization: Bearer {seu_token}
Content-Type: application/json
establishment_id: {establishment_id}
```

#### Body
```json
{
  "amount": 10000,
  "customer": {
    "first_name": "João",
    "last_name": "Silva",
    "document": "12345678901",
    "email": "cliente@email.com"
  },
  "expires_in": 3600
}
```

#### Resposta
```json
{
  "id": "trans_abc123",
  "status": "PENDING",
  "amount": 10000,
  "pix": {
    "qr_code": "00020126...",
    "qr_code_url": "https://...",
    "expires_at": "2026-01-31T..."
  }
}
```

### 9.2. Pagamento com Cartão

#### Endpoint
```http
POST /api/transactions/card
```

#### Headers
```
Authorization: Bearer {seu_token}
Content-Type: application/json
establishment_id: {establishment_id}
```

#### Body
```json
{
  "payment_type": "CREDIT",
  "amount": 39001,
  "installments": 3,
  "interest": "ESTABLISHMENT",
  "customer": {
    "first_name": "João",
    "last_name": "Silva",
    "document": "12345678901",
    "email": "cliente@email.com",
    "phone": "27999999999"
  },
  "card": {
    "number": "5200000000001096",
    "holder_name": "JOAO DA SILVA",
    "expiration_month": "12",
    "expiration_year": "2028",
    "cvv": "123"
  },
  "billing_address": {
    "street": "Rua Teste",
    "number": "123",
    "neighborhood": "Centro",
    "city": "Vitória",
    "state": "ES",
    "zip_code": "29090390"
  }
}
```

#### Resposta
```json
{
  "id": "trans_def456",
  "status": "PAID",
  "amount": 39001,
  "installments": 3,
  "card": {
    "brand": "MASTERCARD",
    "last4_digits": "1096"
  }
}
```

### 9.3. Boleto

#### Endpoint
```http
POST /api/transactions/billet
```

#### Headers
```
Authorization: Bearer {seu_token}
Content-Type: application/json
establishment_id: {establishment_id}
```

#### Body
```json
{
  "amount": 50000,
  "customer": {
    "first_name": "João",
    "last_name": "Silva",
    "document": "12345678901",
    "email": "cliente@email.com"
  },
  "due_date": "2026-02-15"
}
```

---

## 🔔 10. Configurar Webhooks (Opcional)

### Endpoint
```http
POST /api/webhooks
```

### Body
```json
{
  "url": "https://seu-sistema.com/webhook/paytime",
  "events": [
    "transaction.paid",
    "transaction.failed",
    "transaction.refunded"
  ]
}
```

### Eventos Disponíveis
- `transaction.paid` - Transação aprovada
- `transaction.failed` - Transação recusada
- `transaction.refunded` - Transação estornada
- `transaction.chargeback` - Chargeback registrado

---

## 📊 Consultar Transações e Extratos

### Listar Transações
```http
GET /api/transactions
```

### Lançamentos Futuros
```http
GET /api/transactions/future-releases?view=calendar
```

### Saldo Banking
```http
GET /api/banking/balance?establishment_id={id}
```

### Extrato Banking
```http
GET /api/banking/extract?establishment_id={id}&start_date=2026-01-01&end_date=2026-01-31
```

---

## 🎯 Resumo do Fluxo Completo

1. ✅ **Autenticar** → Obter JWT token
2. ✅ **Criar estabelecimento** → Status PENDING
3. 🔄 **Verificar aprovação** → Aguardar status APPROVED
4. 🔄 **Listar gateways** → Identificar IDs disponíveis
5. 🔄 **Listar planos** → Obter IDs para vincular
6. 🔄 **Ativar Banking** → Gateway ID 6
7. 🔄 **Obter URL KYC** → Cliente completa documentos
8. 🔄 **Ativar SubPaytime** → Gateway ID 4 + planos
9. 🚀 **Processar pagamentos** → PIX, Cartão ou Boleto
10. 🔔 **Webhooks** → Receber notificações automáticas

---

## 🐛 Troubleshooting

### Erro: "Authentication not configured"
- Verifique se `ADMIN_PASSWORD_HASH` e `JWT_SECRET` estão configurados no `.env`

### Erro: "CPF/CNPJ já cadastrado"
- Use um documento diferente para cada estabelecimento

### Erro: "Invalid phone number format"
- Telefone deve ter 11 dígitos: DDD + número
- Exemplo válido: `"27999999999"`

### Erro: "Establishment not approved"
- Aguarde aprovação do estabelecimento antes de ativar gateways
- Use telefone terminando em "1" para aprovação automática no sandbox

### Gateway retorna lista vazia
- Verifique credenciais Paytime no `.env`
- Confirme que está usando ambiente correto (sandbox/production)
- Teste autenticação Paytime: `GET /api/paytime/auth/test`

---

## 📚 Documentação Adicional

- **Swagger Local:** http://localhost:3002/api/docs
- **Swagger Produção:** https://rykon-pay-production.up.railway.app/api/docs
- **Paytime Docs:** https://docs-parceiro.paytime.com.br

---

## 🔐 Segurança

- **Nunca exponha** suas credenciais Paytime
- **Use HTTPS** em produção
- **Renove tokens** antes de expirar (1 hora)
- **Valide webhooks** usando assinatura
- **Não armazene** dados de cartão (use tokens)

---

**Data de criação:** 31/01/2026  
**Versão:** 1.0
