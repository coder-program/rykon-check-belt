# 🔄 API PARA SCHEDULER - COBRANÇA RECORRENTE

**Data:** 01/03/2026  
**Objetivo:** Documentar endpoints usados pelo scheduler externo para processar cobranças recorrentes de cartão de crédito

---

## 📋 **VISÃO GERAL**

Este backend fornece 3 endpoints específicos para que o scheduler externo possa:
1. **Identificar** quais assinaturas devem ser cobradas
2. **Executar** a cobrança usando token salvo
3. **Registrar** falhas e aplicar retry logic

---

## 🔐 **AUTENTICAÇÃO**

Todos os endpoints exigem autenticação JWT:

```http
Authorization: Bearer <token>
```

**Como obter o token:**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "scheduler@sistema.com",
  "password": "senha_do_scheduler"
}
```

**Resposta:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "scheduler@sistema.com",
    "tipo_usuario": "ADMIN"
  }
}
```

---

## 📡 **ENDPOINTS**

### **1️⃣ GET /financeiro/assinaturas/pendentes-cobranca**

Lista todas as assinaturas que devem ser cobradas na data especificada (ou hoje).

#### **Filtros aplicados automaticamente:**
- ✅ `status = 'ATIVA'`
- ✅ `metodo_pagamento = 'CARTAO'`
- ✅ `token_cartao IS NOT NULL`
- ✅ `proxima_cobranca <= data`

#### **Request:**
```http
GET /financeiro/assinaturas/pendentes-cobranca?data=2026-03-01
Authorization: Bearer <token>
```

**Parâmetros de Query:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| data | string | ❌ Não | Data no formato YYYY-MM-DD. Se não informado, usa data de hoje |

#### **Response 200 OK:**
```json
[
  {
    "id": 123,
    "aluno_id": 456,
    "plano_id": 789,
    "unidade_id": 10,
    "status": "ATIVA",
    "metodo_pagamento": "CARTAO",
    "valor": 150.00,
    "data_inicio": "2026-02-01T00:00:00.000Z",
    "proxima_cobranca": "2026-03-01T00:00:00.000Z",
    "retry_count": 0,
    "token_cartao": "tk_abc123def456...",
    "dados_pagamento": {
      "last4": "1234",
      "brand": "VISA",
      "exp_month": "12",
      "exp_year": "2026",
      "holder_name": "JOAO SILVA",
      "tokenized_at": "2026-02-01T10:30:00.000Z"
    },
    "aluno": {
      "id": 456,
      "nome_completo": "João Silva",
      "email": "joao.silva@email.com",
      "cpf": "12345678900",
      "telefone": "11999998888"
    },
    "plano": {
      "id": 789,
      "nome": "Plano Mensal Premium",
      "tipo": "MENSAL",
      "valor": 150.00
    },
    "unidade": {
      "id": 10,
      "nome": "Unidade Centro",
      "codigo": "CTR"
    }
  }
]
```

#### **Response 401 Unauthorized:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

### **2️⃣ POST /financeiro/assinaturas/:id/cobrar-recorrencia**

Executa cobrança recorrente usando o token de cartão salvo.

#### **O que este endpoint faz:**
1. Valida que a assinatura possui `token_cartao`
2. Cria nova fatura com vencimento = `proxima_cobranca`
3. Envia para Paytime usando **SOMENTE o token** (sem dados do cartão)
  3. Se **APROVADO**:
     - Marca fatura como PAGA
     - Atualiza `proxima_cobranca += 1 mês`
     - Zera `retry_count`
  4. Se **RECUSADO**:
     - Registra falha automaticamente (chama `registrarFalhaCobranca`)
     - Incrementa `retry_count`
     - Agenda nova tentativa

#### **Request:**
```http
POST /financeiro/assinaturas/123/cobrar-recorrencia
Authorization: Bearer <token>
```

#### **Response 200 OK (Sucesso):**
```json
{
  "success": true,
  "assinatura_id": 123,
  "fatura_id": 456,
  "fatura_numero": "REC-123-20260301120000",
  "valor": 150.00,
  "status": "PAID",
  "transacao_id": 789,
  "paytime_transaction_id": "507f1f77bcf86cd799439011",
  "proxima_cobranca": "2026-04-01T00:00:00.000Z"
}
```

#### **Response 200 OK (Pagamento Pendente):**
```json
{
  "success": false,
  "assinatura_id": 123,
  "fatura_id": 456,
  "fatura_numero": "REC-123-20260301120000",
  "valor": 150.00,
  "status": "PENDING",
  "transacao_id": 789,
  "paytime_transaction_id": "507f1f77bcf86cd799439011",
  "proxima_cobranca": "2026-03-01T00:00:00.000Z"
}
```

