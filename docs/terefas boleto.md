esse é o serviço da rykon-pay ao qual vamos chamar

📄 Criar Boleto Bancário
Cria um novo boleto bancário para pagamento. O processo é assíncrono.

🎯 Processo de Criação
Requisição: Cliente envia dados do boleto
Confirmação: API retorna status PROCESSING
Webhook new-billet: Boleto criado no sistema
Webhook updated-billet-status: Status evolui para PENDING, PAID, etc.
⚠️ Importante
O boleto não está válido apenas com o retorno da requisição
Aguarde os webhooks para obter código de barras, linha digitável e URL do PDF
Acompanhe a evolução do status via updated-billet-status
📋 Campos Obrigatórios
Boleto
amount: Valor em centavos (ex: 1000 = R$ 10,00)
expiration: Data de vencimento (ISO 8601: "2025-08-28")
recharge: Se é recarga (true/false)
Cliente
first_name: Nome ou razão social
last_name: Sobrenome ou nome fantasia
document: CPF ou CNPJ (somente números)
email: Email válido
address: Endereço completo (rua, número, bairro, cidade, estado, CEP)
Instruções
booklet: Se é carnê (true/false)
late_fee: Multa (mode: PERCENTAGE/FIXED, amount: valor)
interest: Juros (mode: MONTHLY_PERCENTAGE, amount: valor)
discount: Desconto (mode: PERCENTAGE, amount: valor, limit_date: data)
🧪 Testes no Sandbox
Valor < R$ 100,00 (amount < 10000)
Status: PROCESSING
Não evolui automaticamente
R$ 100,00 ≤ Valor < R$ 500,00
Status: PROCESSING → PENDING
Webhook: updated-billet-status
Valor ≥ R$ 500,00 (amount ≥ 50000)
Status: PROCESSING → PENDING → PAID
Webhooks: 2x updated-billet-status
💰 Taxas
O valor líquido será: amount - fees_banking.fees

Exemplo: amount=1000 (R$ 10,00) - fees=250 (R$ 2,50) = R$ 7,50 líquido

🔗 Próximos Passos
Crie o boleto via POST
Configure os webhooks para receber atualizações
Obtenha código de barras/linha digitável quando status = PENDING
Forneça ao cliente para pagamento
Parameters
Cancel
No parameters

Request body

application/json
Edit Value
Schema
{
  "amount": 1000,
  "expiration": "2025-08-28",
  "payment_limit_date": "2025-08-30",
  "recharge": true,
  "client": {
    "first_name": "Antonio",
    "last_name": "Francisco",
    "document": "43878902077",
    "email": "antonio@emaildocliente.com",
    "address": {
      "street": "Av Longe",
      "number": "10",
      "neighborhood": "Bairro distante",
      "complement": "Perto da zona",
      "city": "Goiania",
      "state": "GO",
      "zip_code": "29163321"
    }
  },
  "instruction": {
    "booklet": false,
    "description": "Venda por Boleto",
    "late_fee": {
      "mode": "PERCENTAGE",
      "amount": 1
    },
    "interest": {
      "mode": "MONTHLY_PERCENTAGE",
      "amount": 1
    },
    "discount": {
      "mode": "PERCENTAGE",
      "amount": 1,
      "limit_date": "2025-08-25"
    }
  }
}
Execute
Responses
Code	Description	Links
200	
Boleto criado com sucesso (status PROCESSING)

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "_id": "689b893b59a7593764e8b0e1",
  "type": "BILLET",
  "gateway_key": "82032a9d-96e2-42a6-8fbf-58f45687361e",
  "establishment_id": "155444085",
  "establishment": {
    "id": 155085,
    "first_name": "EC Cobranças",
    "last_name": null,
    "document": "10068114001",
    "account_number": "300543394162",
    "account_check_digit": "8"
  },
  "marketplace": {
    "id": 26,
    "nickname": "Parceiro Integrações",
    "first_name": "Webhooks Integrações",
    "last_name": "API Integrações",
    "document": "60274849000185"
  },
  "representative": {
    "id": 63,
    "first_name": "EC Cobranças",
    "last_name": "string",
    "document": "10068114001"
  },
  "fees_banking": {
    "name": "Pacote de Tarifa Bancária Comercial",
    "description": "Pacote de Tarifa Bancária Comercial",
    "fees": 250
  },
  "description": "Venda por Boleto",
  "amount": 750,
  "original_amount": 1000,
  "barcode": "34199108400000010001090005834127892998860000",
  "digitable_line": "34191090080583412789529988600002910840000001000",
  "url": "https://billets/...pdf",
  "status": "PENDING",
  "expiration_at": "2025-08-28T12:00:00.000Z",
  "payment_limit_date": "2025-08-30T00:00:00.000Z",
  "fees": 250,
  "billing_instructions": [
    {
      "name": "late_fee",
      "mode": "PERCENTAGE",
      "amount": 1,
      "limit_date": "2025-08-25T00:00:00.000Z",
      "_id": "689b893b59a7593764e8b0e8"
    }
  ],
  "recharge": true,
  "gateway_authorization": "CELCOIN",
  "request_origin": "API",
  "created_at": "2025-08-12T18:34:35.601Z",
  "updated_at": "2025-08-12T18:34:35.601Z",
  "__v": 0,
  "client": {
    "first_name": "Antonio",
    "last_name": "Francisco",
    "document": "43878902077",
    "email": "antonio@emaildocliente.com",
    "_id": "689b893b59a7593764e8b0e2"
  },
  "pix_emv": "080014br.gov.bcb.pix...",
  "transaction_id": "2a7f6292-9339-49d7-b1bb-0ed159adb477"
}
No links
400	
Dados inválidos

