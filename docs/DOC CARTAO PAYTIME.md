DOCUMENTAÇÃO PAYTIME

Criar Transação com Cartão de Crédito
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
session_id	string	Não	ID gerado pelo SDK do antifraude
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
Requisição de Antifraude
Após executar a transação ela pode ficar com o status: PENDING e requerer a autenticação do Antifraude 3Ds ou IDPAY, onde no response da requisição contem o objeto antifraude que pode ter 2 comportamento:

"analyse_required": "THREEDS" deve ser executado o SDK do 3Ds a Implementação SKD - 3DS
"analyse_required": "IDPAY" deve ser executado o SDK do IDPAY a Implementação SKD - IDPAY.
Casos de Testes
🧪 Para realizar testes e obter corretamente os retornos com os status da transação, consulte a seção Como gerar o Session ID do Antifraude. Esse passo é essencial para simular o fluxo completo de autenticação com antifraude.


Status da transação
Sua transação pode retornar os status listados abaixo. Você deve realizar o desenvolvimento para tratar na sua aplicação o que fazer com cada status.

CREATED = Transação criada

PENDING = Transação em processamento

PAID = Transação confirmada

APPROVED = Transação confirmada

FAILED= Transação Negada

REFUNDED = Transação estornada

DISPUTED= Transação em estado de disputa

CANCELED= Transação foi cancelada em algum momento

CHARGEBACK = Transação com CHARGEBACK aprovado


Tokenização de cartão
A tokenização de cartão é um mecanismo de segurança que substitui os dados sensíveis do cartão de crédito por um identificador único e aleatório, denominado token. Esse token pode ser utilizado em transações futuras sem a necessidade de expor novamente os dados originais do cartão.

Criação de token:
Ao criar uma transação de cartão (POST {urlServidor}/v1/marketplace/transactions), no objeto card, inclua o campo create_token definido como true, juntamente com os dados do cartão. A API retornará, na resposta, um campo token, que deve ser armazenado em local seguro para uso posterior.

JSON

{
    "payment_type": "CREDIT",
    "amount":27001 ,
    "installments":1,
    "interest": "CLIENT",
    "client": {
        "first_name":"João",
        "last_name": "da Silva",
        "document": "1006811400",
        "phone": "31992876545",
        "email": "emaildocliente@gmail.com",
        "address": {//Endereço do Cliente
            "street": "Rua Maria dos Desenvolvedores",
            "number": "0101",
            "complement":"Debug",
            "neighborhood": "Bairro Deploy",
            "city": "Vitória",
            "state": "ES",
            "country": "BR",
            "zip_code": "29000000"
        }
    },
    "card": {
        "holder_name": "João da Silva",
        "holder_document": "58246374079",
        "card_number": "5200000000001005",
        "expiration_month": 12,
        "expiration_year":  2026,
        "security_code": "123",
        "create_token": true
    }
}
Uso de token em transações futuras:
Para capturar uma transação utilizando o token, basta informá-lo no objeto card, sem a necessidade de enviar os dados sensíveis do cartão.

Modelo payload utilizando a token do cartão
JSON

{
    "payment_type": "CREDIT",
    "amount":29001 ,
    "installments":1,
    "interest": "CLIENT",
    "client": {
        "first_name":"João",
        "last_name": "da Silva",
        "document": "1006811400",
        "phone": "31992876545",
        "email": "emaildocliente@gmail.com",
        "address": {
            "street": "Rua Maria dos Desenvolvedores",
            "number": "0101",
            "complement":"Debug",
            "neighborhood": "Bairro Deploy",
            "city": "Vitória",
            "state": "ES",
            "country": "BR",
            "zip_code": "29066430"//CEP do endereço
        }
    },
    "card": {//Token do cartão de crédito
        "token":"6ed0cc99bbf3a2fa68f45cc55df7ec96501b02af64d081c08e12235794069928167ca"
    }
}

Como gerar Session_ID do Antifraude?
⚠️
Atenção
A inclusão do SDK do Antifraude é obrigatória para parceiros que contrataram o serviço de Antifraude da Paytime. Para aqueles que optarem por utilizar um serviço de antifraude próprio, a integração do SDK é opcional.

Porque gerar um Session_id de antifraude?
A preocupação da Paytime é evitar, ao máximo, casos de fraudes em transações financeiras. Ao integrar o SDK da ClearSale, a Paytime reforça seu compromisso com a segurança, proporcionando uma camada extra de proteção que é fundamental em um cenário de riscos crescentes nas transações digitais. O session_id é obrigatório em todas as transações financeiras do tipo crédito.

Os passos serão:
Incluir SDK Browser antifraude na página de Checkout da aplicação

Obter session_id gerado no SDK Antifraude

Incluir o session_id no payload de criar transação do tipo Crédito

Como Incluir o SDK Browser ou Webview?
Introdução

O SDK Browser ou Webview é um script escrito em JavaScript que realiza coletas e análise de informações públicas da máquina do usuário. Através desse recurso é possível identificar se uma máquina já é conhecida pela ClearSale e qual o seu histórico de ações.

Implementação do script
Monitoramento Bloqueio de Script

Em alguns casos, a execução do script pode ser bloqueada pelo cliente de forma intencional, para coletar esta informação é necessário a implementação do bloqueio de script

Para incluir o monitoramento do bloqueio de script, inclua o seguinte trecho de código antes do fechamento da tag

script

<noscript>
    <img src="https://device.clearsale.com.br/p/fp.png?sid=SEU_SESSIONID&app=SEU_APPKEY&ns=1" />
</noscript>
Inclua o código abaixo no header ou rodapé da página que o Fingerprint está implementado.

script

<script>
    function checkUrl(url){
        let request = new XMLHttpRequest();
        request.open( "GET", url, true );
        request.send(null);
        request.onerror = (event) => {
            request.open("GET", "https://web.fpcs-monitor.com.br/p/fp.png?sid=SEU_SESSIONID&app=SEU_APPKEY&bl=1", false);
            request.send(null);
        }
    }
    checkUrl("https://device.clearsale.com.br/p/fp.png");
</script>
No código acima o texto SEU_APPKEY deve ser substituido pelo APPKEY informado pelo time de integração da PAYTIME.

Página de inclusão
É necessário que o script esteja em somente uma única página do website.

O tempo de execução do script dificilmente ultrapassa 3 segundos, contudo deve-se exigir um cuidado para que não ocorra evasão da página pelo usuário sem que este script termine sua função. Por isso recomendamos que seja uma página que represente interatividade com o usuário, tais como preenchimento de dados cadastrais ou informações de pagamento.

Local da página de inclusão
É expressamente obrigatório a inclusão das tags do script ao final da página html, antes do </body>.

O cumprimento desta recomendação garante que o website não sofra nenhum prejuízo de performance na integração.

Código
O código que deverá ser incluído na página, antes da tag </body>, conforme exemplo abaixo:

SCRIPT

