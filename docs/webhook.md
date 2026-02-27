Introdução
Visão geral
Os webhooks, também conhecidos como HTTP Callbacks, permitem que você se inscreva para receber notificações em uma URL específica de sua escolha.

Sempre que ocorre uma alteração no estado de um recurso nas plataformas da Paytime — como a criação bem-sucedida de uma transação ou o estorno de uma transação — um evento correspondente é gerado e enviado para os webhooks cadastrados.


Como cadastrar os webhooks
Para utilizar a notificação de eventos por webhooks você precisa:

Implementar o seu sistema de recebimento de notificações via webhook.

Cadastrar as URLs do seu sistema na Paytime, através do seu Gestor:

Vá até o menu "Integração";
Informe e chave de integração e clique no botão "Consultar";
Clique na aba "Eventos";
Clique no Botão "Adicionar Eventos";
Selecione o evento que deseja receber;
Preencha o campo correspondente com a URL do seu sistema;
Clique no botão "Adicionar evento";
Pronto, webhook cadastrado!



Conteúdo do evento
Sempre que um evento webhook é disparado enviaremos um objeto JSON, conforme padrão abaixo. Exemplo de evento: new-sub-transaction

JSON

{
   "event":"new-sub-transaction",
   "event_date":"2025-04-30T17:05:53.107Z",
   "data":{
      "_id":"681258717903c84441e0e823",
      "status":"PENDING",
      "amount":1005,
      "original_amount":1017,
      "fees":12,
      "type":"CREDIT",
      "gateway_key":"849c88d8-8599-449d-8b0e-598036c6f014",
      "gateway_authorization":"PAYTIME",
      "card":{
         "brand_name":"MASTERCARD",
         "first4_digits":"5200",
         "last4_digits":"1005",
         "expiration_month":"12",
         "expiration_year":"2026",
         "holder_name":"JOÃO DA SILVA",
         "_id":"681258707903c84441e0e80b"
      },
      "installments":1,
      "customer":{
         "first_name":"João",
         "last_name":"da Silva",
         "document":"10068114004",
         "phone":"31992831124",
         "email":"emaildocliente@gmail.com",
         "address":{
            "street":"Rua Maria dos Desenvolvedores",
            "number":"0101",
            "complement":"Debug",
            "neighborhood":"Bairro Deploy",
            "city":"Vitória",
            "state":"ES",
            "zip_code":"29000000"
         },
         "_id":"681258707903c84441e0e80c"
      },
      "antifraud":[
         {
            "analyse_status":"NO_ANALYSED",
            "_id":"681258717903c84441e0e820"
         }
      ],
      "point_of_sale":{
         "type":"ONLINE",
         "identification_type":"API"
      },
      "acquirer":{
         "name":"PAGSEGURO",
         "acquirer_nsu":123456789123,
         "gateway_key":"354F9DD8-39AB-417D-B543-558126B347E9",
         "mid":"100000000000002",
         "_id":"681258717903c84441e0e822"
      },
      "created_at":"2025-04-30T17:05:52.924Z",
      "pix":null
   }
}
event: é o nome do evento que está sendo enviado, sua aplicação precisa estar preparada para identificar o tipo de evento;
event_date: é a data que o evento foi enviado;
data: É objeto JSON que contém as informações do webhook cadastrado, seguindo o padrão de resposta dos endpoints de criação, edição e atualização.
Nome dos eventos disponíveis na integração da plataforma
Name	Description
new-billet	Novo boleto criado
updated-billet-status	Atualização do status de um boleto
new-sub-split	Split de Transação Sub
canceled-sub-split	Cancelamento de Split Sub
new-establishment	Novo estabelecimento cadastrado
updated-establishment-status	Atualização do status de um estabelecimento
updated-establishment-gateway	Atualização de plataforma de um estabelecimento
updated-establishment-data	Atualização de dados de um estabelecimento
new-sub-transaction	Nova transação Sub
updated-sub-transaction	Transação Sub atualizada
new-pagseguro-transaction	Nova transação Pagseguro
updated-pagseguro-transaction	Transação Pagseguro atualizada
new-zoop-transaction	Nova transação Zoop
updated-zoop-transaction	Transação Zoop atualizada
Como funcionam os envios
Envio dos webhooks
Quando um evento é gerado e existem webhooks cadastrados para recebê-lo, o envio é realizado após a sua criação.