No links
401	
Não autorizado

No links
422	
Erro de validação

No links
500	
Erro interno


GET
/api/billets
Listar boletos

📋 Listar Boletos Bancários
Lista todos os boletos gerados no marketplace com filtros e paginação.

🔍 Filtros Disponíveis
status (string)
PROCESSING: Em processamento inicial
PENDING: Aguardando pagamento
PAID: Pago
CANCELED: Cancelado
EXPIRED: Vencido
FAILED: Falha no processamento
Exemplo: {"status":"PENDING"}

type (string)
BILLET: Boleto bancário
establishment_id (string)
ID do estabelecimento
Exemplo: {"establishment_id":"155085"}

Filtros combinados
{
  "status": "PENDING",
  "establishment_id": "155085"
}
🔎 Busca Textual
O parâmetro search busca por:

ID do boleto
CPF/CNPJ do cliente
Email do cliente
Nome do estabelecimento
📊 Ordenação
[
  { "column": "created_at", "direction": "DESC" },
  { "column": "expiration_at", "direction": "ASC" }
]
Campos ordenáveis: created_at, updated_at, expiration_at, amount

📄 Paginação
perPage: Máximo 100 registros por página
page: Número da página (inicia em 1)
💡 Casos de Uso
Boletos pendentes de pagamento
GET /api/billets?filters={"status":"PENDING"}
Boletos de um estabelecimento
GET /api/billets?filters={"establishment_id":"155085"}
Buscar por CPF do cliente
GET /api/billets?search=43878902077
Últimos boletos criados
GET /api/billets?sorters=[{"column":"created_at","direction":"DESC"}]&perPage=20
📋 Campos Retornados
Identificação: _id, gateway_key
Valores: amount, original_amount, fees
Pagamento: barcode, digitable_line, url, pix_emv
Status: status, expiration_at, payment_limit_date
Relacionamentos: establishment, marketplace, representative, client
Instruções: billing_instructions (multa, juros, desconto)
Parameters
Cancel
Name	Description
filters
string
(query)
JSON de filtros. Campos filtráveis: status, type, establishment_id

filters
search
string
(query)
Texto para busca. Pesquisa por ID, documento do cliente, estabelecimento

search
perPage
number
(query)
Número de registros por página

20
page
number
(query)
Número da página atual

1
sorters
string
(query)
JSON com lista de ordenadores. Exemplo: [{"column":"created_at","direction":"DESC"}]