<script>
    (function (a, b, c, d, e, f, g) {
    a['CsdpObject'] = e; a[e] = a[e] || function () {
    (a[e].q = a[e].q || []).push(arguments)
    }, a[e].l = 1 * Date.now(); f = b.createElement(c),
    g = b.getElementsByTagName(c)[0]; f.async = 1; f.src = d; g.parentNode.insertBefore(f, g)
    })(window, document, 'script', '//device.clearsale.com.br/p/fp.js', 'csdp');
    csdp('app', 'seu_app');
    csdp('sessionid', 'seu_id_de_sessao');
</script>
A ClearSale deverá informar qual valor deve ser utilizado na palavra sinalizada em verde (seu_app). Ele serve para identificar o seu website em nosso sistema. Já o valor sinalizado em verde (seu_id_de_sessao) trata-se do id da sessão do usuário no website. O valor do id de sessão deve conter no mínimo 6 e no máximo 128 caracteres. Este parâmetro é extremamente relevante e o mesmo valor de SessionID passado no parâmetro da coleta do Behavior Analytics deverá ser enviado para a ClearSale no campo "SessionID" da API de envio da transação/pedido.

Definição do SessionID
**O SessionID deve possuir um valor único por sessão.

**Em determinadas situações, como o uso do Google Tag Manager, não é possível preencher o valor do sessionid no bloco de código de implantação. Se este for o seu caso, você pode usar uma tag input em seu html e informar o id da tag no código de implantação.

HTML

<input type="hidden" id="MeuCampoComValor" value="Valor_do_Meu_SessionID"/>
No código de implantação basta informar o id do input que o script irá buscar o valor preenchido, conforme exemplo abaixo.

script

<script>
    (function (a, b, c, d, e, f, g) {
    a['CsdpObject'] = e; a[e] = a[e] || function () {
    (a[e].q = a[e].q || []).push(arguments)
    }, a[e].l = 1 * new Date(); f = b.createElement(c),
    g = b.getElementsByTagName(c)[0]; f.async = 1; f.src = d; g.parentNode.insertBefore(f, g)
    })(window, document, 'script', '//device.clearsale.com.br/p/fp.js', 'csdp');
    csdp('app', 'seu_app');
    csdp('inputsessionid', 'MeuCampoComValor');
</script>
OBS: Nota-se que, para este caso, o parâmetro sessionid deve ser alterado para inputsessionid.

Se você não utiliza valor de sessionid em seu website, nós podemos criá-lo para você, lembre-se que este valor deverá ser enviado para a ClearSale posteriormente.

Coloque em algum lugar da sua página um input conforme sugestão abaixo.

HTML

<input type="hidden" id="MeuCampoQueReceberaValor" value=""/>
No código de implantação basta informar o id do input que o script irá gerar um valor para o sessionid e armazená-lo lá, conforme exemplo abaixo.

script

<script>
    (function (a, b, c, d, e, f, g) {
    a['CsdpObject'] = e; a[e] = a[e] || function () {
    (a[e].q = a[e].q || []).push(arguments)
    }, a[e].l = 1 * new Date(); f = b.createElement(c),
    g = b.getElementsByTagName(c)[0]; f.async = 1; f.src = d; g.parentNode.insertBefore(f, g)
    })(window, document, 'script', '//device.clearsale.com.br/p/fp.js', 'csdp');
    csdp('app', 'seu_app');
    csdp('outputsessionid', 'MeuCampoQueReceberaValor');
</script>
OBS: Nota-se que, para este caso, o parâmetro sessionid deve ser alterado para outputsessionid..

Detalhes de privacidade
Uso de dados
Todas as informações coletadas pelo SDK da ClearSale são com exclusiva finalidade de prevenção à fraude e proteção ao próprio usuário, aderente à política de segurança e privacidade das plataformas Google e Apple e à LGPD. Por isso, estas informações devem constar na política de privacidade do aplicativo.

Tipo de dados coletados
O SDK da ClearSale coleta as seguintes informações do dispositivo :

Localização precisa (quando habilitada permissão pelo usuário);
Identificadores de publicidade do dispositivo (quando habilitada permissão pelo usuário);
Características físicas do dispositivo/ hardware (Como tela, bateria, teclado, espaço livre em disco, modelo, nome do dispositivo);
Características de software (Como versão, idioma, build, controle parental);
Informações de rede (Como Conexões, IP);
Operadora do SimCard.
🛡️ Casos de Teste com e sem Antifraude
Para testar a criação de transações e a utilização de antifraude, utilize a rota 🔼 POST urlServidor/v1/marketplace/transactions.

🛡️ Comportamento Baseado no último dígito do telefone
Antifraude Habilitado
Para clientes com o antifraude ativado, o comportamento da transação será avaliado com base no último dígito do número de telefone informado no momento da requisição.
Regras:
Se o último dígito do telefone for 2:
status da transação: FAILED
analyses_status (antifraude): FAILED
Para qualquer outro último dígito:
status da transação: PAID
analyses_status (antifraude): APPROVED
⚠️ Observação:
Quando o antifraude está habilitado e o último dígito do telefone for 2, a resposta imediata da API trará o status FAILED. Quando o antifraude está habilitado e o último dígito for diferente de 2, a resposta imediata da API trará PENDING e o status final (FAILED ou PAID) será atualizado via Webhook posteriormente .
Antifraude Desabilitado
Para clientes que não utilizam antifraude, o status da transação também será definido com base no último dígito do telefone, porém com lógica diferente:
Regras:
Se o último dígito do telefone for 4:
status da transação: FAILED (enviado via Webhook posteriormente)
analyses_status (Antifraude): NO_ANALYSED
Para qualquer outro último dígito:
status da transação: PAID (enviado via Webhook posteriormente)
analyses_status (Antifraude): NO_ANALYSED
⚠️ Observação:
Quando o antifraude está desabilitado, a resposta imediata da API trará o status PENDING. O status final (FAILED ou PAID) será atualizado via Webhook posteriormente.
✅ Tabela Resumo — Comportamento por último dígito do telefone

Antifraude	Último Dígito do Telefone	Status Inicial da transação (API)	analyses_status (Antifraude) - (API)	Status Final da transação (Webhook)
Habilitado	2	FAILED	FAILED	FAILED
Habilitado	Qualquer outro	PENDING	APPROVED	PAID
Desabilitado	4	PENDING	NO_ANALYSED	FAILED
Desabilitado	Qualquer outro	PENDING	NO_ANALYSED	PAID

SDK Browser ou Webview
Introdução
O SDK Browser ou Webview é um script escrito em JavaScript que realiza coletas e análise de informações públicas da máquina do usuário. Através desse recurso é possível identificar se uma máquina já é conhecida pela ClearSale e qual o seu histórico de ações.

Implementação do script
Monitoramento Bloqueio de Script
Em alguns casos, a execução do script pode ser bloqueada pelo cliente de forma intencional, para coletar esta informação é necessário a implementação do bloquei de script

Para incluir o monitoramento do bloqueio de script, inclua o seguinte trecho de código antes do fechamento da tag

JSON

<noscript>
    <img src="https://device.clearsale.com.br/p/fp.png?sid=SEU_SESSIONID&app=SEU_APPKEY&ns=1" />