A URL do seu webhook deve estar publicamente acessível na internet, garantindo que a plataforma da Paytime possa alcançá-la e enviar os eventos corretamente.


Fluxo de tentativas de envios
Uma vez que a primeira tentativa de entrega não obtém sucesso, a Paytime efetuará novos disparos dentro de poucos instantes. Após um número máximo de 3 tentativas sem sucesso, o evento entra em estado de falha na entrega.


Timeout
Durante o disparo de um evento para um de seus webhook, a Paytime espera receber uma resposta em até 1 segundo. Caso esse tempo expire, fechamos a conexão e a Paytime irá tentar novamente o envio.

Casos de Disparos de Hooks
Os Webhooks da Paytime permitem que sua aplicação seja notificada em tempo real sobre eventos importantes que ocorrem em nossa plataforma, sem a necessidade de consultas constantes à API.

📌 Casos de disparo dos Webhooks
Evento

Quando é disparado

new-billet

Criação de boleto manual via Portal.

updated-billet-status

Sempre que houver atualização de status do boleto (ações assíncronas). Disparado tanto em requisições via Portal quanto via API.

updated-establishment-gateway

Atualização manual via Portal ou atualização interna (webhook, automatizações).

new-establishment

Criação de Estabelecimento (EC) manual via Portal.

updated-establishment-status

Atualização manual via Portal ou atualização interna (webhook, automatização, fluxo antifraude).

updated-establishment-data

Atualização de dados do Estabelecimento manual via Portal.

new-sub-split

Sempre que houver qualquer tipo de split em uma transação (independente da origem).

canceled-sub-split

Sempre que um split de transação for cancelado (independente da origem).

new-sub-transaction

Sempre que uma transação Sub for criada (exceto via API).

updated-sub-transaction

Disparado quando: • Uma transação é estornada • Uma transação sofre split. • Uma transação é liquidada. • Sofre qualquer alteração de status

new-zoop-transaction

Sempre que uma transação Zoop for criada.

updated-zoop-transaction

Disparado quando: • Uma transação é estornada • Sofre qualquer alteração de status (exceto via conciliadores).

new-pagseguro-transaction

Sempre que uma transação PagSeguro for criada.

updated-pagseguro-transaction

Disparado quando: • Uma transação é estornada • Sofre qualquer alteração de status


⚠️ É importante
Os eventos síncronos, como chamadas diretas de rotas POST e PUT, já retornam a resposta na própria requisição e não disparam Webhooks adicionais.


Exemplo do Conteúdo do evento
Quando o evento webhook é disparado enviaremos:

event: é o nome do evento que está sendo enviado, sua aplicação precisa estar preparada para identificar o tipo de evento;
event_date: é a data que o evento foi enviado;
data: É objeto JSON que contém as informações do webhook cadastrado, seguindo o padrão de resposta dos endpoints de criação, edição e atualização
Exemplo de evento: updated-sub-transaction

JSON

{
  "event": "updated-sub-transaction",
  "event_date": "2025-09-25T19:10:51.852Z",
  "data": {
    "_id": "68d593bb9849a930c4ac192e",
    "status": "PAID",
    "interest": "STORE",
    "establishment": {
      "id": 155085,
      "type": "INDIVIDUAL",
      "first_name": "EC Cobranças API",
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
      "first_name": "EC Cobranças API",
      "last_name": null,
      "document": "10068114001"
    },
    "amount": 993,
    "original_amount": 1005,
    "fees": 12,
    "type": "PIX",
    "gateway_key": "8dd94b26894e4abf99d77a1efd902e18",
    "gateway_authorization": "PAYTIME",
    "card": null,
    "installments": 1,
    "customer": {
      "_id": "68d593bb9849a930c4ac191b"
    },
    "point_of_sale": {
      "type": "ONLINE",
      "identification_type": "API"
    },
    "acquirer": {
      "name": "SANTANDER",
      "key": "60701190000104",
      "gateway_key": "8dd94b26894e4abf99d77a1efd902e18",
      "_id": "68d593bb9849a930c4ac193f"
    },
    "expected_on": [
      {
        "date": "2025-09-26T12:00:00.539Z",
        "amount": 993,
        "status": "PENDING",
        "installment": 1
      }
    ],
    "emv": "00020101021226910014BR.GOV.BCB.PIX2569spi-h.santander.com.br/pix/qr/v2/af581bdc-624e-4333-af38-1adaddfa6ce05204000053039865802BR5914PMD BASHAR RIO6009SAO PAULO62070503***6304E7DB",
    "antifraud": [
      {
        "analyse_status": "NO_ANALYSED",
        "_id": "68d593bb9849a930c4ac192c"
      }
    ],
    "created_at": "2025-09-25T19:10:51.543Z",
    "info_additional": []
  }
}

