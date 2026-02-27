Obs: A palavra urlServidor deve ser substituída pela url do servidor.

Parâmetros da Requisição
Headers
Nome	Tipo	Obrigatório	Descrição
integration-key	string	Sim	Chave de integração.
x-token	string	Sim	Token de autenticação. Pode ser encontrado em nosso portal na guia de integração.
Authorization	Auth Type Bearer Token	Sim	Inserir o Bearer Token, gerado na rota Auth
establishment_id	string	Sim	Id do estabelecimento que será gerado a transação
Exemplo de header da requisição
CURL

curl--request POST \
--location '{{server}/v1/marketplace/transactions' \
--header 'integration-key: your_integration_key' \
--header 'x-token: your_x_token' \
--header 'establishment_id;' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{bearer_token}}' \
Body
O corpo da requisição deve ser enviado no formato JSON, conforme descrito abaixo:

Nome	Tipo	Obrigatório	Descrição
payment_type	string	Sim	Tipo de transação. Valores permitidos: CREDIT (Crédito), PIX.
amount	number	Sim	Valor da transação em centavos.
installments	number	Não	Quantidade de parcelas. Obrigatório somente para transações do tipo crédito.
interest	string	Sim	Quem arcará com os custos das taxas. Valores permitidos: CLIENT, ESTABLISHMENT.
reference_id	string	Não	Identificador definido pelo cliente, utilizado para controle interno. Limite máximo de 100 caracteres.
client	object	Condicional	Dados do cliente.
client.address	object	Não	Endereço do cliente. Obrigatório para transações do tipo crédito.
card	object	Não	Dados do cartão. Obrigatório para transações do tipo crédito.
Estrutura dos Objetos
👥Objeto cliente
Nome	Tipo	Obrigatório	Descrição
first_name	string	Sim	Nome/Razão Social do cliente.
last_name	string	Não	Sobrenome/nome fantasia do cliente.
document	string	Sim	CPF/CNPJ do cliente.
phone	string	Sim	Número de telefone do cliente.
email	string	Sim	Email do cliente.
🗺️ Objeto endereço
Nome	Tipo	Obrigatório	Descrição
street	string	Sim	Logradouro.
number	string	Sim	Número.
complement	string	Não	Complemento.
neighborhood	string	Sim	Bairro.
city	string	Sim	Cidade.
state	string	Sim	Estado. Possíveis valores: AC, AL, AP, AM, BA, CE, DF, ES, GO, MA, MS, MT, MG, PA, PB, PR, PE, PI, RJ, RN, RS, RO, RR, SC, SP, SE, TO
zip_code	string	Sim	CEP. Deve conter exatamente 8 caracteres.

💳 Objeto Cartão
Nome	Tipo	Obrigatório	Descrição
holder_name	string	Sim	Nome do portador do cartão.
holder_document	string	Não	CPF/CNPJ do portador do cartão.
card_number	string	Sim	Número do cartão.
expiration_month	number	Sim	Mês de expiração (1 a 12).
expiration_year	number	Sim	Ano de expiração.
security_code	string	Sim	Código de segurança do cartão.
create_token	boolean	Não	Gerar Token com os dados do cartão.
token	string	Não	Token gerado do cartão
🔐 Antifraude
Nome	Tipo	Obrigatório	Descrição
session\_id	string	Não	ID gerado pelo SDK do antifraude
🔐Campo tipo Antifraude
Nome	Tipo	Obrigatório	Descrição
antifraud_type	string	Não	Tipo de antifraude aplicado na transação. THREEDS: Autenticação 3DS. IDPAY: Verificação IDPAY.
🔀 Payload info_additional (opcional)
Campo	Tipo	Obrigatório	Descrição
info_additional	array	Opcional	Lista de pares chave-valor com informações adicionais da transação. Utilizado principalmente em transações do tipo PIX, podendo incluir identificadores adicionais definidos pelo parceiro.
info_additional[].key	string	Sim	Chave identificadora da informação adicional. Exemplo: "origin_system".
info_additional[].value	string	Sim	Valor vinculado à chave. Exemplo: "ERP12345".
🔀 Payload split (opcional)
Campo	Tipo	Obrigatório	Descrição
split.title	string	Sim	Título para identificar o split na transação. Exemplo: "Comissão do Representante"
split.division	string	Sim	Tipo de divisão a ser aplicada entre os participantes. Valores possíveis: <br>• PERCENTAGE (porcentagem)<br>• CURRENCY (valor fixo)
split.establishments	array	Sim	Lista dos estabelecimentos que participarão do split.
split.establishments[].id	number	Sim	ID do estabelecimento secundário. Este será o recebedor de parte do valor da transação.
split.establishments[].value	number	Sim	Valor que será destinado ao estabelecimento: <br>• Percentual, se division for PERCENTAGE <br>• Em centavos, se division for CURRENCY