</noscript>
Inclua o código abaixo no header ou rodapé da página que o Fingerprint está implementado


<script>
    function checkUrl(url){
        let request = new XMLHttpRequest();
        request.open( "GET", url, true );
        request.send(null);
        request.onerror = (event) => {
            request.open("GET", "https://web.fpcs-monitor.com.br/p/fp.png?sid=SEU_SESSIONID&app=SEU_APPKEY&bl=1", false);
            request.send(null);
        }
    }
    checkUrl("https://device.clearsale.com.br/p/fp.png");
</script>
No código acima o texto SEU_SESSIONID precisa ser substituido, pelo SessionID da transação e o texto SEU_APPKEY deve ser substituido pelo seu APPKEY.

Página de inclusão
É necessário que o script esteja em somente uma única página do website.

O tempo de execução do script dificilmente ultrapassa 3 segundos, contudo deve-se exigir um cuidado para que não ocorra evasão da página pelo usuário sem que este script termine sua função. Por isso recomendamos que seja uma página que represente interatividade com o usuário, tais como preenchimento de dados cadastrais ou informações de pagamento.

Local da página de inclusão
É expressamente obrigatório a inclusão das tags do script ao final da página html, antes do </body>.

O cumprimento desta recomendação garante que o website não sofra nenhum prejuízo de performance na integração.

Código
O código que deverá ser incluído na página, antes da tag </body>, conforme exemplo abaixo:

JSON

<script>
    (function (a, b, c, d, e, f, g) {
    a['CsdpObject'] = e; a[e] = a[e] || function () {
    (a[e].q = a[e].q || []).push(arguments)
    }, a[e].l = 1 * Date.now(); f = b.createElement(c),
    g = b.getElementsByTagName(c)[0]; f.async = 1; f.src = d; g.parentNode.insertBefore(f, g)
    })(window, document, 'script', '//device.clearsale.com.br/p/fp.js', 'csdp');
    csdp('app', 'seu_app');
    csdp('sessionid', 'seu_id_de_sessao');
</script>
A ClearSale deverá informar qual valor deve ser utilizado na palavra sinalizada em verde (seu_app). Ele serve para identificar o seu website em nosso sistema. Já o valor sinalizado em verde (seu_id_de_sessao) trata-se do id da sessão do usuário no website. O valor do id de sessão deve conter no mínimo 6 e no máximo 128 caracteres. Este parâmetro é extremamente relevante e o mesmo valor de SessionID passado no parâmetro da coleta do Behavior Analytics deverá ser enviado para a ClearSale no campo "SessionID" da API de envio da transação/pedido.

Definição do SessionID
**O SessionID deve possuir um valor único por sessão.

**Em determinadas situações, como o uso do Google Tag Manager, não é possível preencher o valor do sessionid no bloco de código de implantação. Se este for o seu caso, você pode usar uma tag input em seu html e informar o id da tag no código de implantação.

Coloque em algum lugar da sua página um input conforme a sugestão abaixo.

JSON

<input type="hidden" id="MeuCampoComValor" value="Valor_do_Meu_SessionID"/>
No código de implantação basta informar o id do input que o script irá buscar o valor preenchido, conforme exemplo abaixo.

JSON

<script>
    (function (a, b, c, d, e, f, g) {
    a['CsdpObject'] = e; a[e] = a[e] || function () {
    (a[e].q = a[e].q || []).push(arguments)
    }, a[e].l = 1 * new Date(); f = b.createElement(c),
    g = b.getElementsByTagName(c)[0]; f.async = 1; f.src = d; g.parentNode.insertBefore(f, g)
    })(window, document, 'script', '//device.clearsale.com.br/p/fp.js', 'csdp');
    csdp('app', 'seu_app');
    csdp('inputsessionid', 'MeuCampoComValor');
</script>
OBS: Nota-se que, para este caso, o parâmetro sessionid deve ser alterado para inputsessionid.

Se você não utiliza valor de sessionid em seu website, nós podemos criá-lo para você, lembre-se que este valor deverá ser enviado para a ClearSale posteriormente.

Coloque em algum lugar da sua página um input conforme sugestão abaixo.

JSON

<input type="hidden" id="MeuCampoQueReceberaValor" value=""/>
No código de implantação basta informar o id do input que o script irá gerar um valor para o sessionid e armazená-lo lá, conforme exemplo abaixo.

JSON

<script>
    (function (a, b, c, d, e, f, g) {
    a['CsdpObject'] = e; a[e] = a[e] || function () {
    (a[e].q = a[e].q || []).push(arguments)
    }, a[e].l = 1 * new Date(); f = b.createElement(c),
    g = b.getElementsByTagName(c)[0]; f.async = 1; f.src = d; g.parentNode.insertBefore(f, g)
    })(window, document, 'script', '//device.clearsale.com.br/p/fp.js', 'csdp');
    csdp('app', 'seu_app');
    csdp('outputsessionid', 'MeuCampoQueReceberaValor');
</script>
OBS: Nota-se que, para este caso, o parâmetro sessionid deve ser alterado para outputsessionid.

Detalhes de privacidade
Uso de dados
Todas as informações coletadas pelo SDK da ClearSale são com exclusiva finalidade de prevenção à fraude e proteção ao próprio usuário, aderente à política de segurança e privacidade das plataformas Google e Apple e à LGPD. Por isso, estas informações devem constar na política de privacidade do aplicativo.

Tipo de dados coletados
O SDK da ClearSale coleta as seguintes informações do dispositivo :

Localização precisa (quando habilitada permissão pelo usuário);
Identificadores de publicidade do dispositivo (quando habilitada permissão pelo usuário);
Características físicas do dispositivo/ hardware (Como tela, bateria, teclado, espaço livre em disco, modelo, nome do dispositivo);
Características de software (Como versão, idioma, build, controle parental);
Informações de rede (Como Conexões, IP);
Operadora do SimCard.

Introdução a 3DS
Explicação clara sobre o objetivo do 3DS, quando deve ser executado e os benefícios em termos de segurança e redução de fraudes/chargebacks.

Visão Geral do 3DS
O que é 3DS?
O sistema de autenticação de cartão 3DS é um protocolo de autenticação usado em transações online com cartão para garantir a segurança do pagamento.
Reduz riscos de fraude e chargeback.
Quando é exigido?
O banco pode pedir uma confirmação adicional (senha, código SMS, biometria) para garantir que é você mesmo fazendo a compra.
Quando será necessário executar 3Ds?
Nas transações PAYTIME, no retorno da chamada da API de transação retornar "status": "PENDING" e no Array de Antifraude: "analyse_required": "THREEDS"e "analyse_status": "WAITING_AUTH. Deve ser implementando o SDK do 3Ds.
Fluxo de Autenticação do 3Ds.
Executar a transação do tipo crédito
Implementar o SDK 3Ds - Consulte a documentação de Implementação SDK - 3Ds.
Realizar a autenticação da transação: Consulte a documentação Autenticação da Transação
O que acontece com a transação?
A transação fica com o "status": "PENDING" e não será listada, enquanto não for executado a validação do 3Ds.

Passo a Passo:
Início da Transação