Listar eventos de webhook
Listar todos os eventos de webhook registrados na plataforma

🔽
GET urlServidor/v1/marketplace/hooks/hook-events
**Obs: ** A palavra urlServidor deve ser substituída pela url do servidor.

Parâmetros da Requisição
Nome	Tipo	Obrigatório	Descrição
integration-key	string	Sim	Chave de integração.
x-token	string	Sim	Token utilizado para autenticação. Pode ser encontrado no portal da API.
Authorization	Auth Type Bearer Token	Sim	Inserir o Bearer Token, gerado na rota Auth
Exemplo de header da requisição
CURL

curl--request GET \
--location '{{urlServidor}/v1/marketplace/hooks/hook-eventss' \
--header 'integration-key: your_integration_key' \
--header 'x-token: your_x_token' \
--header 'Authorization: Bearer {{bearer_token}}' \
Parâmetros de Query
Nome	Local	Tipo	Obrigatório	Descrição
filters	Query	String	Opcional	Filtros em formato JSON. Exemplo: { "status": "CREATED" }
search	Query	String	Opcional	Texto de busca. Campos pesquisáveis: name, description.
perPage	Query	Number	Opcional	Limitado ao máximo de 100 por página.
page	Query	Number	Opcional	Número da página.
sorters	Query	String	Opcional	JSON com lista de ordenadores. Campos: id, created_at. Exemplo: [ { "column": "created_at", "direction": "DESC" } ]
Exemplo de Response de sucesso.
JSON

{
  "total":1,
  "page": 1,
  "perPage": 20,
  "lastPage": 1,
  "data": [
     {
            "id": 5,
            "name": "new-sub-transaction",
            "description": "Nova transação Sub.",
            "active": true,
            "url": "https://meusistema.com.br/webhook-receiver",
            "basic_user": null,
            "basic_pass": null,
            "created_at": "2025-09-15T20:01:46.000Z",
            "updated_at": "2025-09-15T20:01:46.000Z"
        }
  ]
}
📤Explicação do resposta
Campo	Tipo	Descrição
total	Number	Número total de registros encontrados conforme os filtros aplicados.
page	Number	Página atual retornada.
perPage	Number	Quantidade de registros retornados por página.
lastPage	Number	Número total de páginas considerando a paginação aplicada.
data	Array	Lista de eventos de webhook retornados.
id	Number	Identificador único do evento webhook.
active	Boolean	Indica se o evento webhook está ativo (true) ou inativo (false).
name	String	Nome descritivo do evento webhook.
url	String	URL configurada para recebimento do payload do webhook.
basic_user	String	Usuário utilizado para autenticação básica (HTTP Basic Auth) na URL de destino, se configurado.
basic_pass	String	Senha utilizada para autenticação básica na URL de destino, se configurado.


Registrar novo evento webhook
Registrar novo evento de webhook para receber notificações automáticas.

🔽
POST urlServidor/v1/marketplace/hooks/hook-events
**Obs: ** A palavra urlServidor deve ser substituída pela url do servidor.

Parâmetros da Requisição
Nome	Tipo	Obrigatório	Descrição
integration-key	string	Sim	Chave de integração.
x-token	string	Sim	Token utilizado para autenticação. Pode ser encontrado no portal da API.
Authorization	Auth Type Bearer Token	Sim	Inserir o Bearer Token, gerado na rota Auth
Exemplo de header da requisição
CURL