⚠️
Atenção
A inclusão do SDK do Antifraude é obrigatória para parceiros que contrataram o serviço de Antifraude da Paytime. Para aqueles que optarem por utilizar um serviço de antifraude próprio, a integração do SDK é opcional. Consulte a documentação de "Como gerar Session_id do Antifraude", clique aqui.

Exemplo do Body para criar a transação

json

{
    "payment_type": "CREDIT",//Formato de cobrança a ser utilizado
    "amount":39001,
    "installments":1,//Número de parcelas da compra
    "interest": "ESTABLISHMENT",//Quem irá assumir as taxas de cobrança dos juros do cartão de crédito CLIENT=Cliente ou ESTABLISHMENT=Estabelecimento
    "reference_id":"fb67fd4c-2e6a-41dc-b05c-13ab3001d2a1",//ID de referência do Cliente
    "client": {
        "first_name":"João",//Primeiro nome do Cliente ou Estabelecimento
        "last_name": "da Silva",//Sobrenome e último nome do Cliente ou Estabelecimento
        "document": "1006811401",
        "phone": "31992876545",//Número de telefone do Cliente ou Estabelecimento
        "email": "emaildocliente@gmail.com",//Email do Cliente ou Estabelecimento
        "address": {//Endereço do Cliente
            "street": "Rua Maria dos Desenvolvedores",//Endereço do Cliente ou Estabelecimento
            "number": "0101",//Número do endereço 
            "complement":"Debug",//Complemento do endereço
            "neighborhood": "Bairro Deploy",//Bairro que localiza o endereço
            "city": "Vitória",//Cidade que localiza o endereço
            "state": "ES",//Estado que localiza o endereço
            "country": "BR",//Pais que localiza o endereço
            "zip_code": "29090390"//CEP do endereço
        }
    },
    "card": {//Dados do cartão de crédito
        "holder_name": "João da Silva",//Nome do portador do cartão de crédito
        "holder_document": "58246374079",//Documento do portador do cartão de crédito
        "card_number": "5200000000001005",//Número do cartão de crédito
        "expiration_month": 12,//Mês de expiração do cartão de crédito
        "expiration_year":  2026,//Ano de expiração do cartão de crédito
        "security_code": "123",//CVC-Código de Verifcação do Cartão
        "create_token": true//Tokenização do Cartão, regras de antifraude pode ser aplicadas.
    },
    "session_id":"kdjkpolyt6a6xy6q2zqy",//Antifraude
    "antifraud_type":"IDPAY",//IDPAY ou THREEDS - Tipo de Antifraude
    "split": {
        "title": "Split Cartão Crédito",
        "division": "PERCENTAGE",
        "establishments": [
        {
            "id": 155100,//ID do estabelecimento
            "value":50
        }
        ]
    },
          "info_additional": [//Opcional
            {
            "key": "Origem",
            "value": "ClienteID"
            }
        ]
}

Exemplo de Resposta (200):

JSON

