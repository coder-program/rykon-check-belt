Fluxo de Ativação
Esta seção apresenta um guia passo a passo para o Ativação e Aprovação de Gateway na API Paytime

📑 Fluxo de Ativação e Aprovação de Gateway
Atenção
Cada Gateway possui regras e particularidades próprias. É importante compreender os cenários de uso antes de iniciar a ativação.

⚠️
Ativação de Banking

A ativação de um Gateway só é permitida quando o estabelecimento estiver com o campo "status": "APPROVED".
Consulte os casos de teste de criação de estabelecimentos
🔗 Vínculo de Gateways ao Estabelecimento
Ao cadastrar um estabelecimento defina quais Gateways estarão vinculados, conforme serviços contratados na Paytime.

⚙️ Etapas de Ativação
Ativação do Banking Paytime (Gateway ID 6)

Utilize a rota:
cURL

POST {{urlServidor}}/v1/marketplace/establishments/id/gateway
Consulte a documentação de Ativar gateway para o estabelecimento.
Informe os seguintes parâmetros:
"gateway_id": 6
"active":true
"form_receipt": "PAYTIME"
"fees_banking_id": id_da_tarifa_bancária
Modelo Body Ativação Banking Paytime
JSON

{
  "reference_id": "NumeroQueParceiroUsa",
  "gateway_id":6,
  "active": true,
  "form_receipt": "PAYTIME",
  "fees_banking_id": 0//ID da Tarifa Bancaria
}

📘 Para consultar os pacotes de tarifas bancárias, veja a documentação: Listar Pacotes de Tarifas Bancárias.


Jornada de KYC
Após ativar o Gateway 6, faça uma nova requisição na rota de Ativar Gateway e a resposta conterá o link do KYC:
JSON

...
"metadata": {
   "url_documents_copy": "https://..."
}
➡️ O cliente (titular do cadastro) deve seguir este link e concluir a jornada de KYC.
Somente após a aprovação do KYC, o Banking Paytime estará habilitado.
📌 Nota Técnica: O uso de bloqueadores de anúncio (ad blockers) pode impactar a análise antifraude e o processo de KYC, comprometendo a validação. Recomendamos desabilitar esses bloqueadores durante a jornada de autenticação.
Ativação da SubPaytime (Gateway ID 4)
Utilize novamente a rota:
cURL

POST {{urlServidor}}/v1/marketplace/establishments/id/gateways
Consulte a documentação de Ativar gateway para o estabelecimento.
Informe os seguintes parâmetros:
"gateway_id":4
"form_receipt": "PAYTIME"
"statement_descriptor": "descrição_no_extrato"
"plans": [ ], vincule os planos comerciais ao estabelecimento.
Modelo Body Ativação Sub Paytime
JSON

{
  "reference_id": "NumeroQueParceiroUsa",
  "gateway_id":4,
  "active": true,
  "form_receipt": "PAYTIME",
  "statement_descriptor": "descrição_no_extrato",
  "plans": [
    {
      "id":93,
      "active": true
    }
  ]
}

📘 Para consultar os planos disponíveis para o estabelecimento, veja a documentação: Listar Planos Comerciais.

🏦 Cadastro de Conta Bancária (BankAccount)
O recurso BANKACCOUNT deve ser utilizado para cadastrar uma nova conta bancária vinculada diretamente ao CPF/CNPJ do Parceiro.

Modelo Body Ativação BankAccount.
JSON

{
  "reference_id": "NumeroQueParceiroUsa",
  "gateway_id":4,
  "active": true,
  "form_receipt": "BANKACCOUNT",
  "bank_account": {
    "account_check_digit": "1",
    "account_number": "456789",
    "bank_code": "341",
    "routing_check_digit": "9",
    "routing_number": "1234",
    "type": "CHECKING"
  },
  "statement_descriptor": "CadastroBanking",
  "plans": [
    {
      "id":15,
      "active": true
    }
  ],
  "fees_banking_id": 2
}
Consulte a documentação de Ativar gateway para o estabelecimento.
🚨 Importante
Para que o SPLIT seja executado corretamente, é obrigatória a utilização do Banking Paytime (ID 6) e SubPaytime (Gateway ID 4).
A ordem de ativação deve ser seguida:
Banking Paytime (ID 6)
KYC
SubPaytime (ID 4)