Contém na resposta da Rota Transactions:
analyse_required = THREEDS

Gerar id no SDK 3Ds

Requisição de Autenticação na API PAYTIME

Implementação SDK - 3DS
Fluxo para utilizar o SDK do 3DS na sua aplicação de frontend.

Quando implementar o SDK?

Resposta da rota:

🔼
POST urlServidor/v1/marketplace/transactions
ter no Array - Antifraude "analyse_required": "THREEDS" e "analyse_status": "WAITING_AUTH)


1 - Adicione o Script do SDK em sua página Web.

Para utilizar o SDK do PagBank você deve incluir o script apresentado a seguir antes de fechar a tag <body> da sua página:

script

<script src="https://assets.pagseguro.com.br/checkout-sdk-js/rc/dist/browser/pagseguro.min.js"></script>
2 - Depois de adicionar o SDK Pagbank a sua aplicação, você irá utilizar o método setUp. Você deve fornecer a session, enviada na resposta da rota de criação de transação e definir o ambiente que será utilizado através do parâmetro env, conforme demonstrado a seguir:

script

PagSeguro.setUp({  
    session: 'SUA_SESSAO',//Retornado no response da rota de criar transação no array Antifraude
    env: 'ENV'//Define o ambiente que será utilizado. Você pode utilizar PROD para ambiente de produção e SANDBOX para ambiente sandbox.
});
3 - Monte o Payload abaixo com os dados a ser enviado para o SDK.

JSON

const request = {  
data: {  
customer: {  
  name: 'Jose da Silva',  
  mail: '[jose@gmail.com](mailto:jose@gmail.com)',  
phones: [  
      {  
        country: '55',  
        area: '11',  
        number: '999999999',  
        type: 'MOBILE'  
      },  
      {  
      country: '55',  
      area: '11',  
      number: '999999999',  
      type: 'HOME'  
      },  
      {  
      country: '55',  
      area: '11',  
      number: '999999999',  
      type: 'BUSINESS'  
      }  
    ]  
  },  
  paymentMethod: {  
    type: 'CREDIT_CARD',  
    installments: 1,  
    card: {  
    number: number,  
    expMonth: "02",  
    expYear: "2026",  
    holder: {  
    name: "Joao Silva"  
    }  
    }  
  },  
  amount: {  
  value: 500,  
  currency: 'BRL'  
  },  
  billingAddress: {  
  street: 'Av. Paulista',  
  number: '2073',  
  complement: 'Apto 100',  
  regionCode: 'SP',  
  country: 'BRA',  
  city: 'São Paulo',  
  postalCode: '01311300'  
  },  
  shippingAddress: {  
  street: 'Av. Paulista',  
  number: '2073',  
  complement: 'Apto 100',  
  regionCode: 'SP',  
  country: 'BRA',  
  city: 'São Paulo',  
  postalCode: '01311300'  
  },  
  dataOnly: false  
  }  
}
4 - Após estruturar o Payload, adicione no método PagSeguro.authenticate3DS

script

PagSeguro.setUp({  
  session: document.querySelector('SUA_SESSAO').value,  
  env: document.querySelector('ENV').value  
});  
PagSeguro.authenticate3DS(request).then( result => {  
  this.logResponseToScreen(result);  
  this.stopLoading();  
}).catch((err) => {  
  if(err instanceof PagSeguro.PagSeguroError ) {  
      console.log(err);  
      console.log(err.detail);  
      this.stopLoading();  
  }  
})
5 - Após essa configuração o seu 3DS esta habilitado e irá executar, com os possíveis retornos:

O método authenticate3DS é assíncrono. Caso a Promisse associada a sua chamada seja concluída com sucesso você receberá um objeto contentendo o status e o id.

Descrição

Define o status final do fluxo de autenticação. Pode apresentar 3 valores:

✅ AUTH_FLOW_COMPLETED: fluxo de autenticação terminou com sucesso, a transação pode estar autenticada ou não autenticada. Deve continuar para o fluxo de criação e pagamento de pedido.
⚠️ AUTH_NOT_SUPPORTED: fluxo de autenticação não foi completado. O cartão não é elegível ao programa 3DS. Para o meio de pagamento DÉBITO a transação deve ser finalizada após este retorno.
🔄 CHANGE_PAYMENT_METHOD: fluxo de autenticação foi negado pelo PagBank e outro meio de pagamento deve ser solicitado ao cliente.

6 - Após o retorno do SDK é necessário chamar a rota(endpoint) de autenticação da transação, passando o resultado do SDK e adicionar parâmetros necessários para a autenticação, (consulte a documentação).


Referência: https://developer.pagbank.com.br/reference/criar-pagar-pedido-com-3ds-validacao-pagbank

Autenticação da transação 3DS
Este endpoint é utilizado para enviar o resultado do SDK da autenticação de antifraude (3DS) referente a uma transação já criada, aguardando a confirmação do antifraude

O envio dessa autenticação é obrigatório quando a transação retorna a necessidade de 3DS ou IDPay. Sempre que o processo exigir validação — seja pelo 3DS ou pelo IDPAY — a resposta da API trará o objeto antifraud, conforme o exemplo abaixo:

JSON