{
    "_id": "693b18d13296e51d4620e2b5",
    "status": "PENDING",
    "interest": "STORE",
    "establishment": {
        "id": 155085,
        "type": "INDIVIDUAL",
        "first_name": "EC  Cobranças API",
        "last_name": null,
        "document": "10068114001",
        "access_type": "ACQUIRER"
    },
    "marketplace": {
        "id": 26,
        "type": "LICENSED",
        "nickname": "Parceiro Integrações",
        "active": true,
        "first_name": "Webhooks Integrações",
        "last_name": "API Integrações",
        "document": "60274849000185"
    },
    "representative": {
        "id": 63,
        "marketplace_id": 26,
        "active": true,
        "first_name": "EC  Cobranças API",
        "last_name": null,
        "document": "10068114001"
    },
    "amount": 38065,
    "original_amount": 39001,
    "fees": 936,
    "type": "CREDIT",
    "gateway_key": "63425a53-938d-46fc-a6f5-db36f02486d6",
    "gateway_authorization": "PAYTIME",
    "card": {
        "brand_name": "MASTERCARD",
        "first4_digits": "5200",
        "last4_digits": "1005",
        "expiration_month": "12",
        "expiration_year": "2026",
        "holder_name": "JOÃO DA SILVA",
        "holder_document": "58246374079",
        "bin": "520000",
        "_id": "693b18d13296e51d4620e2b6"
    },
    "installments": 1,
    "customer": {
        "first_name": "João",
        "last_name": "da Silva",
        "document": "1006811401",
        "phone": "31992876545",
        "email": "emaildocliente@gmail.com",
        "address": {
            "street": "Rua Maria dos Desenvolvedores",
            "number": "0101",
            "complement": "Debug",
            "neighborhood": "Bairro Deploy",
            "city": "Vitória",
            "state": "ES",
            "zip_code": "29000000"
        },
        "_id": "693b18d13296e51d4620e2b7"
    },
    "point_of_sale": {
        "type": "ONLINE",
        "identification_type": "API"
    },
    "acquirer": {
        "name": "PAGSEGURO",
        "_id": "693b18d13296e51d4620e2c3"
    },
    "expected_on": [
        {
            "date": "2026-01-12T12:00:00.986Z",
            "amount": 38065,
            "status": "PENDING",
            "installment": 1
        }
    ],
    "plan": {
        "id": 79,
        "name": "Plano Comercial Total Antifraude",
        "days_anticipation": 1,
        "allow_anticipation": false,
        "modality": "ONLINE",
        "flag": {
            "id": 1,
            "name": "MASTERCARD"
        }
    },
    "antifraud": [
        {
            "analyse_status": "WAITING_AUTH",
            "analyse_required": "IDPAY",
            "session": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiIwOGQyYTY5Yy05NmU5LTRjYjYtYjMzMy1iMjYwYTRhOWE5N2IiLCJjbGlkIjoiZjJlZDc4ZWYtYzU3Zi00MWZkLWI4MGMtNDczN2U0MjA3MWVlIiwiZXhwIjoxNzY1NzM5ODU4LCJleHRyYSQiOnsiY29uZmlncyI6eyJkeW5hbWljV3JhcHBlciI6ZmFsc2V9LCJkb21haW5zIjpbImh0dHBzOi8vZGV2LnBheXRpbWUuY29tLmJyIiwiaHR0cHM6Ly9pZHBheS50aWx0YnIuY29tLmJyIiwiaHR0cHM6Ly9zYW5kYm94LnBheXRpbWUuY29tLmJyIiwiaHR0cHM6Ly9sb2NhaG9zdDo4MCIsImh0dHBzOi8vbG9jYWhvc3Q6NDIwMCJdfSwiaWF0IjoxNzY1NDgwNjU4LCJpc3MiOiJodHRwczovL2lkcGF5LXVhdC51bmljby5pbyIsImp0aSI6ImVmM2UzNTJiLWQxNDEtNDhlNC04MzFhLTM3NzU0ZDRiOGVjMSIsInNjb3BlIjoiKiIsInN1YiI6ImJjOTg5OGQ1LTM2NDItNGZjYS1iNjIzLTE3ZWM1YmVlMjBjNiJ9.cJz7p0IxP4O3HIUwI4YExpH5c964zDaMRciZwOU8a-v46DIxJgnFlAViuT0QDzjRgRk9pPLhzPBJmD5u3mmQdrtq_dN-WUhrmQQWqquFqGrtjsNvyvJZcNywO9cWC3k76udLs886KuvI3NeDPaLyZm0MvXtDm2O0WxuRpQWQ3L-QkOM2Yk13B-3Y5ZnwFwL5a8niQzNTmztnI6ahTlATi6hH-Krivm59OHm52kjrkIKlRC924XfwIZbJ4bfzYX28lkqnN7eFWSX8qzW2WTEoWlihTu8Swu1bnLQCEsw2wt8az7hC8-AcqLgQRmuZIFi2oudRXGdw2_evYu9Nf3-44A",
            "_id": "693b18d23296e51d4620e2ca",
            "antifraud_id": "ef3e352b-d141-48e4-831a-37754d4b8ec1"
        }
    ],
    "created_at": "2025-12-11T19:17:37.992Z",
    "info_additional": [],
    "reference_id": "fb67fd4c-2e6a-41dc-b05c-13ab3001d2a1"
}


POST
/api/transactions/card
Criar transação com cartão de crédito


Cria uma nova transação de cartão de crédito no sistema Paytime.

Fluxo de criação:

Enviar dados do cliente, cartão e valores
Sistema processa a transação
Pode retornar status PENDING (requer autenticação antifraude)
Cliente deve executar SDK do antifraude (3DS ou IDPAY)
Campos obrigatórios:

payment_type: "CREDIT"
amount: valor em centavos (ex: 39001 = R$ 390,01)
installments: número de parcelas (mínimo 1)
interest: "CLIENT" ou "ESTABLISHMENT" (quem paga juros)
client: dados completos do cliente
client.address: endereço completo (obrigatório para CREDIT)
card: dados do cartão OU token
Dados do cartão: Você pode enviar:

Dados completos: card_number, expiration_month, expiration_year, security_code, holder_name
OU Token: token (para reutilizar cartão já tokenizado)
Tokenização:

Defina card.create_token: true para gerar token do cartão
Token retornado no campo card.token da response
Armazene o token para transações futuras
Antifraude:

Opcional: envie session_id e antifraud_type (IDPAY ou THREEDS)
Se transação retornar PENDING:
Verificar antifraud[].analyse_required
Executar SDK correspondente (3DS ou IDPAY)
Split de pagamento:

Opcional: divida a transação entre estabelecimentos
split.division: "PERCENTAGE" (porcentagem) ou "CURRENCY" (valor fixo em centavos)
split.establishments[].id: ID do estabelecimento secundário
split.establishments[].value: valor ou percentual
Status possíveis:

CREATED: Transação criada
PENDING: Em processamento (pode requerer autenticação antifraude)
APPROVED/PAID: Transação confirmada
FAILED: Transação negada
REFUNDED: Transação estornada
DISPUTED: Em disputa
CANCELED: Cancelada
CHARGEBACK: Chargeback aprovado
Exemplo 1 - Transação simples (1x sem juros):

{
  "payment_type": "CREDIT",
  "amount": 39001,
  "installments": 1,
  "interest": "ESTABLISHMENT",
  "client": {
    "first_name": "João",
    "last_name": "da Silva",
    "document": "1006811401",
    "phone": "31992876545",
    "email": "emaildocliente@gmail.com",
    "address": {
      "street": "Rua Maria dos Desenvolvedores",
      "number": "0101",
      "neighborhood": "Bairro Deploy",
      "city": "Vitória",
      "state": "ES",
      "zip_code": "29090390"
    }
  },
  "card": {
    "holder_name": "João da Silva",
    "holder_document": "58246374079",
    "card_number": "5200000000001005",
    "expiration_month": 12,
    "expiration_year": 2026,
    "security_code": "123",
    "create_token": true
  }
}
Exemplo 2 - Com token (transação recorrente):

{
  "payment_type": "CREDIT",
  "amount": 29001,
  "installments": 1,
  "interest": "CLIENT",
  "client": {
    "first_name": "João",
    "last_name": "da Silva",
    "document": "1006811400",
    "phone": "31992876545",
    "email": "emaildocliente@gmail.com",
    "address": {
      "street": "Rua Maria dos Desenvolvedores",
      "number": "0101",
      "city": "Vitória",
      "state": "ES",
      "zip_code": "29090390"
    }
  },
  "card": {
    "token": "6ed0cc99bbf3a2fa68f45cc55df7ec96501b02af64d081c08e12235794069928167ca"
  }
}
Exemplo 3 - Com split e antifraude:

{
  "payment_type": "CREDIT",
  "amount": 39001,
  "installments": 1,
  "interest": "ESTABLISHMENT",
  "reference_id": "fb67fd4c-2e6a-41dc-b05c-13ab3001d2a1",
  "client": { ... },
  "card": { ... },
  "session_id": "kdjkpolyt6a6xy6q2zqy",
  "antifraud_type": "IDPAY",
  "split": {
    "title": "Split Cartão Crédito",
    "division": "PERCENTAGE",
    "establishments": [
      {
        "id": 155100,
        "value": 50
      }
    ]
  },
  "info_additional": [
    {
      "key": "Origem",
      "value": "ClienteID"
    }
  ]
}
⚠️ Importante:

Valores sempre em centavos (R$ 390,01 = 39001)
Para transações parceladas, o cliente ou estabelecimento arca com juros
Token de cartão deve ser armazenado com segurança
Session_id do antifraude é gerado via SDK (consulte doc Paytime)
Parameters
Try it out
Name	Description
establishment_id *
string
(header)
ID do estabelecimento que gerará a transação

establishment_id
Request body