[{"column":"created_at","direction":"DESC"}]
Execute
Clear
Responses
Curl

curl -X 'GET' \
  'http://localhost:3002/api/billets?perPage=20&page=1&sorters=%5B%7B%22column%22%3A%22created_at%22%2C%22direction%22%3A%22DESC%22%7D%5D' \
  -H 'accept: application/json'
Request URL
http://localhost:3002/api/billets?perPage=20&page=1&sorters=%5B%7B%22column%22%3A%22created_at%22%2C%22direction%22%3A%22DESC%22%7D%5D
Server response
Code	Details
200	
Response body
Download
{
  "total": 0,
  "page": 1,
  "limit": 20,
  "data": []
}
Response headers
 access-control-allow-credentials: true 
 content-length: 41 
 content-type: application/json; charset=utf-8 
 date: Thu,05 Feb 2026 15:52:19 GMT 
 etag: W/"29-iOT4hoceCsAvOS5nzGmTL9OlWbk" 
 vary: Origin 
 x-powered-by: Express 
Responses
Code	Description	Links
200	
Lista de boletos retornada com sucesso

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "total": 1,
  "page": 1,
  "limit": 20,
  "data": [
    {
      "_id": "689b893b59a7593764e8b0e1",
      "type": "BILLET",
      "gateway_key": "82032a9d-96e2-42a6-8fbf-58f45687361e",
      "establishment_id": "155444085",
      "establishment": {
        "id": 155085,
        "first_name": "EC Cobranças",
        "last_name": null,
        "document": "10068114001",
        "account_number": "300543394162",
        "account_check_digit": "8"
      },
      "marketplace": {
        "id": 26,
        "nickname": "Parceiro Integrações",
        "first_name": "Webhooks Integrações",
        "last_name": "API Integrações",
        "document": "60274849000185"
      },
      "representative": {
        "id": 63,
        "first_name": "EC Cobranças",
        "last_name": "string",
        "document": "10068114001"
      },
      "fees_banking": {
        "name": "Pacote de Tarifa Bancária Comercial",
        "description": "Pacote de Tarifa Bancária Comercial",
        "fees": 250
      },
      "description": "Venda por Boleto",
      "amount": 750,
      "original_amount": 1000,
      "barcode": "34199108400000010001090005834127892998860000",
      "digitable_line": "34191090080583412789529988600002910840000001000",
      "url": "https://billets/...pdf",
      "status": "PENDING",
      "expiration_at": "2025-08-28T12:00:00.000Z",
      "payment_limit_date": "2025-08-30T00:00:00.000Z",
      "fees": 250,
      "billing_instructions": [
        {
          "name": "late_fee",
          "mode": "PERCENTAGE",
          "amount": 1,
          "limit_date": "2025-08-25T00:00:00.000Z",
          "_id": "689b893b59a7593764e8b0e8"
        }
      ],
      "recharge": true,
      "gateway_authorization": "CELCOIN",
      "request_origin": "API",
      "created_at": "2025-08-12T18:34:35.601Z",
      "updated_at": "2025-08-12T18:34:35.601Z",
      "__v": 0,
      "client": {
        "first_name": "Antonio",
        "last_name": "Francisco",
        "document": "43878902077",
        "email": "antonio@emaildocliente.com",
        "_id": "689b893b59a7593764e8b0e2"
      },
      "pix_emv": "080014br.gov.bcb.pix...",
      "transaction_id": "2a7f6292-9339-49d7-b1bb-0ed159adb477"
    }
  ]
}
No links
401	
Não autorizado

No links
500	
Erro interno

No links

GET
/api/billets/{id}
Exibir boleto específico

🔍 Exibir Detalhes do Boleto
Retorna todas as informações de um boleto específico pelo ID.