"antifraud": [
  {
    "analyse_status": "WAITING_AUTH",
    "analyse_required": "THREEDS", // THREEDS
    "session": "...", // sessão do 3DS
    "antifraud_id": "..." // identificador da transação no 3DS
  }
Rota a ser chamada:
🔼
POST /v1/marketplace/transactions/id/antifraud-auth
📌 Headers
Nome	Tipo	Obrigatório	Descrição
integration-key	string	Sim	Chave de integração.
x-token	string	Sim	Token de autenticação. Pode ser encontrado em nosso portal na guia de integração.
Authorization	Auth Type Bearer Token	Sim	Inserir o Bearer Token, gerado na rota Auth
establishment_id	string	Sim	Id do estabelecimento que foi gerado a transação
📌 Path Parameters
Nome	Tipo	Obrigatório	Descrição
id	string	SIm	_ID da transação a ser validado
📌 Modelo do Body para 3Ds
O corpo da requisição deve ser enviado no formato JSON

JSON

{
  "id": "7292865a9-3ce8-47c2-a8e0-40ba7ac08b96",//Gerado pelo SDK
  "status": "AUTH_FLOW_COMPLETED",//Gerado pelo SDK
 	"authentication_status":"AUTHENTICATED"//Gerado pelo SDK
}
Detalhe do body 3Ds
Nome

Tipo

Obrigatório

Descrição

id

string

Sim

Gerado pelo SDK 3Ds

status

string

Sim

Gerado pelo SDK 3Ds . Podendo ser (

AUTH_FLOW_COMPLETED

AUTH_NOT_SUPPORTED

CHANGE_PAYMENT_METHOD)

authentication_status

string

Sim

Resultado da autenticação. Valores possíveis: AUTHENTICATED, NOT_AUTHENTICATED.

Retorno do Status na variável: ( charges.threeds.status)


Modelo Curl
cURL

curl --location 'https://api.sandbox.paytime.com.br/v1/marketplace/transactions/:id/antifraud-auth' \
--header 'integration-key: <SEU_INTEGRATION_KEY>' \
--header 'x-token: <SEU_X_TOKEN' \
--header 'establishment_id: <ID_DO_ESTABELECIMENTO' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer <BEARER_TOKEN_ROTA_AUTH' \
--data '{
  "id": "7292865a9-3ce8-47c2-a8e0-40ba7ac08b96",
  "status": "AUTH_FLOW_COMPLETED",
  "authentication_status":"AUTHENTICATED"
}
🔐 ID Transação após Autenticação com 3DS
O fluxo de autenticação 3DS pode variar conforme o uso (ou não) de mecanismos de antifraude.

Abaixo estão os comportamentos esperados em cada cenário:

Transações sem antifraude
Quando a transação não passa por nenhum processo de antifraude, o id retornado na requisição POST /transactions é definitivo.

Nesse caso, o pagamento é processado imediatamente, sem necessidade de autenticação adicional.

Transações com antifraude
Quando a transação passa por análise antifraude e necessidade do 3DS, o comportamento é diferente:

Na primeira requisição (POST /transactions), você receberá um ID temporário, que representa o registro inicial da tentativa de pagamento.
Esse ID deve ser utilizado na etapa de autenticação 3DS (endpoint de auth).
Após a autenticação do 3DS bem-sucedida, será retornado um novo ID, que corresponde à transação definitiva, já validada pelo antifraude e pelo 3DS.
Códigos de Resposta
Consulte a página com os status: Status de respostas

Para mais detalhes sobre os parâmetros e funcionamento da API, acesse a documentação oficial da Paytime.

Cartões de Teste 3Ds
Objetivo de listar cartões utilizados para simular os status do 3Ds.

Cartões para realizar casos de testes
Flag

card_number

amount

Response

Visa

4000000000002701

2701

Internal 3DS authenticated without challenge

charges.status = PAID charges.threeds.status = AUTHENTICATED

MASTERCARD

5200000000001005

1005

LINK

6505050000001000

1000

Visa

4000000000002503

2503

Internal 3DS authenticated with challenge

charges.status = PAID charges.threeds.status = AUTHENTICATED

MASTERCARD

5200000000001096

1096

LINK

6505050000001091

1091

Visa

4000000000002925

2925

Unauthenticated internal 3DS unchallenged

charges.status = PAID charges.threeds.status = NOT_AUTHENTICATED

MASTERCARD

5200000000001013

1013

LINK

6505050000001018

1018

Visa

4000000000002370

2370

Unauthenticated internal 3DS with challenge

charges.status = PAID charges.threeds.status = NOT_AUTHENTICATED

MASTERCARD

5200000000001104

1104

LINK

6505050000001109

1109

Visa

4000000000002701

4001

Internal 3DS authenticated without challenge

charges.status = DECLINED charges.threeds.status = AUTHENTICATED

MASTERCARD

5200000000001005

5201

LINK

6505050000001005

4001

Visa

4000000000002503

4003

Internal 3DS authenticated with challenge

charges.status = DECLINED charges.threeds.status = AUTHENTICATED

MASTERCARD

5200000000001096

5206

LINK

6505050000001091

6501

Visa

4000000000002925

4005

Unauthenticated internal 3DS unchallenged

charges.status = DECLINED charges.threeds.status = NOT_AUTHENTICATED

MASTERCARD

5200000000001013

5203

LINK

6505050000001018

6508

Visa

4000000000002370

4000

Unauthenticated internal 3DS with challenge

charges.status = DECLINED charges.threeds.status = NOT_AUTHENTICATED

MASTERCARD

5200000000001104

5204

LINK

6505050000001109

6509

Create and pay with PagBank 3DS authentication
This guide describes how to create and pay an order using 3DS authentication using PagBank's validation system. This option covers payment using Credit and Debit Cards.

The 3DS card authentication system is an authentication protocol used in online card transactions to ensure payment security. It may require cardholder validation through additional authentication such as a password, verification code, or biometric recognition.

Use the links below to navigate through this guide:

Add and configure the PagBank SDK
Authenticate the client
Enter purchase details
Autentique
Identify and handle errors
Create and pay the order
Test cases
Add and configure the PagBank SDK
To use the Pagbank validation system, you will add the PagBank SDK to your application. This way, your page will have access to the authentication methods provided by PagBank.

📘
SDK usage requirements

Before using the SDK, a public key and a session, respectively, must be generated. To obtain this information, use the Create Public Key and Create Session endpoints.

To use the PagBank SDK, you must include the script shown below before closing the tag <body> from your page:

HTML

<script src="https://assets.pagseguro.com.br/checkout-sdk-js/rc/dist/browser/pagseguro.min.js"></script>
🚧
IMPORTANT

In case you do some access control by domains in your application, it is necessary to allow the execution of js and opening of domain iframe "*.cardinalcommerce.com"

After adding the Pagbank SDK to your application, you will use the method setUp. You must provide the session, created using the endpoint Create 3DS authentication session and define the environment that will be used through the parameter env, as shown below:

JavaScript

PagSeguro.setUp({
    session: 'SUA_SESSAO',
    env: 'ENV'
});
The following table describes each parameter in more detail.

Parameter	Description
session	Defines the section. This parameter indicates the merchant who owns the interactions made by the SDK. The section is valid for 30 minutes. If this time is exceeded, you must generate a new section.
env	Defines the environment to be used. you can use PROD for production environment and SANDBOX for sandbox environment.
If the section expires during the authentication flow or order creation, a new section must be generated using the endpoint Create 3DS authentication session. Afterwards, you must use again the method setUp passing the new value to session.

Authenticate the client
For authentication, you will provide the card, customer, and device data to the contracted service. Based on this information, the card issuer will perform authentication, which can occur with or without challenge.

No challenge (no friction): the card issuing bank understands that the information provided is sufficient to authenticate the consumer
With challenge (with friction): the card-issuing bank understands that the information provided is insufficient to authenticate the consumer. Thus, an additional step is required for the consumer to take action to validate authenticity. Receiving a code via SMS or opening an app are examples of challenges. However, the type of challenge depends on the card-issuing bank.
📘
Transactions can be authenticated or unauthenticated

The decision to authenticate the transaction is up to the issuer, which means that your transaction may not be authenticated even if it has gone through the 3DS authentication flow. In cases of unauthenticated transactions, liability in cases of fraud chargeback will not be of the issuer.

With that in mind, Pagbank built a risk engine that critically analyzes unauthenticated transactions, seeking a balance between security and approval.

Enter purchase details
Before performing the authentication, organizing the customer data, the order, and additional settings in an object is necessary. Use the toggle to access the table that lists all parameters and defines which ones are required.

Parameter table
If you define a function for beforeChallenge, the defined function will receive a parameter that contains the following attributes:

Parameter	Description	Required
brand	Card banner.	Yes
issuer	Card issuing bank.	Conditional (If it exists in the database)
open	Function that will call the authentication challenge.	Yes
Autentique
After obtaining and organizing all the information necessary for authentication, you will use the method authenticate3DS, provided by the PagBank SDK. When calling the method authenticate3DS, you must supply the object with the data for authentication. Below you can find a code example where:

With the authentication information, is defined the variable request.
The method setUp is called.
The method authenticate3DS is used to authenticate with the data contained in request.
JavaScript

const request = {
  data: {
      customer: {
          name: 'Jose da Silva',
          email: 'jose@gmail.com',
          phones: [
        {
                  country: '55',
                  area: '11',
                  number: '999999999',
                  type: 'MOBILE'
        },
        {
                  country: '55',
                  area: '11',
                  number: '999999999',
                  type: 'HOME'
        },
        {
                  country: '55',
                  area: '11',
                  number: '999999999',
                  type: 'BUSINESS'
        }
      ]
    },
      paymentMethod: {
          type: 'DEBIT_CARD',
          installments: 1,
          card: {
              number: number,
              expMonth: "02",
              expYear: "2026",
              holder: {
                  name: "Joao Silva"
        }
      }
    },
      amount: {
          value: 500,
          currency: 'BRL'
    },
      billingAddress: {
          street: 'Av. Paulista',
          number: '2073',
          complement: 'Apto 100',
          regionCode: 'SP',
          country: 'BRA',
          city: 'São Paulo',
          postalCode: '01311300'
    },
      shippingAddress: {
          street: 'Av. Paulista',
          number: '2073',
          complement: 'Apto 100',
          regionCode: 'SP',
          country: 'BRA',
          city: 'São Paulo',
          postalCode: '01311300'
    },
      dataOnly: false
  }
}

PagSeguro.setUp({
  session: document.querySelector('SUA_SESSAO').value,
  env: document.querySelector('ENV').value
});

PagSeguro.authenticate3DS(request).then( result => {
  this.logResponseToScreen(result);
  this.stopLoading();
}).catch((err) => {         
  if(err instanceof PagSeguro.PagSeguroError ) {
      console.log(err);
      console.log(err.detail);
      this.stopLoading();
  }
})
The method authenticate3DS it is asynchronous. If the Promise associated with your call is successfully completed, you will receive an object containing the status and the id.

Field	Description	Required
status	Defines the final status of the authentication flow. It can display 3 values:
AUTH_FLOW_COMPLETED:authentication flow ended successfully, transaction can be authenticated or unauthenticated. You should continue to the order creation and payment flow.
AUTH_NOT_SUPPORTED: authentication flow was not completed. The card is not eligible for the 3DS program. For the DEBIT payment method, the transaction must be completed after this return.
CHANGE_PAYMENT_METHOD: authentication flow was denied by PagBank and another payment method must be requested from the customer.
REQUIRE_CHALLENGE: It is an intermediate status. It is returned in cases where the card issuer requests that the challenge be carried out. Indicate that the challenge should be displayed to the user.	Yes
id	Identifies authentication. the sameid must be added to the order creation and payment flow later.	Conditional.
Returned when status is AUTH_FLOW_COMPLETED.
When the status received is AUTH_FLOW_COMPLETED, you can proceed to step order creation and payment. You will use the amount received in id in this next step. However, if an error occurred during the authentication process, it must be analyzed and dealt with.

Identify and handle errors
If the Promise associated with the method call authenticate3DS is rejected, due to the occurrence of an error, you will have access to the error object. The error object will contain the parameter detail, which is also an object, containing the information about the cause of the problem. The following table describes the fields you will encounter when accessing content from detail.

Parameter	Description
detail.httpStatus	Indicates the HTTP status returned by the PagBank APIs that generated the error.
detail.traceId	Unique ID that identifies your request. Store this information to troubleshoot your request.
detail.message	Message indicating the problem faced.
detail.errorMessages	List containing details of validations.
detail.errorMessages.code	Validation code.
detail.errorMessages.description	Validation description.
detail.errorMessages.parameterName	Parameter sent that generated the validation error.
If you have problems or want to test your implementation, we recommend that you access the test scenarios described at the end of this page.

Create and pay the order
After getting the id when you finish the authentication process and have the card and order data available, you can create the order. For this, you will use the endpoint Create order.

To perform the request to the endpoint Create order, you need to provide in the body of the request the data described in Order object. Payment data must be added to the object charge. The page Charge object describes in detail each of the parameters that must be included.

As you are creating and paying an order using 3DS authentication, it is necessary that the 3DS authentication data and card data be added in the body of the request. Card data must be added to the object charges.card. The id of the 3DS authentication process must be sent through the parameter charges.authentication_method.idIn addition to the authentication data, you must define the parameter. charges.authentication_method.type with the value THREEDS. This information is required for Debit Card transactions. In addition, for the capture of the charge to be made automatically, together with the creation of the order, you must forward the parameter charges.payment_method.capture with the value true.

Below you will find examples of requests and responses made to the Create order using Credit Card endpoint.

Request (Crédito)
Response (Credit)

curl --location 'https://sandbox.api.pagseguro.com/orders' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{TOKEN}}' \
--data-raw '{
  "reference_id": "ex-00001",
  "customer": {
    "name": "Jose da Silva",
    "email": "email@test.com",
    "tax_id": "12345678909",
    "phones": [
      {
        "country": "55",
        "area": "11",
        "number": "999999999",
        "type": "MOBILE"
      }
    ]
  },
  "items": [
    {
      "reference_id": "referencia do item",
      "name": "nome do item",
      "quantity": 1,
      "unit_amount": 500
    }
  ],
  "shipping": {
    "address": {
      "street": "Avenida Brigadeiro Faria Lima",
      "number": "1384",
      "complement": "apto 12",
      "locality": "Pinheiros",
      "city": "São Paulo",
      "region_code": "SP",
      "country": "BRA",
      "postal_code": "01452002"
    }
  },
  "notification_urls": [
    "https://meusite.com/notificacoes"
  ],
  "charges": [
    {
      "reference_id": "referencia da cobranca",
      "description": "descricao da cobranca",
      "amount": {
        "value": 500,
        "currency": "BRL"
      },
      "payment_method": {
        "type": "CREDIT_CARD",
        "installments": 1,
        "capture": true,
        "soft_descriptor": "My Store",
        "card": {
          "number": "4111111111111111",
          "exp_month": "03",
          "exp_year": "2026",
          "security_code": "123",
          "holder": {
            "name": "Jose da Silva",
            "tax_id": "65544332211"
          }
        },
        "authentication_method": {
          "type": "THREEDS",
          "id": "3DS_15CB7893-4D23-44FA-97B7-AC1BE516D418"
        }
      }
    }
  ]
}'
To verify that the creation and payment of the order were successful, check the fields charges.status and charges.payment_response.message existing in the response body.

