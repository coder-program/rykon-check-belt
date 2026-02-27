DOCUMENTAÇÃO RYKON-PAY

Criar Transação Pix Qr Code
Esse endpoint permite a criação de uma nova transação no sistema da Paytime. É utilizada para registrar uma transação e obter os dados necessários para o seu processamento. O endpoint requer autenticação via cabeçalhos e os detalhes da transação devem ser fornecidos no corpo da requisição.

🔼
POST {urlServidor}/v1/marketplace/transactions
Obs: A palavra urlServidor deve ser substituída pela url do servidor.

Parâmetros da Requisição
Headers
Nome	Tipo	Obrigatório	Descrição
integration-key	string	Sim	Chave de integração.
x-token	string	Sim	Token de autenticação. Pode ser encontrado em nosso portal na guia de integração.
Authorization	Auth Type Bearer Token	Sim	Inserir o Bearer Token, gerado na rota Auth
Exemplo de header da requisição
CURL

curl--request POST \
--location '{urlServidor}/v1/marketplace/transactions' \
--header 'integration-key: your_integration_key' \
--header 'x-token: your_x_token
--header 'establishment_id:establishment_id' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{bearer_token}}' \
Body da requisição
O corpo da requisição deve ser enviado no formato JSON, conforme descrito abaixo:

Nome	Tipo	Obrigatório	Descrição
payment_type	string	Sim	Tipo de transação. PIX.
amount	number	Sim	Valor da transação em centavos.
interest	string	Sim	Quem arcará com os custos das taxas. Valores permitidos: CLIENT, ESTABLISHMENT.
client	object	Não	Dados do cliente opcional.
Estrutura dos Objetos
💲Payload do objeto da transação
Nome	Tipo	Obrigatório	Descrição
payment_type	string	Sim	Tipo de transação. PIX.
amount	number	Sim	Valor da transação em centavos.
interest	string	Não	Quem arcará com os custos das taxas. Valores permitidos: CLIENT, ESTABLISHMENT.
reference_id	string	Não	Identificador definido pelo cliente, utilizado para controle interno. Limite máximo de 100 caracteres.
👥 Payload do objeto cliente
Nome	Tipo	Obrigatório	Descrição
first_name	string	Não	Nome/Razão Social do cliente.
last_name	string	Não	Sobrenome/nome fantasia do cliente.
document	string	Não	CPF/CNPJ do cliente.
phone	string	Não	Número de telefone do cliente.
email	string	Não	Email do cliente.
🏢 Payload do objeto endereço
O endereço é opcional no envio do payload e deve ser a estrutura

Nome	Tipo	Obrigatório	Descrição
street	string	Sim	Logradouro, rua
number	string	Sim	Número.
complement	string	Não	Complemento.
neighborhood	string	Sim	Bairro.
city	string	Sim	Cidade.
state	string	Sim	Estado. Possíveis valores: Acre, Alagoas, Amapá, Amazonas, Bahia, Ceará, Distrito Federal, Espirito Santo, Goiás, Maranhão, Mato Grosso do Sul, Mato Grosso, Minas Gerais, Pará, Paraíba, Paraná, Pernambuco, Piauí, Rio de Janeiro, Rio Grande do Norte, Rio Grande do Sul, Rondônia, Roraima, Santa Catarina, São Paulo, Sergipe, Tocantins.
country	string	Sim	País. Exemplo: BR.
zip_code	string	Sim	CEP. Deve conter exatamente 8 caracteres.
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
Exemplo do Body para criar a transação
json

{
    "payment_type": "PIX",
    "amount": 3005,
    "interest": "CLIENT",
    "client": {
            "first_name":"João",
            "last_name": "da Silva",
            "document": "10068114001",
            "phone": "00000000001",
            "email": "emaildocliente@gmail.com"
        },
          "info_additional": [//Opcional
            {
            "key": "Origem da Venda",
            "value": "ClienteID"
            }
        ],
        "split": {//Opcional
        "title": "Split PIX",
        "division": "PERCENTAGE",
        "establishments": [
        {
            "id": 155100,
            "value": 30
        }
        ]
    }
}
Exemplo de Resposta (200):

JSON