Ativar gateway para o estabelecimento
Essa rota permite a ativação de uma plataforma de gateway (PagSeguro, Paytime ou Banking) para um estabelecimento.

🔼
POST urlServidor/v1/marketplace/establishments/{id}/gateways
Obs: A palavra urlServidor deve ser substituída pela url do servidor.

⚠️
Ativação de Banking e SubPaytime em SANDBOX
Para que o banking tenha o status: APPROVED precisa que o último dígito do phone objeto responsible do estabelecimento seja final 1.

Exemplo de header da requisição
CURL

curl--request POST \
--location 'POST /v1/marketplace/establishments/{id}/gateways' \
--header 'integration-key: your_integration_key' \
--header 'x-token: your_x_token' \
--header 'Authorization: Bearer {{bearer_token}}' \
Parâmetros da Requisição
Headers
Nome	Tipo	Obrigatório	Descrição
integration-key	string	Sim	Chave de integração.
x-token	string	Sim	Token de autenticação. Pode ser encontrado em nosso portal na guia de integração.
Authorization	Auth Type Bearer Token	Sim	Inserir o Bearer Token, gerado na rota Auth
Parâmetros de Path
Nome	Tipo	Obrigatório	Descrição
id	string	Sim	ID do estabelecimento que será vinculado ao gateway.
📥 Modelo Payload (Body)
JSON

{
  "reference_id": "string",
  "gateway_id": 4,
  "active": true,
  "form_receipt": "BANKACCOUNT",
  "bank_account": {
    "account_check_digit": "1",
    "account_number": "123456",
    "bank_code": "341",
    "routing_check_digit": "9",
    "routing_number": "1234",
    "type": "CHECKING"
  },
  "statement_descriptor": "string",
  "plans": [
    {
      "id": 57,
      "active": true
    }
  ],
  "fees_banking_id": 0
}
🧾 Tabela de Parâmetros do Body
Nome	Tipo	Obrigatório	Descrição
reference_id	string	Sim	Permite ao parceiro associar uma referência única da sua própria base de dados à transação ou operação executada na API da Paytime.
gateway_id	number	Sim	ID da plataforma a ser ativada: 2 = PagSeguro, 4 = Paytime, 6 = Banking.
active	boolean	Sim	Define se o gateway será ativado (true) ou desativado (false).
form_receipt	string	Condicional	Forma de recebimento. Valores possíveis: BANKACCOUNT, PAYTIME, PAGBANK.
bank_account.account_check_digit	string	Condicional	Dígito verificador da conta. Obrigatório se form_receipt = BANKACCOUNT.
bank_account.account_number	string	Condicional	Número da conta bancária.
bank_account.bank_code	string	Condicional	Code conforme cadastro no Banco Central. Exemplo: 341(Itaú) e 104(Caixa Econômica Federal)
bank_account.routing_check_digit	string	Condicional	Dígito verificador da agência. (Se aplicável)
bank_account.routing_number	string	Condicional	Número da agência bancária (sem dígito).
bank_account.type	string	Condicional	Tipo da conta bancária: CHECKING ou SAVING.
statement_descriptor	string	Condicional	Nome que aparecerá na fatura. Obrigatório para ativação do gateway Paytime.
plans[].id	number	Condicional	ID do plano a ser associado. Obrigatório para Paytime e PagSeguro.
plans[].active	boolean	Condicional	Define se o plano será ativado (true) ou desativado (false).
fees_banking_id	number	Condicional	ID do pacote de tarifas bancárias. Obrigatório para ativação de gateway do tipo Banking.
✅ Exemplo de Resposta
JSON