📋 Informações Retornadas
Dados do Boleto
_id: Identificador único
gateway_key: Chave no gateway bancário
status: Status atual do boleto
expiration_at: Data de vencimento
payment_limit_date: Data limite de pagamento
Valores
amount: Valor líquido (após taxas)
original_amount: Valor original
fees: Taxas aplicadas
Dados de Pagamento
barcode: Código de barras (disponível quando PENDING)
digitable_line: Linha digitável (disponível quando PENDING)
url: Link do PDF do boleto
pix_emv: Código PIX copia e cola (se disponível)
Cliente
first_name, last_name: Nome completo
document: CPF/CNPJ
email: Email de contato
Estabelecimento
id, document: Identificação
account_number, account_check_digit: Dados da conta
Instruções de Cobrança
late_fee: Multa por atraso
interest: Juros aplicados
discount: Desconto (se houver)
💡 Quando Usar
Verificar se boleto está pronto
Após receber webhook updated-billet-status, consulte para obter:

Código de barras
Linha digitável
URL do PDF
Consultar status atual
Antes de mostrar ao cliente, verifique se status é PENDING

Obter dados para pagamento
Use barcode ou digitable_line para pagamento via app bancário

Pix via boleto
Se disponível, use pix_emv para pagamento via Pix

🔗 Fluxo Recomendado
Crie o boleto via POST /api/billets
Aguarde webhook updated-billet-status com status=PENDING
Consulte GET /api/billets/:id para obter dados de pagamento
Exiba código de barras/linha digitável ao cliente
Aguarde webhook com status=PAID quando pago
Parameters
Cancel
Name	Description
id *
string
(path)
ID do boleto

689b893b59a7593764e8b0e1
Execute
Clear
Responses
Curl

curl -X 'GET' \
  'http://localhost:3002/api/billets/689b893b59a7593764e8b0e1' \
  -H 'accept: application/json'
Request URL
http://localhost:3002/api/billets/689b893b59a7593764e8b0e1
Server response
Code	Details
404	
Error: Not Found

Response body
Download
{
  "statusCode": 404,
  "message": "Recurso não encontrado.",
  "code": "API000010",
  "status": 404,
  "stack": "HttpException: Recurso não encontrado.\n    at new MsBankError (/home/ubuntu/paytime/ms-public-api/src/errors/ms-bank.error.ts:18:13)\n    at <anonymous> (/home/ubuntu/paytime/ms-public-api/src/integrations/ms-bank/ms-bank.gateway.ts:76:15)\n    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)",
  "timestamp": "2026-02-05T15:51:35.003Z",
  "path": "/api/billets/689b893b59a7593764e8b0e1"
}
Response headers
 access-control-allow-credentials: true 
 connection: keep-alive 
 content-length: 509 
 content-type: application/json; charset=utf-8 
 date: Thu,05 Feb 2026 15:51:35 GMT 
 etag: W/"1fd-R7ff4Fp0DhyfKTZODMShwnmySAk" 
 keep-alive: timeout=5 
 vary: Origin 
 x-powered-by: Express 
Responses
Code	Description	Links
200	
Detalhes do boleto

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "_id": "689b893b59a7593764e8b0e1",
  "type": "BILLET",
  "gateway_key": "82032a9d-96e2-42a6-8fbf-58f45687361e",
  "establishment_id": "155444085",
  "establishment": {
    "id": 155085,
    "first_name": "EC Cobranças",
    "last_name": null,
    "document": "10068114001",
    "account_number": "300543394162",
    "account_check_digit": "8"
  },
  "marketplace": {
    "id": 26,
    "nickname": "Parceiro Integrações",
    "first_name": "Webhooks Integrações",
    "last_name": "API Integrações",
    "document": "60274849000185"
  },
  "representative": {
    "id": 63,
    "first_name": "EC Cobranças",
    "last_name": "string",
    "document": "10068114001"
  },
  "fees_banking": {
    "name": "Pacote de Tarifa Bancária Comercial",
    "description": "Pacote de Tarifa Bancária Comercial",
    "fees": 250
  },
  "description": "Venda por Boleto",
  "amount": 750,
  "original_amount": 1000,
  "barcode": "34199108400000010001090005834127892998860000",
  "digitable_line": "34191090080583412789529988600002910840000001000",
  "url": "https://billets/...pdf",
  "status": "PENDING",
  "expiration_at": "2025-08-28T12:00:00.000Z",
  "payment_limit_date": "2025-08-30T00:00:00.000Z",
  "fees": 250,
  "billing_instructions": [
    {
      "name": "late_fee",
      "mode": "PERCENTAGE",
      "amount": 1,
      "limit_date": "2025-08-25T00:00:00.000Z",
      "_id": "689b893b59a7593764e8b0e8"
    }
  ],
  "recharge": true,
  "gateway_authorization": "CELCOIN",
  "request_origin": "API",
  "created_at": "2025-08-12T18:34:35.601Z",
  "updated_at": "2025-08-12T18:34:35.601Z",
  "__v": 0,
  "client": {
    "first_name": "Antonio",
    "last_name": "Francisco",
    "document": "43878902077",
    "email": "antonio@emaildocliente.com",
    "_id": "689b893b59a7593764e8b0e2"
  },
  "pix_emv": "080014br.gov.bcb.pix...",
  "transaction_id": "2a7f6292-9339-49d7-b1bb-0ed159adb477"
}
No links
401	
Não autorizado