Test cases
The data presented in this section is provided so that you can test different behaviors while using the Sandbox environment. Different card numbers are provided that must be used in the field data.paymentMethod.card.number when defining the object with the purchase data. Depending on the card number used, you will get a different result in the authentication process with the method authenticate3DS. The following table presents the card numbers that you can use to perform the tests.

Flag	Test data	Response
Visa	payment_method.card.number = 4000000000002701
amount.value = 2701	Internal 3DS authenticated without challenge

charges.status = PAID
charges.threeds.status = AUTHENTICATED
MASTERCARD	payment_method.card.number = 5200000000001005
amount.value = 1005
LINK	payment_method.card.number = 6505050000001000
amount.value = 1000
Visa	payment_method.card.number = 4000000000002503
amount.value = 2503	Internal 3DS authenticated with challenge

charges.status = PAID
charges.threeds.status = AUTHENTICATED
MASTERCARD	payment_method.card.number = 5200000000001096
amount.value = 1096
LINK	payment_method.card.number = 6505050000001091
amount.value = 1091
Visa	payment_method.card.number = 4000000000002925
amount.value = 2925	Unauthenticated internal 3DS unchallenged

charges.status = PAID
charges.threeds.status = NOT_AUTHENTICATED
MASTERCARD	payment_method.card.number = 5200000000001013
amount.value = 1013
LINK	payment_method.card.number = 6505050000001018
amount.value = 1018
Visa	payment_method.card.number = 4000000000002370
amount.value = 2370	Unauthenticated internal 3DS with challenge