{
    "id": 371,
    "gateway": {
        "id": 4,
        "name": "PAYTIME"
    },
    "establishment_id": 155085,
    "gateway_key": "070738",
    "reference_id": "string",
    "status": "APPROVED",
    "active": true,
    "form_receipt": "BANKACCOUNT",
    "metadata": {
        "statement_descriptor": "string"
    },
    "created_at": "2025-01-09T19:16:00.000Z",
    "updated_at": "2025-06-09T20:46:21.000Z",
    "bank_account": null
}
📋 Explicação de Atributos da Resposta
Campo	Tipo	Obrigatório	Descrição
reference_id	string	Sim	Identificador de referência único para controle interno do parceiro.
gateway_id	number	Sim	ID do gateway a ser ativado: 2 - PagSeguro, 4 - Paytime, 6 - Banking.
active	boolean	Sim	Define se o gateway será ativado (true) ou desativado (false).
form_receipt	string	Sim	Forma de recebimento: BANKACCOUNT, PAYTIME, PAGBANK.
bank_account.account_check_digit	string	Condicional	Dígito verificador da conta bancária. Obrigatório se form_receipt = BANKACCOUNT.
bank_account.account_number	string	Condicional	Número da conta bancária.
bank_account.bank_id	number	Condicional	Código do banco conforme cadastro da plataforma.
bank_account.routing_check_digit	string	Condicional	Dígito verificador da agência.
bank_account.routing_number	string	Condicional	Número da agência (sem dígito). Máximo 4 caracteres.
bank_account.type	string	Condicional	Tipo da conta bancária: CHECKING ou SAVING.
statement_descriptor	string	Condicional	Nome que será exibido na fatura do cliente. Obrigatório para Sub Paytime.
plans[].id	number	Condicional	ID dos planos que serão associados. Obrigatório para Sub Paytime e PagSeguro.
plans[].active	boolean	Condicional	Flag de ativação do plano: true - ativar, false - desativar.
fees_banking_id	number	Condicional	ID do pacote de tarifas bancárias. Obrigatório para ativação Banking.
⚠️ Observações
A ativação de um gateway requer que o estabelecimento já esteja criado e com plano vinculado.

Campos como bank_account e fees_banking_id são obrigatórios somente para gateways com form_receipt: BANKACCOUNT.

Para o gateway Paytime, o campo statement_descriptor é obrigatório.

Listar gateways do estabelecimento
Essa rota permite consultar a lista de gateways configurados para um determinado estabelecimento, incluindo informações bancárias, status de ativação e dados adicionais.

🔼
GET urlServidor/v1/marketplace/establishments/{id}/gateways
Obs: A palavra urlServidor deve ser substituída pela url do servidor.

Exemplo de header da requisição
CURL

curl--request GET \
--location 'GET /v1/marketplace/establishments/{id}/gateways' \
--header 'integration-key: your_integration_key' \
--header 'x-token: your_x_token' \
--header 'Authorization: Bearer {{bearer_token}}' \
Parâmetros da Requisição
Headers
Nome	Tipo	Obrigatório	Descrição
integration-key	string	Sim	Chave de integração.
x-token	string	Sim	Token de autenticação. Pode ser encontrado em nosso portal na guia de integração.
Authorization	Auth Type Bearer Token	Sim	Inserir o Bearer Token, gerado na rota Auth
Parâmetros de Path
Nome	Tipo	Obrigatório	Descrição
id	string	Sim	ID do estabelecimento.
🔎 Parâmetros de Query (Opcionais)
Nome	Tipo	Obrigatório	Descrição
filters	string	Não	JSON com filtros. Ex: { "status": "APPROVED" }
search	string	Não	Texto a ser pesquisado nos dados.
perPage	number	Não	Quantidade de registros por página.
page	number	Não	Número da página.
sorters	string	Não	JSON com ordenadores. Ex: [{"column":"created_at","direction":"DESC"}]
✅ Exemplo de Resposta
JSON