No links
404	
Boleto não encontrado

No links
500	
Erro interno

No links

DELETE
/api/billets/{id}
Cancelar boleto

🚫 Cancelar Boleto Bancário
Cancela um boleto específico, impedindo seu pagamento.

🎯 Objetivo
Invalidar um boleto que não deve mais ser pago, alterando seu status para CANCELED.

⚠️ Importante
Quando cancelar
✅ Boleto ainda não foi pago
✅ Status é PROCESSING ou PENDING
✅ Cliente desistiu da compra/recarga
✅ Houve erro nos dados do boleto
Não é possível cancelar
❌ Boleto já pago (status PAID)
❌ Boleto já cancelado (status CANCELED)
❌ Boleto expirado (status EXPIRED)
📋 Processo
DELETE /api/billets/:id
Status muda para CANCELED
Webhook updated-billet-status é disparado
Boleto não pode mais ser pago
🔄 Após Cancelamento
O que acontece
✅ Código de barras é invalidado
✅ Linha digitável não funciona mais
✅ URL do PDF ainda acessível (marcado como CANCELADO)
✅ Pix copia e cola é invalidado
O que NÃO acontece
❌ Não há reembolso (boleto não foi pago)
❌ Não gera novo boleto automaticamente
❌ Não cancela pedido/transação associada
💡 Casos de Uso
Cancelar antes do pagamento
Cliente desiste da compra antes de pagar:

DELETE /api/billets/689b893b59a7593764e8b0e1
Corrigir erro nos dados
Boleto gerado com valor errado, cancele e gere novo:

DELETE /api/billets/:id_errado
POST /api/billets com dados corretos
Evitar pagamento duplicado
Cliente já pagou por outro meio:

DELETE /api/billets/:id_do_boleto
🔗 Fluxo Recomendado
Verifique status atual: GET /api/billets/:id
Se status for PENDING ou PROCESSING, prossiga
Cancele: DELETE /api/billets/:id
Aguarde webhook updated-billet-status
Confirme status=CANCELED
⚠️ Atenção
Se o cliente tentar pagar um boleto cancelado:

O pagamento será recusado pelo banco
Nenhum valor será debitado
Nenhum webhook de pagamento será disparado
Parameters
Try it out
Name	Description
id *
string
(path)
ID do boleto a ser cancelado