#### **Response 400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": "Assinatura não possui token de cartão salvo"
}
```

#### **Response 404 Not Found:**
```json
{
  "statusCode": 404,
  "message": "Assinatura não encontrada"
}
```

---

### **3️⃣ PATCH /financeiro/assinaturas/:id/registrar-falha**

Registra falha na cobrança e aplica lógica de retry.

#### **Retry Logic:**
| Tentativa | retry_count | Ação | Próxima tentativa |
|-----------|-------------|------|-------------------|
| 1ª falha | 1 | Agenda nova tentativa | +3 dias |
| 2ª falha | 2 | Agenda nova tentativa | +5 dias |
| 3ª falha | 3 | Marca como `INADIMPLENTE` | ❌ Não tenta mais |

#### **Request:**
```http
PATCH /financeiro/assinaturas/123/registrar-falha
Authorization: Bearer <token>
Content-Type: application/json

{
  "motivo": "Cartão recusado - saldo insuficiente"
}
```

**Body (opcional):**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| motivo | string | ❌ Não | Motivo da falha (ex: "Cartão recusado", "Saldo insuficiente") |

#### **Response 200 OK (1ª ou 2ª falha):**
```json
{
  "assinatura_id": 123,
  "retry_count": 1,
  "status": "ATIVA",
  "proxima_tentativa": "2026-03-04T00:00:00.000Z",
  "inadimplente": false,
  "motivo": "Cartão recusado - saldo insuficiente"
}
```

#### **Response 200 OK (3ª falha - inadimplente):**
```json
{
  "assinatura_id": 123,
  "retry_count": 3,
  "status": "INADIMPLENTE",
  "proxima_tentativa": null,
  "inadimplente": true,
  "motivo": "Cartão recusado - saldo insuficiente"
}
```

#### **Response 404 Not Found:**
```json
{
  "statusCode": 404,
  "message": "Assinatura não encontrada"
}
```

---

## 🔄 **FLUXO COMPLETO DO SCHEDULER**

### **Cron Job 1: Processar Cobranças (TODO DIA às 2h)**

```javascript
// Pseudo-código do scheduler