curl--request POST \
--location '{{urlServidor}/v1/marketplace/hooks/hook-events' \
--header 'integration-key: your_integration_key' \
--header 'x-token: your_x_token' \
--header 'Authorization: Bearer {{bearer_token}}' \
Parâmetros Body
JSON

{
  "events": [
    {
      "event_id": 1,
      "active": true,
      "url": "https://meusistema.com.br/webhook-receiver",
      "basic_user": "usuario_webhook",
      "basic_pass": "senha_segura"
    }
  ]
}
📤Explicação do Payload
Campo	Tipo	Obrigatório	Descrição
events	Array	Sim	Lista de eventos webhook a serem registrados ou atualizados.
event_id	Number	Sim	ID do evento a ser associado ao webhook.
active	Boolean	Sim	Indica se o webhook está ativo (true) ou inativo (false).
url	String	Condicional	URL de recebimento do webhook — obrigatória quando active for true.
basic_user	String	Opcional	Usuário para autenticação básica HTTP.
basic_pass	String	Opcional	Senha para autenticação básica HTTP.
📤 Resposta (Exemplo)
JSON

{
    "events": [
        {
            "id": 5,
            "name": "new-sub-transaction",
            "description": "Nova transação Sub.",
            "active": true,
            "url": "https://meusistema.com.br/webhook-receiver",
            "basic_user": null,
            "basic_pass": null,
            "created_at": "2025-09-15T20:01:46.000Z",
            "updated_at": "2025-09-15T20:01:46.000Z"
        }
    ]
}


Redisparar um evento webhook
Redisparar um evento de webhook manualmente.

🔽
POST urlServidor/v1/marketplace/hooks/resend
**Obs: ** A palavra urlServidor deve ser substituída pela url do servidor.

Parâmetros da Requisição
Nome	Tipo	Obrigatório	Descrição
integration-key	string	Sim	Chave de integração.
x-token	string	Sim	Token utilizado para autenticação. Pode ser encontrado no portal da API.
Authorization	Auth Type Bearer Token	Sim	Inserir o Bearer Token, gerado na rota Auth
Exemplo de header da requisição
CURL

curl--request POST \
--location '{{urlServidor}/v1/marketplace/hooks/resend' \
--header 'integration-key: your_integration_key' \
--header 'x-token: your_x_token' \
--header 'Authorization: Bearer {{bearer_token}}' \
Parâmetros Body
JSON

{
  "event": "new-sub-transaction",
  "id": "507f191e810c19729de860ea"
}

📤Explicação do Payload
Campo	Tipo	Obrigatório	Descrição
event	String	Sim	Evento do webhook que será redisparado.
Possíveis valores event (Enum)	—	—	new-sub-transaction, updated-sub-transaction, new-zoop-transaction, updated-zoop-transaction, new-pagseguro-transaction, updated-pagseguro-transaction, new-establishment, update-establishment-status, update-establishment-data, new-billet, updated-billet-status, update-establishment-gateway, sub-split
id	String ou Number	Opcional	Identificador da entidade relacionada ao evento, quando aplicável.
Modelo resposta de Sucesso.
JSON

{
    "message": "Solicitação de webhook realizada com sucesso. Para garatir o recebimento, verifique se o evento está ativo e se a url foi configurada corretamente."
}


Remover Evento Webhook
Descrição: Remove um evento de webhook registrado anteriormente.

🔽
DELETE urlServidor/v1/marketplace/hooks/hook-events/event_id
**Obs: ** A palavra urlServidor deve ser substituída pela url do servidor.

Parâmetros da Requisição
Nome	Tipo	Obrigatório	Descrição
integration-key	string	Sim	Chave de integração.
x-token	string	Sim	Token utilizado para autenticação. Pode ser encontrado no portal da API.
Authorization	Auth Type Bearer Token	Sim	Inserir o Bearer Token, gerado na rota Auth
event_id	Number	Sim	ID do evento de webhook a ser removido.
Exemplo de header da requisição
CURL

curl--request DELETE \
--location '{{urlServidor}/v1/marketplace/hooks/hook-events/{event_id}' \
--header 'integration-key: your_integration_key' \
--header 'x-token: your_x_token' \
--header 'Authorization: Bearer {{bearer_token}}' \
Modelo resposta de Sucesso.
JSON

{
    "message": "Evento de webhook excluído."
}