689b893b59a7593764e8b0e1
Responses
Code	Description	Links
200	
Boleto cancelado com sucesso

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "_id": "689b893b59a7593764e8b0e1",
  "type": "BILLET",
  "gateway_key": "82032a9d-96e2-42a6-8fbf-58f45687361e",
  "establishment_id": "155444085",
  "establishment": {
    "id": 155085,
    "first_name": "EC Cobranças",
    "last_name": null,
    "document": "10068114001",
    "account_number": "300543394162",
    "account_check_digit": "8"
  },
  "marketplace": {
    "id": 26,
    "nickname": "Parceiro Integrações",
    "first_name": "Webhooks Integrações",
    "last_name": "API Integrações",
    "document": "60274849000185"
  },
  "representative": {
    "id": 63,
    "first_name": "EC Cobranças",
    "last_name": "string",
    "document": "10068114001"
  },
  "fees_banking": {
    "name": "Pacote de Tarifa Bancária Comercial",
    "description": "Pacote de Tarifa Bancária Comercial",
    "fees": 250
  },
  "description": "Venda por Boleto",
  "amount": 750,
  "original_amount": 1000,
  "barcode": "34199108400000010001090005834127892998860000",
  "digitable_line": "34191090080583412789529988600002910840000001000",
  "url": "https://billets/...pdf",
  "status": "PENDING",
  "expiration_at": "2025-08-28T12:00:00.000Z",
  "payment_limit_date": "2025-08-30T00:00:00.000Z",
  "fees": 250,
  "billing_instructions": [
    {
      "name": "late_fee",
      "mode": "PERCENTAGE",
      "amount": 1,
      "limit_date": "2025-08-25T00:00:00.000Z",
      "_id": "689b893b59a7593764e8b0e8"
    }
  ],
  "recharge": true,
  "gateway_authorization": "CELCOIN",
  "request_origin": "API",
  "created_at": "2025-08-12T18:34:35.601Z",
  "updated_at": "2025-08-12T18:34:35.601Z",
  "__v": 0,
  "client": {
    "first_name": "Antonio",
    "last_name": "Francisco",
    "document": "43878902077",
    "email": "antonio@emaildocliente.com",
    "_id": "689b893b59a7593764e8b0e2"
  },
  "pix_emv": "080014br.gov.bcb.pix...",
  "transaction_id": "2a7f6292-9339-49d7-b1bb-0ed159adb477"
}
No links
400	
Boleto não pode ser cancelado (já pago ou expirado)

No links
401	
Não autorizado

No links
404	
Boleto não encontrado

No links
500	
Erro interno

No links

POST
/api/billets/recharge
Recarga via boleto

💰 Recarga de Saldo via Boleto
Gera um boleto bancário para recarga de saldo na conta digital Paytime.

🎯 Objetivo
Permite que o estabelecimento adicione saldo à sua conta através do pagamento de um boleto bancário.

📋 Parâmetros
amount (obrigatório)
Valor da recarga em centavos
Mínimo: 1000 (R$ 10,00)
Exemplo: 5000 = R$ 50,00
⚠️ Observações
Taxas
O valor do boleto incluirá as taxas bancárias:

Valor cobrado = amount + fees_banking.fees
Valor creditado = amount (valor solicitado)
Exemplo:

Recarga solicitada: R$ 100,00 (amount=10000)
Taxa: R$ 2,50 (fees=250)
Valor do boleto: R$ 102,50
Valor creditado após pagamento: R$ 100,00
Vencimento
Vencimento automático: 3 dias após criação
Pode ser pago após o vencimento (conforme regras do banco)
Processo Assíncrono
POST: Retorna boleto com status PROCESSING
Webhook: Status evolui para PENDING (boleto disponível)
Pagamento: Cliente paga o boleto
Webhook: Status PAID e saldo creditado
🧪 Testes no Sandbox
Use os mesmos valores para simular cenários:

< R$ 100,00: Fica em PROCESSING
R$ 100-499,99: Evolui para PENDING
≥ R$ 500,00: Evolui para PAID automaticamente
💡 Casos de Uso
Recarga rápida de R$ 100
{
  "amount": 10000
}
Recarga de R$ 500 (vai para PAID no sandbox)
{
  "amount": 50000
}
🔗 Próximos Passos
Crie o boleto de recarga
Aguarde webhook com status=PENDING
Consulte GET /api/billets/:id para obter código de barras
Cliente paga o boleto
Após webhook status=PAID, saldo estará disponível
Parameters
Cancel
No parameters

Request body