async function processarCobrancasRecorrentes() {
  const hoje = '2026-03-01'; // dayjs().format('YYYY-MM-DD')
  
  // 1. Buscar assinaturas pendentes
  const assinaturas = await fetch(
    `${API_URL}/financeiro/assinaturas/pendentes-cobranca?data=${hoje}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  console.log(`📊 Encontradas ${assinaturas.length} assinaturas para cobrar`);
  
  // 2. Processar cada assinatura
  for (const assinatura of assinaturas) {
    try {
      // 3. Executar cobrança
      const resultado = await fetch(
        `${API_URL}/financeiro/assinaturas/${assinatura.id}/cobrar-recorrencia`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      // 4. Verificar resultado
      if (resultado.success && resultado.status === 'PAID') {
        console.log(`✅ Assinatura ${assinatura.id} cobrada com sucesso`);
        // Enviar confirmação por email/WhatsApp
        await enviarConfirmacaoPagamento(assinatura.aluno.email);
      } else if (resultado.status === 'PENDING') {
        console.log(`⏳ Assinatura ${assinatura.id} aguardando confirmação`);
        // Aguardar webhook do Paytime
      }
      
    } catch (error) {
      console.error(`❌ Erro ao cobrar assinatura ${assinatura.id}:`, error.message);
      
      // 5. Registrar falha (se não foi registrada automaticamente)
      if (!error.response?.status === 400) { // Se não foi falha de validação
        await fetch(
          `${API_URL}/financeiro/assinaturas/${assinatura.id}/registrar-falha`,
          {
            method: 'PATCH',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              motivo: error.message
            })
          }
        );
      }
    }
    
    // 6. Delay entre cobranças (evitar rate limit)
    await sleep(1000); // 1 segundo
  }
  
  console.log(`🏁 Processamento concluído: ${assinaturas.length} assinaturas`);
}
```

### **Cron Job 2: Notificar Inadimplentes (TODO DIA às 9h)**

```javascript
async function notificarInadimplentes() {
  // Buscar assinaturas INADIMPLENTE
  const inadimplentes = await fetch(
    `${API_URL}/financeiro/assinaturas?status=INADIMPLENTE`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  for (const assinatura of inadimplentes) {
    // Enviar notificação para atualizar cartão
    await enviarNotificacaoAtualizarCartao(
      assinatura.aluno.email,
      assinatura.aluno.telefone
    );
  }
}
```

---

## 📊 **MONITORAMENTO**

### **Métricas importantes para coletar:**

1. **Total de assinaturas processadas por dia**
2. **Taxa de sucesso/falha**
  3. **Total de inadimplentes (status INADIMPLENTE)**
4. **Tempo médio de processamento**
5. **Erros por tipo**

### **Exemplo de log estruturado:**

```json
{
  "timestamp": "2026-03-01T02:00:00.000Z",
  "evento": "PROCESSAMENTO_RECORRENCIA",
  "data_cobranca": "2026-03-01",
  "total_assinaturas": 150,
  "sucesso": 142,
  "falha": 8,
  "taxa_sucesso": "94.67%",
  "tempo_total_segundos": 180,
  "novos_inadimplentes": 2
}
```

---

## ⚠️ **TRATAMENTO DE ERROS**

### **Erros esperados e como tratá-los:**

| Erro | Status | Ação do Scheduler |
|------|--------|-------------------|
| Token inválido/expirado | 401 | Renovar token e tentar novamente |
| Assinatura não encontrada | 404 | Logar erro e pular para próxima |
| Sem token de cartão | 400 | Logar erro e notificar admin |
| Paytime indisponível | 500 | Tentar novamente em 5 minutos (retry) |
| Cartão recusado | 200 + success: false | Registrar falha automaticamente |

### **Retry em caso de erro de rede:**

```javascript
async function cobrarComRetry(assinaturaId, maxTentativas = 3) {
  for (let i = 0; i < maxTentativas; i++) {
    try {
      return await fetch(`${API_URL}/financeiro/assinaturas/${assinaturaId}/cobrar-recorrencia`);
    } catch (error) {
      if (i === maxTentativas - 1) throw error;
      await sleep(5000 * (i + 1)); // Exponential backoff
    }
  }
}
```

---

## 🔐 **SEGURANÇA**

### **Recomendações:**

1. **Use conta de serviço dedicada:**
   - Criar usuário `scheduler@sistema.com` com perfil ADMIN
   - Senha forte armazenada em variável de ambiente
   - Rotação de senha a cada 90 dias

2. **Rate limiting:**
   - Aguardar 1 segundo entre cada cobrança
   - Processar no máximo 100 cobranças por execução

3. **Logs:**
   - Logar TODAS as operações
   - Não logar tokens completos (apenas últimos 4 dígitos)
   - Armazenar logs por no mínimo 90 dias

4. **Monitoramento:**
   - Alertar se taxa de falha > 10%
   - Alertar se scheduler não rodou em 24h
   - Alertar se > 5% de inadimplentes

---

## 📝 **EXEMPLO DE INTEGRAÇÃO (Node.js)**

```javascript
// scheduler.js
const axios = require('axios');
const dayjs = require('dayjs');

const API_URL = 'https://api.teamcruz.com';
let authToken = null;

// Autenticar
async function authenticate() {
  const response = await axios.post(`${API_URL}/auth/login`, {
    email: process.env.SCHEDULER_EMAIL,
    password: process.env.SCHEDULER_PASSWORD
  });
  authToken = response.data.access_token;
  console.log('✅ Autenticado com sucesso');
}

// Processar cobranças
async function processarCobrancas() {
  const hoje = dayjs().format('YYYY-MM-DD');
  
  // Buscar assinaturas
  const { data: assinaturas } = await axios.get(
    `${API_URL}/financeiro/assinaturas/pendentes-cobranca?data=${hoje}`,
    { headers: { 'Authorization': `Bearer ${authToken}` } }
  );
  
  console.log(`📊 ${assinaturas.length} assinaturas para processar`);
  
  let sucesso = 0;
  let falha = 0;
  
  for (const assinatura of assinaturas) {
    try {
      const { data: resultado } = await axios.post(
        `${API_URL}/financeiro/assinaturas/${assinatura.id}/cobrar-recorrencia`,
        {},
        { headers: { 'Authorization': `Bearer ${authToken}` } }
      );
      
      if (resultado.success) {
        console.log(`✅ Assinatura ${assinatura.id} - ${resultado.status}`);
        sucesso++;
      } else {
        console.warn(`⚠️ Assinatura ${assinatura.id} - ${resultado.status}`);
        falha++;
      }
      
      // Delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Erro assinatura ${assinatura.id}:`, error.message);
      falha++;
    }
  }
  
  console.log(`🏁 Processamento concluído: ${sucesso} sucesso, ${falha} falha`);
}

// Executar
(async () => {
  await authenticate();
  await processarCobrancas();
})();
```

---

## 📞 **SUPORTE**

Em caso de dúvidas ou problemas:
- **Email:** dev@teamcruz.com
- **Slack:** #team-backend
- **Documentação completa:** [recorrencia.md](./recorrencia.md)