application/json
Example Value
Schema
{
  "payment_type": "CREDIT",
  "amount": 39001,
  "installments": 1,
  "interest": "ESTABLISHMENT",
  "reference_id": "fb67fd4c-2e6a-41dc-b05c-13ab3001d2a1",
  "client": {
    "first_name": "João",
    "last_name": "da Silva",
    "document": "1006811401",
    "phone": "31992876545",
    "email": "emaildocliente@gmail.com",
    "address": {
      "street": "Rua Maria dos Desenvolvedores",
      "number": "0101",
      "complement": "Debug",
      "neighborhood": "Bairro Deploy",
      "city": "Vitória",
      "state": "ES",
      "country": "BR",
      "zip_code": "29090390"
    }
  },
  "card": {
    "holder_name": "João da Silva",
    "holder_document": "58246374079",
    "card_number": "5200000000001005",
    "expiration_month": 12,
    "expiration_year": 2026,
    "security_code": "123",
    "create_token": true,
    "token": "string"
  },
  "session_id": "kdjkpolyt6a6xy6q2zqy",
  "antifraud_type": "IDPAY",
  "split": {
    "active": true,
    "is_origin": true,
    "processing": true,
    "initial_amount": 0
  },
  "info_additional": [
    {
      "key": "Origem",
      "value": "ClienteID"
    }
  ]
}
Responses
Code	Description	Links
201	
Transação criada com sucesso

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "_id": "693b18d13296e51d4620e2b5",
  "status": "PENDING",
  "interest": "STORE",
  "establishment": {
    "id": 155085,
    "type": "INDIVIDUAL",
    "first_name": "EC  Cobranças API",
    "last_name": null,
    "document": "10068114001",
    "access_type": "ACQUIRER"
  },
  "marketplace": {
    "id": 26,
    "type": "LICENSED",
    "nickname": "Parceiro Integrações",
    "active": true,
    "first_name": "Webhooks Integrações",
    "last_name": "API Integrações",
    "document": "60274849000185"
  },
  "representative": {
    "id": 63,
    "marketplace_id": 26,
    "active": true,
    "first_name": "EC  Cobranças API",
    "last_name": null,
    "document": "10068114001"
  },
  "amount": 38065,
  "original_amount": 39001,
  "fees": 936,
  "type": "CREDIT",
  "gateway_key": "63425a53-938d-46fc-a6f5-db36f02486d6",
  "gateway_authorization": "PAYTIME",
  "card": {
    "brand_name": "MASTERCARD",
    "first4_digits": "5200",
    "last4_digits": "1005",
    "expiration_month": "12",
    "expiration_year": "2026",
    "holder_name": "JOÃO DA SILVA",
    "holder_document": "58246374079",
    "bin": "520000",
    "_id": "693b18d13296e51d4620e2b6"
  },
  "installments": 1,
  "customer": {
    "first_name": "João",
    "last_name": "da Silva",
    "document": "1006811401",
    "phone": "31992876545",
    "email": "emaildocliente@gmail.com",
    "address": {
      "street": "Rua Maria dos Desenvolvedores",
      "number": "0101",
      "complement": "Debug",
      "neighborhood": "Bairro Deploy",
      "city": "Vitória",
      "state": "ES",
      "zip_code": "29000000"
    },
    "_id": "693b18d13296e51d4620e2b7"
  },
  "point_of_sale": {
    "type": "ONLINE",
    "identification_type": "API"
  },
  "acquirer": {
    "name": "PAGSEGURO",
    "_id": "693b18d13296e51d4620e2c3"
  },
  "expected_on": [
    {
      "date": "2026-01-12T12:00:00.986Z",
      "amount": 38065,
      "status": "PENDING",
      "installment": 1
    }
  ],
  "plan": {
    "id": 79,
    "name": "Plano Comercial Total Antifraude",
    "days_anticipation": 1,
    "allow_anticipation": false,
    "modality": "ONLINE",
    "flag": {
      "id": 1,
      "name": "MASTERCARD"
    }
  },
  "antifraud": [
    {
      "analyse_status": "WAITING_AUTH",
      "analyse_required": "IDPAY",
      "session": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      "_id": "693b18d23296e51d4620e2ca",
      "antifraud_id": "ef3e352b-d141-48e4-831a-37754d4b8ec1"
    }
  ],
  "created_at": "2025-12-11T19:17:37.992Z",
  "info_additional": [],
  "reference_id": "fb67fd4c-2e6a-41dc-b05c-13ab3001d2a1"
}
No links
400	
Dados inválidos

Media type

application/json
Example Value
{
  "statusCode": 400,
  "message": [
    "O campo \"installments\" é obrigatório para transações do tipo CREDIT",
    "O campo \"card\" é obrigatório para transações do tipo CREDIT",
    "O campo \"client.address\" é obrigatório para transações do tipo CREDIT"
  ],
  "error": "Bad Request"
}
No links
401	
Token inválido ou expirado

Media type

application/json
Example Value
{
  "statusCode": 401,
  "message": "Unauthorized"
}
No links
422	
Transação negada pela Paytime

Media type

application/json
Example Value
{
  "statusCode": 422,
  "message": "Cartão inválido ou sem saldo"
}