{
    "_id": "68cd583ac28afa3e818e48ed",
    "status": "PENDING",
    "interest": "CLIENT",
    "establishment": {
        "id": 1085,
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
    "amount": 3005,
    "original_amount": 3041,
    "fees": 36,
    "type": "PIX",
    "gateway_key": "b4ab240dc9284fdaacf98ea7ec85caa9",
    "gateway_authorization": "PAYTIME",
    "card": null,
    "installments": 1,
    "customer": {
        "_id": "68cd583ac28afa3e818e48da"
    },
    "point_of_sale": {
        "type": "ONLINE",
        "identification_type": "API"
    },
    "acquirer": {
        "name": "SANTANDER",
        "key": "60701190000104",
        "gateway_key": "b4ab240dc9284fdaacf98ea7ec85caa9",
        "_id": "68cd583ac28afa3e818e48fe"
    },
    "expected_on": [
        {
            "date": "2025-09-22T12:00:00.088Z",
            "amount": 3005,
            "status": "PENDING",
            "installment": 1
        }
    ],
    "emv": "00020101021226910014BR.GOV.BCB.PIX2569spi-h.santander.com.br/pix/qr/v2/af581bdc-624e-4333-af38-1adaddfa6ce05204000053039865802BR5914PMD BASHAR RIO6009SAO PAULO62070503***6304E7DB",
    "antifraud": [
        {
            "analyse_status": "NO_ANALYSED",
            "_id": "68cd583ac28afa3e818e48eb",
            "session": null
        }
    ],
    "created_at": "2025-09-19T13:18:50.095Z",
    "info_additional": []
}
Casos de testes
Condição	Retorno
"amount": 105, Final com número igual 5 (cinco)	Transação do tipo PIX Aprovada.
"amount": 108, Final com número diferente 5 (cinco)	Transação do tipo PIX Pendente.
⚠️
Formato de data e hora
As Datas e horas geradas nos response, estão no formato ISO 8601, um padrão internacional para representação de datas e horas. Para utilizar o formato Brasileiro é necessário converter. Para converter a hora do UTC para o Horário de Brasília, basta subtrair 3 horas


Gerar QRCode Pix
Este endpoint foi desenvolvido como uma ferramenta auxiliar para quem deseja gerar a imagem de um QR Code a partir do código EMV (copia e cola) diretamente via API da Paytime.

🔽
GETurlServidor/v1/marketplace/transactions/{id}/qrcode
Obs: A palavra urlServidor deve ser substituída pela url do servidor.

📘
Importante:
Finalidade: Este endpoint não é obrigatório para a integração com o Pix. Ele serve para facilitar a geração de imagens do QR Code, caso deseje utilizar a API da Paytime para obter o hash em Base64.

Flexibilidade: Você pode optar por utilizar qualquer biblioteca ou ferramenta no frontend para criar a imagem do QR Code a partir do hash gerado.


O que é o Código EMV (Copia e Cola)?
O EMV (copia e cola) é o padrão que contém todas as informações necessárias para realizar um pagamento Pix. Ele pode ser utilizado de duas formas:

Colar diretamente no aplicativo do pagador.
Gerar uma imagem QR Code para ser escaneada, facilitando a experiência do usuário.
Como funciona a geração do QR Code?
O endpoint da API Paytime retorna o hash do QR Code em formato Base64, que é a representação codificada da imagem do QR Code.
Após receber o hash, cabe ao frontend utilizar uma biblioteca de sua escolha para:
Decodificar o hash Base64.
Gerar a imagem do QR Code.
Ajustar a exibição na aplicação, garantindo que o QR Code esteja visível e acessível para escaneamento.
Parâmetros da Requisição
Headers
Parâmetro	Tipo	Obrigatório	Descrição
integration-key	string	Sim	Chave de integração.
x-token	string	Sim	Token utilizado para autenticação. Pode ser encontrado no portal, na guia de integração.
Authorization	Auth Type Bearer Token	Sim	Inserir o Bearer Token, gerado na rota Auth
Path Parameters
Parâmetro	Tipo	Obrigatório	Descrição
id	string	Sim	ID da transação do tipo PIX para geração do QRCode.
Exemplo de Requisição
CURL

curl -X GET "https://urlServidor/v1/marketplace/transactions/12345/qrcode" \
-H "integration-key: your_integration_key" \
-H "x-token: your_x_token" \

⚠️
Atenção
A chave de integração integration-key e o token x-token devem ser obtidos através do portal do desenvolvedor.

O ID da transação (id) é obrigatório e deve ser válido para que o QRCode seja gerado com sucesso.

Resposta da Requisição
Se a requisição for processada com sucesso, será retornado um status 200 com a seguinte estrutura JSON:

JSON

{
    "qrcode": "data:image/gif;base64,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"
}

Informação	Modelo de imagem gerada a partir do hash em base 64.
Modelo de imagem gerada a partir do hash em base 64, através de uma ferramenta pública na internet.	

Campos da Resposta

Parâmetro	Tipo	Descrição
qrcode	string	Hash do QRCode Pix gerado em base 64. Contém todos os dados necessários para efetuar o pagamento.