{
  "total": 1,
  "page": 1,
  "perPage": 20,
  "lastPage": 1,
  "data": [
    {
      "id": 1,
      "gateway": {
        "id": 10,
        "name": "PagSeguro"
      },
      "establishment_id": 101,
      "gateway_key": "abc123xyz",
      "status": "APPROVED",
      "active": true,
      "form_receipt": "BANKACCOUNT",
      "bank_account": {
        "account_check_digit": "1",
        "account_number": "123456",
        "bank_id": 341,
        "routing_check_digit": "9",
        "routing_number": "1234",
        "type": "CHECKING"
      },
      "spb_account": null,
      "metadata": {
        "code": "123",
        "email": "user@mail.com",
        "token": "456",
        "statement_descriptor": "X Pagamentos"
      },
      "created_at": "2025-06-03T18:41:01.662Z",
      "updated_at": "2025-06-03T18:41:01.662Z"
    }
  ]
}
📋 Tabela de Atributos da Resposta
Campo	Tipo	Obrigatório	Descrição
id	number	Sim	ID da configuração do gateway.
gateway	object	Sim	Dados do gateway configurado.
gateway.id	number	Sim	ID do gateway.
gateway.name	string	Sim	Nome de identificação do gateway.
establishment_id	number	Sim	ID do estabelecimento associado à configuração.
gateway_key	string (nullable)	Não	Chave do gateway, se existir.
status	string	Sim	Status da configuração. Ex: PENDING, APPROVED, BLOCKED, etc.
active	boolean	Sim	Indica se o gateway está ativo.
form_receipt	string (nullable)	Não	Forma de recebimento. Ex: BANKACCOUNT, PAYTIME, PAGBANK, ZOOPBANK
bank_account	object (nullable)	Não	Conta bancária cadastrada.
bank_account.account_check_digit	string	Sim	Dígito verificador da conta.
bank_account.account_number	string	Sim	Número da conta bancária.
bank_account.bank_id	number	Sim	ID do banco conforme cadastro na plataforma.
bank_account.routing_check_digit	string	Sim	Dígito verificador da agência (se aplicável).
bank_account.routing_number	string	Sim	Número da agência bancária (sem dígito).
bank_account.type	string	Sim	Tipo da conta. Valores: CHECKING, SAVING.
spb_account	object (nullable)	Não	Conta SPB, utilizada em ativação BANKING.
spb_account.account_check_digit	string	Sim	Dígito verificador da conta.
spb_account.account_number	string	Sim	Número da conta bancária.
spb_account.bank_id	number	Sim	ID do banco conforme cadastro na plataforma.
spb_account.routing_check_digit	string	Sim	Dígito verificador da agência bancária (se aplicável).
spb_account.routing_number	string	Sim	Número da agência bancária (sem dígito).
spb_account.type	string	Sim	Tipo da conta bancária. Valores: CHECKING, SAVING.
metadata	object	Não	Informações adicionais de configuração.
metadata.code	string	Não	Código de controle interno.
metadata.email	string	Não	E-mail associado ao gateway.
metadata.token	string	Não	Token de autenticação interno.
metadata.statement_descriptor	string	Não	Nome que aparecerá na fatura do cliente.
created_at	string (date-time)	Sim	Data de criação da configuração.
updated_at	string (date-time)	Não	Data da última atualização.

Exibir gateway do estabelecimento
Esta rota retorna os dados de configuração do gateway associado a um estabelecimento, incluindo status da ativação, dados bancários e metadados relacionados à subadquirente.

🔼
GET urlServidor/v1/marketplace/establishments/{id}/gateways/{gatewayId}
Obs: A palavra urlServidor deve ser substituída pela url do servidor.

Exemplo de header da requisição
CURL

