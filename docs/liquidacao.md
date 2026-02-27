Liquidations (Marketplace)
Liquidações do marketplace



GET
/api/liquidations
Listar liquidações completas

Retorna listagem completa de liquidações do Marketplace com valores, participantes, pagamentos, planos e histórico

Parameters
Cancel
Name	Description
filters
string
(query)
JSON com filtros aplicáveis

{"status":"PAID"}
search
string
(query)
Texto de busca

Estabelecimento
perPage
number
(query)
Registros por página (máximo 100)

20
page
number
(query)
Página atual

1
sorters
string
(query)
JSON com lista de ordenadores

[{"column":"created_at","direction":"DESC"}]
Execute
Responses
Code	Description	Links
200	
Liquidações listadas com sucesso

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "meta": {
    "total_amount": 350000,
    "total_transactions": 8,
    "total_payments": 0
  },
  "total": 2,
  "perPage": 20,
  "page": 1,
  "lastPage": 1,
  "data": [
    {
      "_id": "6720c0e72b1f2399b8e00000",
      "amount": 100000,
      "transactions": 3,
      "status": "PAID",
      "liquidation": "2025-07-22T22:10:38.308Z",
      "establishment": {
        "id": 1,
        "name1": "Estabelecimento Um",
        "name2": "Loja 1",
        "document": "12345678900",
        "status": "PAID",
        "active": true,
        "block": 10,
        "type": "store"
      },
      "marketplace": {
        "id": 1,
        "name1": "Marketplace Teste",
        "name2": "MKT",
        "document": "0099887766",
        "nickname": "mkt_teste"
      },
      "plans": [
        {
          "id": 1,
          "name": "Plano Físico",
          "allow_anticipation": true,
          "modality": "PHYSICAL",
          "pivot": {
            "plan_id": 1,
            "establishment_id": 1,
            "active": true
          }
        }
      ],
      "payments": [
        {
          "_id": "6720c0e72b1f2399b8e22222",
          "amount": 95000,
          "status": "PAID",
          "original_amount": 100000,
          "transfer_id": "0000c0e72b1f2399b8e00000",
          "send_to_establishment": true,
          "receipt": {
            "document": "12345678900",
            "form_receipt": "BANKACCOUNT",
            "type": "CHECKING",
            "routing_number": "0001",
            "account_check_digit": "1",
            "routing_check_digit": "2",
            "account_number": "12345",
            "bank": {
              "id": 1,
              "name": "Banco do Brasil",
              "code": "001",
              "ispb": "00000000"
            }
          },
          "effect": [],
          "reductions": [
            {
              "amount": 500,
              "motive": "Taxa administrativa",
              "description": "Desconto aplicado conforme acordo",
              "file_url": "https://example.com/file.pdf",
              "status": "CREATED",
              "history": [
                {
                  "status": "CREATED",
                  "user_id": 1,
                  "created_at": "2025-07-22T22:10:38.308Z"
                }
              ]
            }
          ]
        }
      ],
      "reprocessing": false,
      "history": [
        {
          "status": "PAID",
          "created_at": "2025-07-22T22:10:38.308Z",
          "user": {
            "id": 1,
            "first_name": "Admin",
            "last_name": "User"
          }
        }
      ],
      "created_at": "2025-07-22T22:10:38.308Z",
      "updated_at": "2025-07-22T22:10:38.308Z",
      "__v": 0
    }
  ]
}
No links
400	
Parâmetros inválidos

Media type

application/json
Example Value
{
  "statusCode": 400,
  "message": "Invalid filters format",
  "error": "Bad Request"
}
No links
401	
Não autorizado (token inválido ou ausente)

Media type

application/json
Example Value
{
  "statusCode": 401,
  "message": "Invalid or missing authentication token",
  "error": "Unauthorized"
}
No links

GET
/api/liquidations/extract
Listar liquidações sumarizadas

Retorna listagem resumida de liquidações para relatórios de repasse, conferências financeiras e conciliação bancária

Parameters
Cancel
Name	Description
filters
string
(query)
JSON com filtros aplicáveis

{"status":"CREATED"}
search
string
(query)
Texto de busca

Estabelecimento
perPage
number
(query)
Registros por página (máximo 100)

20
page
number
(query)
Página atual

1
sorters
string
(query)
JSON com lista de ordenadores