application/json
Edit Value
Schema
{
  "amount": 1000
}
Execute
Responses
Code	Description	Links
200	
Boleto de recarga criado com sucesso

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "_id": "689b893b59a7593764e8b0e1",
  "type": "BILLET",
  "gateway_key": "82032a9d-96e2-42a6-8fbf-58f45687361e",
  "establishment_id": "155444085",
  "establishment": {
    "id": 155085,
    "first_name": "EC Cobranças",
    "last_name": null,
    "document": "10068114001",
    "account_number": "300543394162",
    "account_check_digit": "8"
  },
  "marketplace": {
    "id": 26,
    "nickname": "Parceiro Integrações",
    "first_name": "Webhooks Integrações",
    "last_name": "API Integrações",
    "document": "60274849000185"
  },
  "representative": {
    "id": 63,
    "first_name": "EC Cobranças",
    "last_name": "string",
    "document": "10068114001"
  },
  "fees_banking": {
    "name": "Pacote de Tarifa Bancária Comercial",
    "description": "Pacote de Tarifa Bancária Comercial",
    "fees": 250
  },
  "description": "Venda por Boleto",
  "amount": 750,
  "original_amount": 1000,
  "barcode": "34199108400000010001090005834127892998860000",
  "digitable_line": "34191090080583412789529988600002910840000001000",
  "url": "https://billets/...pdf",
  "status": "PENDING",
  "expiration_at": "2025-08-28T12:00:00.000Z",
  "payment_limit_date": "2025-08-30T00:00:00.000Z",
  "fees": 250,
  "billing_instructions": [
    {
      "name": "late_fee",
      "mode": "PERCENTAGE",
      "amount": 1,
      "limit_date": "2025-08-25T00:00:00.000Z",
      "_id": "689b893b59a7593764e8b0e8"
    }
  ],
  "recharge": true,
  "gateway_authorization": "CELCOIN",
  "request_origin": "API",
  "created_at": "2025-08-12T18:34:35.601Z",
  "updated_at": "2025-08-12T18:34:35.601Z",
  "__v": 0,
  "client": {
    "first_name": "Antonio",
    "last_name": "Francisco",
    "document": "43878902077",
    "email": "antonio@emaildocliente.com",
    "_id": "689b893b59a7593764e8b0e2"
  },
  "pix_emv": "080014br.gov.bcb.pix...",
  "transaction_id": "2a7f6292-9339-49d7-b1bb-0ed159adb477"
}
No links
400	
Valor inválido (mínimo R$ 10,00)

No links
401	
Não autorizado

No links
422	
Erro de validação

No links
500	
Erro interno

Casos de Teste
Esta seção apresenta um guia passo a passo para gerar Boleto e testar fluxo de webhooks na API Paytime

🧪 Casos de Teste — Boleto Bancário (Sandbox)
No ambiente de Sandbox, os boletos seguem regras simuladas de acordo com o valor informado em amount (centavos). Essas regras permitem validar os diferentes fluxos e webhooks disparados pela Paytime.

Cenário 1 — Boleto em PROCESSING
Condição: **amount**< 10000 (ex.: R$ 99,99).
Comportamento:
O boleto é criado com status **PROCESSING**.
Cenário 2 — Boleto em PENDING
Condição: 10000 ≥**amount** < 50000 (ex.: R$ 150,00 ou R$ 499,99).
Comportamento:
O boleto é criado com status **PROCESSING**.
O status é atualizado para **PENDING**.
Em seguida, um webhook de atualização (updated-billet-status) é disparado.
Cenário 3 — Boleto em PAID
Condição: amount≥ 50000 (ex.: R$ 500,00).
Comportamento:
O boleto passa pelo fluxo do Cenário 2.
O status é atualizado para **PAID**.
Um novo webhook de atualização (updated-billet-status) é disparado.
📑 Tabela Resumo — Cenários de Teste (Boleto Bancário)
Condição (amount)	Webhooks Disparados	Status Final
< 10000 (ex.: R$ 99,99)	-	PROCESSING
10000 ≥ amount < 50000 (ex.: R$ 150,00)	updated-billet-status	PENDING
≥ 50000 (ex.: R$ 500,00)	updated-billet-status	PAID
⚠️ Observação Importante:
Esses cenários são aplicáveis apenas em Sandbox e têm como objetivo validar integrações e fluxos de webhook. Em ambiente de produção, o comportamento seguirá a compensação bancária real.