curl--request GET \
--location 'GET /v1/marketplace/establishments/1234/split-pre/1' \
--header 'integration-key: your_integration_key' \
--header 'x-token: your_x_token' \
--header 'Authorization: Bearer {{bearer_token}}' \
Parâmetros da Requisição
Headers
Nome	Tipo	Obrigatório	Descrição
integration-key	string	Sim	Chave de integração.
x-token	string	Sim	Token de autenticação. Pode ser encontrado em nosso portal na guia de integração.
Authorization	Auth Type Bearer Token	Sim	Inserir o Bearer Token, gerado na rota Auth
Parâmetros de Path
Nome	Tipo	Obrigatório	Descrição
id	string	Sim	ID do estabelecimento a ser consultado.
gatewayId	string	Sim	ID do gateway a ser exibido.
✅ Exemplo de Resposta
JSON

{
  "id": 1,
  "gateway": {
    "id": 10,
    "name": "PagSeguro"
  },
  "establishment_id": 101,
  "gateway_key": "abc123-xyz",
  "status": "PENDING",
  "active": true,
  "form_receipt": "BANKACCOUNT",
  "bank_account": {
    "account_check_digit": "1",
    "account_number": "123456",
    "bank_id": 341,
    "routing_check_digit": "9",
    "routing_number": "1234",
    "type": "CHECKING"
  },
  "spb_account": {
    "account_check_digit": "1",
    "account_number": "123456",
    "bank_id": 341,
    "routing_check_digit": "9",
    "routing_number": "1234",
    "type": "CHECKING"
  },
  "metadata": {
    "code": "123",
    "email": "user@mail.com",
    "token": "456",
    "statement_descriptor": "X Pagamentos"
  },
  "created_at": "2025-06-03T18:27:38.658Z",
  "updated_at": "2025-06-03T18:27:38.658Z"
}
📋 Tabela de Atributos da Resposta
Campo	Tipo	Obrigatório	Descrição
id	number	Sim	ID da configuração do gateway.
gateway.id	number	Sim	ID do gateway vinculado.
gateway.name	string	Sim	Nome de identificação do gateway.
establishment_id	number	Sim	ID do estabelecimento relacionado à configuração.
gateway_key	string	Não	Chave identificadora do gateway (pode ser null).
status	string	Sim	Status da ativação. Valores possíveis: PENDING, WAITING, ANALYZE, BLOCKED, CANCELED, DISAPPROVED, APPROVED.
active	boolean	Sim	Indica se a ativação do gateway está ativa.
form_receipt	string	Não	Forma de recebimento. Valores: BANKACCOUNT, PAYTIME, PAGBANK, ZOOPBANK.
bank_account.account_check_digit	string	Sim	Dígito verificador da conta.
bank_account.account_number	string	Sim	Número da conta bancária.
bank_account.bank_id	number	Sim	ID do banco (ex: 341 = Itaú).
bank_account.routing_check_digit	string	Sim	Dígito verificador da agência.
bank_account.routing_number	string	Sim	Número da agência bancária (sem dígito).
bank_account.type	string	Sim	Tipo de conta bancária. Ex: CHECKING, SAVING.
spb_account	objeto	Não	Mesmo modelo da bank_account, utilizado em contextos de conta SPB.
metadata.code	string	Não	Código de referência do gateway.
metadata.email	string	Não	Email vinculado à subadquirente.
metadata.token	string	Não	Token da subadquirente.
metadata.statement_descriptor	string	Não	Texto que aparecerá na fatura do cliente.
created_at	datetime	Sim	Data de criação da configuração do gateway.
updated_at	datetime	Não	Data da última atualização da configuração.

⚠️ Observações
O campo gateway_key pode ser null caso ainda não tenha sido atribuído.

A estrutura de bank_account e spb_account são semelhantes, mas atendem a finalidades diferentes.

As informações do objeto metadata são utilizadas principalmente em contextos de subadquirência (ex: configuração de marketplaces).