charges.status = PAID
charges.threeds.status = NOT_AUTHENTICATED
MASTERCARD	payment_method.card.number = 5200000000001104
amount.value = 1104
LINK	payment_method.card.number = 6505050000001109
amount.value = 1109
Visa	payment_method.card.number = 4000000000002701
amount.value = 4001	Internal 3DS authenticated without challenge

charges.status = DECLINED
charges.threeds.status = AUTHENTICATED
MASTERCARD	payment_method.card.number = 5200000000001005
amount.value = 5201
LINK	payment_method.card.number = 6505050000001005
amount.value = 4001
Visa	payment_method.card.number = 4000000000002503
amount.value = 4003	Internal 3DS authenticated with challenge

charges.status = DECLINED
charges.threeds.status = AUTHENTICATED
MASTERCARD	payment_method.card.number = 5200000000001096
amount.value = 5206
LINK	payment_method.card.number = 6505050000001091
amount.value = 6501
Visa	payment_method.card.number = 4000000000002925
amount.value = 4005	Unauthenticated internal 3DS unchallenged

charges.status = DECLINED
charges.threeds.status = NOT_AUTHENTICATED
MASTERCARD	payment_method.card.number = 5200000000001013
amount.value = 5203
LINK	payment_method.card.number = 6505050000001018
amount.value = 6508
Visa	payment_method.card.number = 4000000000002370
amount.value = 4000	Unauthenticated internal 3DS with challenge

charges.status = DECLINED
charges.threeds.status = NOT_AUTHENTICATED
MASTERCARD	payment_method.card.number = 5200000000001104
amount.value = 5204
LINK	payment_method.card.number = 6505050000001109
amount.value = 6509


Implementação SDK - IDPAY
Nesta seção, você encontrará como implementar o SDK da Unico na sua aplicação web para uso do produto Unico IDPay

⚠️
Requisito obrigatório
Para que o IDPAY funcione corretamente em ambiente de produção, é obrigatório informar previamente o domínio onde sua aplicação será executada.

Somente domínios autorizados poderão carregar e executar o SDK do IDPAY.
Informe o domínio a ser utilizado no roteiro de homologação.


Para o cenário de uso em Web, o uso do SDK da Unico é o recomendado, pelos seguintes motivos:

Maior segurança;
Experiência integrada ao seu fluxo;
Taxa maior de conversão quando usado o SDK;
Facilidade na implementação.
⚠️
O uso de integrações que não estejam em conformidade com os padrões estabelecidos nesta documentação pode resultar em interrupções inesperadas no funcionamento do sistema, as quais não serão cobertas ou suportadas pelo IDPay.

Ex: Implementar o iFrame do by Unico dentro de uma webview, implementar o iFrame através de uma tag de HTML, etc.

Orientações gerais

Para otimizar a performance da sua operação, melhorar a taxa de conversão e proporcionar uma experiência mais fluida para o usuário final, é obrigatório que a SDK da Unico seja sempre implementada em modo full screen(tela cheia) na sua aplicação. Confira como deve ser a implementação no exemplo abaixo:



Como começar
Para utilizar o IDPay por meio do SDK do Unico IDPay, o primeiro passo é cadastrar os domínios que serão utilizados como host para exibir a experiência da jornada do usuário.

🚧
Sinalize o responsável pelo seu projeto de integração ou o time de suporte da Unico para realizar essa configuração.

Para iniciar o uso do SDK, devemos iniciar com a instalação da SDK web da Unico:

JavaScript

$ npm install idpay-b2b-sdk
✅
Quando instalar o pacote do SDK da Unico, implemente sem especificar a versão que está utilizando e de modo que seu gerenciador de dependências atualize sempre os minors e patches para a versão mais recente.
Para verificar versões anteriores, acesse https://www.npmjs.com/package/idpay-b2b-sdk?activeTab=versions.

Métodos disponíveis
init(options)
Esse método permite que o SDK seja inicializado, independentemente de um ID de transação, fazendo com que a experiência do usuário final seja mais fluida. Uma vez que quando o ID da transação e o token estiverem disponíveis, a aplicação já tenha sido pré-carregada através desse método. Se esse método não for chamado diretamente pela aplicação, o usuário final terá um carregamento longo na primeira abertura do SDK.

Parâmetros:

options
Recebe um objeto com propriedades de configuração:
type
O tipo de fluxo que será inicializado. Hoje, disponibilizamos dois tipos de fluxos (IFRAME). Para novas aplicações, recomendamos o uso do tipo IFRAME, tornando a experiência para o usuário final muito mais fluida e com menos fricção, já que não será necessário sair da tela de checkout, e o carregamento da experiência poderá ser realizado previamente.
JavaScript

import { IDPaySDK } from “idpay-b2b-sdk”;

IDPaySDK.init({
  type: 'IFRAME',
  env: 'uat' // Só irá ser preenchido se for ambiente de testes.
});
open(transactionId, token, onFinish? )

Esse método realiza a abertura da experiência do IDPay de acordo com o fluxo escolhido previamente, na função de inicialização. Para o fluxo do tipo REDIRECT, essa função faz um simples redirecionamento para a rota do fluxo de captura do IDPay. Para o fluxo do tipo IFRAME, essa função exibe o iframe já pré-carregado, e inicia o fluxo de mensageria entre a página do cliente e a experiência do IDPay.

Parâmetros:

options
Recebe um objeto com propriedades de configuração:
transactionId
Recebe o ID da transação criada. Esse ID é importante para conseguirmos obter os detalhes da transação e realizarmos todo o fluxo da maneira correta (pode ser obtido na criação da transação via API).
token
Recebe o token da transação criada. Esse token é importante para conseguirmos autenticar a transação e garantir que somente domínios autorizados utilizem-na (pode ser obtido na criação da transação via API)
opcional onFinish(transaction, type)
Recebe uma função de callback que será executada no término do fluxo de captura do IDPay, passando dois argumentos:
O objeto da transação com os seguintes dados: captureConcluded, concluded, id
O tipo da resposta que pode ser FINISH, para casos onde o fluxo foi finalizado com sucesso, ou ERROR, para casos onde o fluxo foi interrompido por um erro¹.
[1] em casos de erro no fluxo, a transação não terá seu status alterado e um callback via webhook, caso configurado, não será realizado.
*Adaptado com variáveis retornadas pela API da PAYTIME.

