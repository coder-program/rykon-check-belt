1️⃣ FLUXO COMPLETO DA RECORRÊNCIA (Rykon Fit)
📍 Fase 1 — Criação da Assinatura (Primeiro pagamento)
🔹 Passo 1 — Aluno escolhe plano

Plano mensal

Aceita termos

Preenche dados do cartão

🔹 Passo 2 — Backend cria primeira transação

Você envia:

Cartão completo

create_token = true

Antifraude ativado

Objetivo:

Autorizar pagamento

Gerar token

🔹 Passo 3 — Se aprovado

Você salva:

token

last4

bandeira

validade

id da transação

data da próxima cobrança (ex: +30 dias)

Status da assinatura:

ACTIVE


Aluno ganha acesso.

🔹 Passo 4 — Se recusado

Não cria assinatura

Exibe erro

Permite tentar novamente

📍 Fase 2 — Cobrança Mensal Automática
🔹 Scheduler diário (ex: 02:00 da manhã)

Ele busca:

subscriptions
where next_charge_date <= hoje
and status = ACTIVE

🔹 Para cada assinatura

Você envia:

payment_type = CREDIT

amount

token

Sem dados de cartão.
Sem antifraude.

🔹 Se aprovado

Cria registro em transactions

Atualiza next_charge_date = +30 dias

Reset retry_count = 0

🔹 Se recusado

retry_count++

agenda nova tentativa (ex: +2 dias)

Se retry_count >= 3:

status = PAST_DUE


Bloqueia aluno.

📍 Fase 3 — Inadimplência

Se 3 falhas:

Status: PAST_DUE

Bloqueia acesso

Envia notificação

Permite atualizar cartão

Quando atualizar cartão:

Nova cobrança imediata

Se aprovada → volta para ACTIVE

📍 Fase 4 — Cancelamento

Se aluno cancelar:

status = CANCELED

Não agenda novas cobranças

Pode manter acesso até fim do período pago

🔥 FLUXO VISUAL SIMPLIFICADO
Aluno realiza pagto cartão de credito
    ↓
Primeira cobrança + antifraude + token
    ↓
Token salvo
    ↓
Scheduler mensal
    ↓
Cobrança com token
    ↓
Aprovado → renova
Recusado → retry
3 falhas → bloqueia

🔥 2️⃣ ARQUITETURA TÉCNICA DETALHADA

Agora vamos organizar como deve ser seu backend.

🏗️ COMPONENTES PRINCIPAIS algumas coisas já existem verificar antes de criar se ja existe.
1️⃣ API Layer

Responsável por:

Criar assinatura

Cancelar assinatura

Atualizar cartão

Consultar status

Nada de lógica pesada aqui.
Só orquestração.

2️⃣ Subscription Service

Responsável por:

Criar assinatura

Controlar status

Definir próxima cobrança

Controlar retry

Essa é a “mente” da recorrência.

3️⃣ Payment Service

Responsável por:

Criar primeira transação

Cobrar usando token

Tratar resposta da Paytime

Registrar transaction_id

Isolado do resto do sistema.

4️⃣ Scheduler

Vai ser um
Worker separado
Executa diariamente.

Nunca execute cobrança dentro da API HTTP.

5️⃣ Webhook Receiver

A Paytime provavelmente envia confirmação de liquidação.

Você deve:

Validar assinatura do webhook

Garantir idempotência

Atualizar status da transação

🗄️ ESTRUTURA DE BANCO IDEAL
🔹 payment_methods

id

aluno_id

token (criptografado)

last4

brand

exp_month

exp_year

created_at

🔹 subscriptions

id

aluno_id

plano

amount

status (ACTIVE, PAST_DUE, CANCELED)

next_charge_date

retry_count

created_at

🔹 transactions

id

subscription_id

paytime_transaction_id

amount

status

created_at

🔐 SEGURANÇA OBRIGATÓRIA

Mesmo sendo “simples”:

✔ HTTPS obrigatório
✔ Token criptografado no banco
✔ Nunca logar token
✔ Controle de acesso interno
✔ Idempotência nas cobranças
✔ Limitar tentativas por CPF


🧠 O pulo do gato

A grande diferença entre sistema amador e profissional é:

Você separa:

Lógica de assinatura

Lógica de pagamento

Lógica de agendamento

Se misturar tudo na mesma classe, vira bomba no futuro.

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
📘
Observação: restrições específicas podem ser aplicadas ao uso da tokenização em conjunto com sistemas de antifraude.

OK VAMOS DESENVOLVER OQ FALTA LEMBRANDO NADA DE MOCK DADOS REAIS INTEGRAÇ~EOS COM RYKON-PAY, BOTOES FRONT BACK E BANCO PARA DATA USE A LIB QUE JA ESTA INSTALAADA NO PACKAGE dayjs, ANTES DE CRIAR QQ COISA VEJA SE NÃO JÁ EXISTE.
E SEMPRE ATUALIZE OS DOCUMENTOS COM OQ JA DESENOVLVEMOS.