[{"column":"liquidation","direction":"DESC"}]
Execute
Responses
Code	Description	Links
200	
Liquidações sumarizadas listadas com sucesso

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "meta": {
    "total_amount": 100000,
    "total_transactions": 1,
    "total_payments": 0
  },
  "total": 1,
  "perPage": 20,
  "page": 1,
  "lastPage": 1,
  "data": [
    {
      "_id": "6720c0e72b1f2399b8e00000",
      "amount": 100000,
      "liquidation": "2025-07-22T22:10:38.308Z",
      "receipt": {
        "form_receipt": "BANKACCOUNT",
        "type": "CHECKING",
        "bank": {
          "name": "Banco do Brasil",
          "code": "001"
        }
      },
      "marketplace": {
        "id": 1,
        "document": "0099887766",
        "name1": "Marketplace Teste",
        "name2": "MKT",
        "nickname": "mkt_teste"
      },
      "establishment": {
        "id": 1,
        "document": "12345678900",
        "name1": "Estabelecimento Um",
        "name2": "Loja 1"
      },
      "modality": "PHYSICAL",
      "transfer_id": "0000c0e72b1f2399b8e00000",
      "payment_id": "1110c0e72b1f2399b8e00000"
    }
  ]
}
No links
400	
Parâmetros inválidos

Media type

application/json
Example Value
{
  "statusCode": 400,
  "message": "Invalid filters format",
  "error": "Bad Request"
}
No links
401	
Não autorizado (token inválido ou ausente)

Media type

application/json
Example Value
{
  "statusCode": 401,
  "message": "Invalid or missing authentication token",
  "error": "Unauthorized"
}
No links

GET
/api/liquidations/{id}/payments/{paymentId}/transfer
Exibir transferência

Retorna informações completas de uma transferência específica vinculada a um pagamento dentro de uma liquidação

Parameters
Cancel
Name	Description
id *
string
(path)
ID da liquidação associada à transferência

6720c0e72b1f2399b8e00000
paymentId *
string
(path)
ID do pagamento relacionado à transferência

0000c0e72b1f2399b8e00000
establishment_id *
string
(header)
ID do estabelecimento

establishment_id
Execute
Responses
Code	Description	Links
200	
Transferência encontrada com sucesso

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "_id": "0000c0e72b1f2399b8e00000",
  "type": "PIX",
  "status": "PAID",
  "amount": 100000,
  "expected_at": "2025-07-22T22:10:38.309Z",
  "gateway_key": "GATEWAY123",
  "liquidation_id": "6720c0e72b1f2399b8e00000",
  "gateway_authorization": "AUTH456",
  "lot_number": "789",
  "release_number": "456",
  "user": {
    "id": 1,
    "first_name": "Admin",
    "last_name": "User"
  },
  "payer": {
    "first_name": "João da Silva",
    "document": "12345678900",
    "routing_number": "0001",
    "routing_check_digit": "2",
    "account_number": "12345",
    "account_check_digit": "6",
    "type": "CHECKING"
  },
  "recipient": {
    "first_name": "João da Silva",
    "document": "12345678900",
    "routing_number": "0001",
    "routing_check_digit": "2",
    "account_number": "12345",
    "account_check_digit": "6",
    "type": "CHECKING",
    "bank_code": "001",
    "bank_name": "Banco do Brasil",
    "bank_ispb": "00000000",
    "pix_key": "teste@pix.com"
  },
  "history": [
    {
      "_id": "6720c0e72b1f2399b8e99999",
      "status": "PAID",
      "created_at": "2025-07-22T22:10:38.309Z"
    }
  ],
  "created_at": "2025-07-22T22:10:38.309Z",
  "updated_at": "2025-07-22T22:10:38.309Z",
  "__v": 0
}
No links
400	
Requisição inválida (IDs malformados)

Media type

application/json
Example Value
{
  "statusCode": 400,
  "message": "Invalid liquidation_id or payment_id format",
  "error": "Bad Request"
}
No links
401	
Não autorizado (token inválido ou ausente)

Media type

application/json
Example Value
{
  "statusCode": 401,
  "message": "Invalid or missing authentication token",
  "error": "Unauthorized"
}
No links
404	
Transferência não encontrada

Media type

application/json
Example Value
{
  "statusCode": 404,
  "message": "Transfer not found",
  "error": "Not Found"
}