JavaScript

const transactionId = antifraud_id // Deve receber o valor de antifraud_id retornado na criação da transação;
const token = session;//Deve ser preenchido com o valor de session retornado na criação da transação

const transaction = {
  id: antifraud_id,// Deve receber o valor de antifraud_id retornado na criação da transação;
  concluded: true,
  captureConcluded: true
};

const onFinish = (transaction, type) => {
  console.log('response', transaction, type);
}

IDPaySDK.open({
  transactionId,
  token,
  onFinish
});

// Você também pode encerrar o SDK explicitamente através do método abaixo
IDPaySDK.close();
Como rodar em ambiente de teste
Frontend deve rodar em https://localhost ;
Backend conectado em Sandbox Paytime, com as chaves desse ambiente;
Layout exemplo

Requisitos
Realize os teste de validação em mais de um navegador.

Chrome
Firefox
Safari
De forma geral, o SDK da suporte a WebRTC e versões mais recentes dos browsers listados acima. Por questões de compatibilidade e segurança, o funcionamento em versões muito antigas destes browsers não é garantido.

Segurança​
Após uma análise cuidadosa das necessidades e desafios que enfrentamos, decidimos adotar uma solução baseada em iFrames com tokens de autenticação ao invés de implementar uma política de Content Security Policy (CSP). Essa escolha foi motivada por diversas considerações relacionadas à segurança e à flexibilidade necessárias para atender às demandas dos nossos clientes.

Contexto e Desafios com CSP
​O Content Security Policy (CSP) é uma ferramenta poderosa para proteger aplicações web contra diversos tipos de ataques, como Cross-Site Scripting (XSS) e injeção de código. No entanto, ao configurar uma política CSP, é necessário definir uma lista rígida de domínios confiáveis. Essa abordagem é eficaz quando os domínios são fixos e previsíveis. No entanto, para nossos clientes, que frequentemente utilizam domínios dinâmicos e variáveis, essa configuração rígida apresenta desafios significativos.

Vulnerabilidade com Domínios Dinâmicos
Os domínios dinâmicos representam um risco substancial para a segurança ao usar CSP. Quando um cliente possui domínios que mudam com frequência ou são criados dinamicamente, seria necessário atualizar constantemente a política CSP para incluir esses novos domínios. Isso não só aumenta o esforço de manutenção, mas também expõe os domínios aos quais a política CSP se aplica. Cada domínio adicionado à política CSP é potencialmente um ponto de vulnerabilidade se não for adequadamente gerenciado.

Solução com IFrame e Auth Token​
Para mitigar esses riscos e atender à flexibilidade exigida pelos nossos clientes, optamos por utilizar iframes combinados com tokens de autenticação. Esta solução oferece uma camada adicional de segurança e evita a necessidade de expor ou gerenciar uma lista extensa e dinâmica de domínios.

Como funciona​PreviousWeb

Autenticação Segura: Cada iframe é carregado com um token de autenticação exclusivo para cada transação, garantindo que apenas usuários autorizados possam acessar o conteúdo. Esse token é verificado em tempo real, proporcionando uma camada adicional de segurança e controle.
Isolamento de Conteúdo: O uso de iframes permite isolar o conteúdo em um contexto separado, reduzindo o risco de interferência entre diferentes origens e mitigando potenciais ataques.
Flexibilidade para Domínios Dinâmicos: Ao não depender de uma política CSP estática, nossa solução se adapta facilmente aos domínios dinâmicos dos clientes, sem a necessidade de atualização constante das políticas de segurança.
As instruções completas para implementação do SDK Web estão disponíveis em: https://devcenter.unico.io/unico-idpay/integracao/controlando-a-experiencia/web/sdk

Autenticação da transação IDPAY
Este endpoint é utilizado para enviar o resultado do SDK da autenticação de antifraude IDPay referente a uma transação já criada, aguardando a confirmação do antifraude

O envio dessa autenticação é obrigatório quando a transação retorna a necessidade de 3DS ou IDPay. Sempre que o processo exigir validação — seja pelo 3DS ou pelo IDPAY — a resposta da API trará o objeto antifraud, conforme o exemplo abaixo:

JSON

"antifraud": [
  {
    "analyse_status": "WAITING_AUTH",
    "analyse_required": "IDPAY", //IDPAY
    "session": "...", // token do IDPAY
    "antifraud_id": "..." // identificador da transação no IDPAY
  }
Rota a ser chamada:
🔼
POST /v1/marketplace/transactions/id/antifraud-auth
📌 Headers
Nome	Tipo	Obrigatório	Descrição
integration-key	string	Sim	Chave de integração.
x-token	string	Sim	Token de autenticação. Pode ser encontrado em nosso portal na guia de integração.
Authorization	Auth Type Bearer Token	Sim	Inserir o Bearer Token, gerado na rota Auth
establishment_id	string	Sim	Id do estabelecimento que foi gerado a transação
📌 Path Parameters
Nome	Tipo	Obrigatório	Descrição
id	string	SIm	_ID da transação a ser validado
📌 Modelo do Body para 3Ds
O corpo da requisição deve ser enviado no formato JSON

JSON

{
  "id": antifraud_id, //antifraud_id retornado na criação da transação
  "concluded":concluded, //Retorno do SDK WEB IDPAY
  "capture_concluded":captureConcluded //Retorno do SDK WEB IDPAY
}
Detalhe do body 3Ds
Nome	Tipo	Obrigatório	Descrição
id	string	Sim	Valor de antifraud_id retornado na criação da transação
concluded	boolean	Sim	Indica se o fluxo de verificação do usuário foi finalizado com sucesso pelo IDPAY.
capture_concluded	boolean	Sim	Informa se a captura dos dados biométricos e validações internas do IDPAY foi realizada corretamente.
Modelo Curl
JSON

curl --location 'https://api.sandbox.paytime.com.br/v1/marketplace/transactions/:id/antifraud-auth' \
--header 'integration-key: <SEU_INTEGRATION_KEY>' \
--header 'x-token: <SEU_X_TOKEN' \
--header 'establishment_id: <ID_DO_ESTABELECIMENTO' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer <BEARER_TOKEN_ROTA_AUTH' \
--data '{
	"id:" <antifraud_id>,//antifraud_id retornado na criação da transação
  "concluded": <concluded>, //Retorno do SDK WEB IDPAY
  "capture_concluded":<capture_concluded> //Retorno do SDK WEB IDPAY
}


Cartão de Teste - IDPAY
Objetivo de listar cartões utilizados para simular os status do IDPAY

Cartões de teste
✅ - Validação Aprovada:

CPF: 12345678909 Cartão: 9876 5432 1234 9876

⛔ - Validação Inconclusiva:
CPF: 00000000191 Cartão: 4989 2312 3456 0123