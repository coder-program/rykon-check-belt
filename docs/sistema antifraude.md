# ✅ Sistema de Antifraude - Status de Implementação

## 📊 Resumo Executivo

**🎉 TUDO JÁ ESTÁ IMPLEMENTADO NO BACKEND!**

| Tecnologia | Status | Implementação | Endpoints | O que Falta |
|------------|--------|---------------|-----------|-------------|
| **ClearSale** | ✅ Pronto | 100% | 3 | Nada |
| **IDPAY (Unico)** | ✅ Pronto | 100% | 2 | Informar domínio frontend |
| **3DS (PagBank)** | ✅ Pronto | 100% | 3 | Nada |

---

## 🔐 1. IDPAY (Autenticação Biométrica Unico)

### ✅ Status: TOTALMENTE IMPLEMENTADO

**Arquivos:** `rykonpay-backend/src/antifraud/idpay/`

#### Endpoints Disponíveis e Funcionais:

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/antifraud/idpay/sdk-config` | Retorna código completo do SDK ✅ |
| `POST /api/antifraud/idpay/:id/authenticate` | Autentica transação biométrica ✅ |

#### O que já funciona:
- ✅ Configuração automática do SDK
- ✅ Código React completo (exemplo)
- ✅ Suporte UAT e Produção
- ✅ Documentação Swagger
- ✅ Fluxo IFRAME (fullscreen)
- ✅ Callback handling

#### ⚠️ O QUE VOCÊ PRECISA FAZER:

**1. Informar Domínio à Paytime**
```
[✅] IDPAY
    Domínio: https://SEU_FRONTEND_AQUI.com.br
```

**2. Integrar no Frontend**
```bash
# Fazer uma chamada GET
GET http://localhost:3001/api/antifraud/idpay/sdk-config

# A resposta já vem com TODO o código pronto!
```

---

## 🛡️ 2. 3DS (Three Domain Secure PagBank)

### ✅ Status: TOTALMENTE IMPLEMENTADO

**Arquivos:** `rykonpay-backend/src/antifraud/threeds/`

#### Endpoints Disponíveis e Funcionais:

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/antifraud/threeds/sdk-config` | Retorna código completo do SDK ✅ |
| `GET /api/antifraud/threeds/test-cards` | Lista cartões de teste ✅ |
| `POST /api/antifraud/threeds/:id/authenticate` | Autentica via 3DS ✅ |

#### O que já funciona:
- ✅ Script tag PagBank
- ✅ Setup automático
- ✅ Código completo de autenticação
- ✅ Cartões de teste documentados
- ✅ Suporte SANDBOX e PROD
- ✅ Documentação Swagger

#### ⚠️ O QUE VOCÊ PRECISA FAZER:

**1. Confirmar Uso à Paytime**
```
[✅] 3DS
    Sim, utilizamos 3DS
```

**2. Integrar no Frontend**
```bash
# Fazer uma chamada GET
GET http://localhost:3001/api/antifraud/threeds/sdk-config

# A resposta já vem com TODO o código pronto!
```

---

## 🔍 3. ClearSale (Session ID)

### ✅ Status: TOTALMENTE IMPLEMENTADO

**Arquivos:** `rykonpay-backend/src/antifraud/antifraud.service.ts`

#### Endpoints Disponíveis:

| Endpoint | Descrição |
|----------|-----------|
| `POST /api/antifraud/session` | Gera Session ID único ✅ |
| `GET /api/antifraud/script-config` | Retorna SDK Browser ✅ |
| `GET /api/antifraud/test-behavior` | Testa comportamento sandbox ✅ |

---

## 📋 Como Testar AGORA (Para Homologação)

### 1. Rodar o Backend
```bash
cd rykonpay-backend
npm run start:dev
```

### 2. Acessar Swagger
```
http://localhost:3001/api/docs
```

### 3. Testar Endpoints de Antifraude

**IDPAY:**
```bash
# Ver configuração completa
GET http://localhost:3001/api/antifraud/idpay/sdk-config
```

**3DS:**
```bash
# Ver configuração completa
GET http://localhost:3001/api/antifraud/threeds/sdk-config

# Ver cartões de teste
GET http://localhost:3001/api/antifraud/threeds/test-cards
```

**ClearSale:**
```bash
# Gerar Session ID
POST http://localhost:3001/api/antifraud/session

# Ver script config
GET http://localhost:3001/api/antifraud/script-config
```

---

## 📸 Evidências para Homologação

### Código (já pronto no arquivo evidencias paytime.md):

**IDPAY:**
- Print 17: Configuração SDK (`idpay.service.ts` linhas 24-85)
- Print 18: Endpoint autenticação (`idpay.controller.ts`)

**3DS:**
- Print 19: Configuração SDK (`threeds.service.ts` linhas 24-145)
- Print 20: Endpoint autenticação (`threeds.controller.ts`)

### IDs de Teste (você precisa coletar):

```
[ ] ID de transação com IDPAY APROVADO: _______________
[ ] ID de transação com IDPAY INCONCLUSIVO: _______________
[ ] Print da tela do SDK IDPAY (captura biométrica)
```

---

## 🎯 RESPOSTA DIRETA À SUA PERGUNTA

### ❌ NÃO PRECISA IMPLEMENTAR NADA NO BACKEND!

**IDPAY:** ✅ Já existe completo  
**3DS:** ✅ Já existe completo

### ✅ O QUE VOCÊ PRECISA FAZER:

1. **Informar domínio do frontend** (para IDPAY na homologação)
   - Exemplo: `https://checkout.rykon.com.br`

2. **Integrar os SDKs no frontend** (consumir endpoints prontos)

3. **Testar e tirar prints** (para homologação)

---

## 📧 O que enviar à Paytime

```
Uso de antifraude

[✅] IDPAY
    Domínio: https://___SEU_DOMINIO_FRONTEND___
    
[✅] 3DS
    Confirmado
```

---

## 💡 Dica Importante

**Se você não tem frontend ainda**, pode criar transações via Swagger/Postman diretamente e coletar os IDs para homologação. O importante é que o **backend está 100% pronto**!

---

---

# 📄 ARQUIVO ORIGINAL (Conciliação Transacional)

Conciliação transacional
Aqui você vai encontrar orientação prática de como implementar a conciliação transacional utilizando as rotas disponibilizadas pela Paytime, descrevendo o fluxo recomendado para acompanhar liquidações, interpretar os dados retornados pela API e validar os valores pagos de forma consistente.

🔄 Processo de Liquidação e Conciliação de Transações
O processo de liquidação na Paytime é realizado por parcela, e não de forma consolidada por transação. Por esse motivo, a conciliação financeira deve ser implementada pelo integrador.

📌 Campo expected_on No detalhe da transação, o campo expected_on contém um array com as informações previstas de liquidação, incluindo:

amount:valor que será liquidado

date: data prevista para a liquidação da parcela

Esse array representa quando e quanto será liquidado ao longo do tempo, especialmente em transações parceladas ou não antecipadas.

⚠️
Importante

Não existe, na liquidação, um vínculo direto informando quais transações compõem aquele pagamento.

🧮 Regra de Conciliação

A lógica de conciliação deve ser baseada no campo expected_on, considerando:

A liquidação ocorre por parcela
Transações não antecipadas são liquidadas mensalmente
O valor liquidado em um determinado dia deve corresponder à soma dos valores das parcelas (expected_on.amount) com data igual à data da liquidação
🔔 Atualizações via Webhook

Para acompanhar a evolução da liquidação:

Sempre que uma parcela for liquidada, o status correspondente dentro do array expected_on será atualizado
Nesse momento, será disparado o webhook: updated-sub-transaction
Recomenda-se:
Armazenar as transações do banco de dados do integrador
Atualizá-las sempre que um webhook for recebido
Associar o ID da transação Paytime ao seu identificador interno
Utilizar essas informações para cálculo e conciliação financeira
Esse modelo é o mesmo utilizado pela Paytime na integração com adquirentes.

📊 Consulta de Liquidação

Através da rota:


GET /v1/marketplace/liquidations/extract
é possível obter:

Valor total pago na liquidação
Conta bancária de destino do pagamento
⚠️ Essa rota não informa as transações individualmente.

✅ Conferência do Valor Liquidado

Para validar o valor de uma liquidação:

Identifique a data da liquidação
Some todos os valores do array expected_on.amount cuja data (expected_on.paid_at) corresponda à data da liquidação
Compare o total com o valor retornado no extrato de liquidação
Se os valores forem equivalentes, a liquidação está conciliada corretamente.

Fallback no fluxo transacional
Garantir que o status da transação seja corretamente atualizado, mesmo em cenários onde o webhook updated-sub-transaction não seja entregue ou processado corretamente.

Fallback no fluxo transacional
Webhook: updated-sub-transaction
Objetivo
Este fallback atua como um mecanismo de segurança, assegurando consistência do status transacional.

Premissas
A transação é criada inicialmente com status PENDING.
O webhook updated-sub-transaction é responsável por notificar mudanças de status.
O webhook pode falhar por motivos externos (timeout, bloqueio de infraestrutura, indisponibilidade temporária).
A API da Paytime é considerada fonte de verdade para o status final da transação.
Estratégia Recomendada
Persistência Inicial

No momento da criação da transação, armazene localmente:
_id (ID da Transação;
status inicial (PENDING)
created_at
Fluxo Normal (Via Webhook)

Quando o webhook updated-sub-transaction for recebido:
Localizar a transação pelo _id.
Verificar o status recebido.
Atualizar o status local, quando aplicável.
Registrar data e origem da atualização (webhook).

Condição de Ativação do Fallback

O fallback deve ser executado quando:
A transação permanece com status PENDING após um tempo pré-definido (ex.:1,2,3,6,10 ou 15 minutos) após a criação, e
Nenhum webhook de atualização foi processado com sucesso.

Execução do Fallback

Passo 1 – Consulta ativa da transação
JSON

GET /v1/marketplace/transactions/{_id}

Validação do Status

A partir da resposta da API:
Se o status retornado diferente do salvo localmente:
Atualizar o status local da transação para PAID
Registrar que a atualização ocorreu via fallback
Se o status permanecer PENDING:
Manter o status local
Reagendar nova verificação, respeitando política de retry

Atualização do Status Local (Exemplo Lógico)

Exemplo de atualização de Status de Pending para PAID


Status local: PENDING
Status retornado pela API: PAID

→ Atualizar status local para PAID
→ Registrar origem da atualização: FALLBACK
→ Registrar data/hora da atualização
Fluxo Resumido
Exemplo de atualização de Status de Pending para PAID


Criação da transação (PENDING)
        ↓
Webhook updated-sub-transaction
        ↓
Status atualizado para PAID
        ↓
[Fallback]
Se webhook não recebido em X minutos
        ↓
GET /transactions/{id}
        ↓
Status = PAID
        ↓
Atualização local do status

Boas Práticas
Utilize backoff exponencial para novas tentativas de fallback.
Evite consultas excessivas à API.
Centralize logs de:
Webhooks recebidos
Fallbacks executados
Nunca altere o status sem validação direta na API da Paytime.
Este fallback garante que o status da transação reflita corretamente a realidade do pagamento, reduzindo impactos operacionais e financeiros causados por falhas de comunicação assíncrona.

⚠️
Esse fluxo deve ser tratado como parte essencial da integração, e não como exceção.

Uso do IDPAY e Plugins Wordpress
Arquitetura de domínio e execução do SDK IDPay no plugin WooCommerce

Conceito
A implementação do SDK da IDPay no plugin WooCommerce exige a utilização de um domínio único, controlado exclusivamente pelo plugin. Esse ponto é obrigatório do ponto de vista técnico e não depende do domínio da loja do cliente final.

Regra
O SDK da IDPay será sempre executado no mesmo domínio, por exemplo: https://dominioDoPlugin.com
As lojas WooCommerce (Loja A, Loja B, Loja C, etc.) não executam o SDK diretamente em seus próprios domínios.
O plugin é responsável por centralizar o checkout transparente e identificar corretamente qual loja está originando a transação.
Fluxo de navegação do cliente
Loja A
O cliente navega normalmente no site da Loja A.
Ao clicar em “Comprar” ou “Finalizar compra”, o plugin redireciona o cliente para: https://dominioDoPlugin.com/checkout
Nesse ambiente, o SDK da IDPay é inicializado e executado.
Durante a chamada à API PAYTIME, o plugin informa o establishment_idcorrespondente à Loja A.
Loja B
O cliente navega no site da Loja B.
Ao iniciar o pagamento, o fluxo é igualmente redirecionado para:https://dominioDoPlugin.com/checkout
O SDK da IDPay é executado exatamente no mesmo domínio.
Na comunicação com nossa API, o plugin envia o establishment_id correspondente à Loja B.

Ponto-chave da arquitetura
O domínio do checkout é sempre o mesmo, independentemente da loja.
A diferenciação entre lojas não ocorre por domínio, mas sim por identificação lógica, através do:
establishment_id
Metadados internos do plugin
O plugin é o responsável por mapear:


Loja WooCommerce → `establishment_id`
Chamada à API (conceito)
Sempre que o plugin realizar chamadas à nossa API (criação de transação, antifraude, etc.), ele deve informar explicitamente establishment_id

Isso garante que:

A transação seja corretamente associada à loja de origem
O SDK possa operar de forma centralizada e segura
Não haja dependência do domínio da loja WooCommerce
Conclusão técnica
✔ O SDK da IDPay não deve ser executado em múltiplos domínios

✔ O plugin deve operar com checkout centralizado

✔ A segregação entre lojas ocorre via establishment_id

Uso de Antifraude e envio de dados
Entendimento sobre o uso de Antifraude e envio de dados
A utilização de antifraude impacta diretamente quais informações precisam ser enviadas na criação de uma transação. Isso acontece porque a análise de risco depende da qualidade e da quantidade de dados disponíveis.

Quando o antifraude da Paytime é utilizado
Ao optar pelos antifraude da Paytime, a plataforma é responsável por realizar a análise de risco da transação. Para que essa análise seja possível, alguns dados do cliente são obrigatórios, pois são utilizados para validação de identidade e comportamento.

Nesse cenário:

O objeto client passa a ser obrigatório

O endereço do cliente (client.address) é opcional, podendo ser solicitado conforme o tipo de antifraude aplicado

Essas informações são essenciais para que o antifraude funcione corretamente e possa tomar decisões seguras sobre a transação.

Quando o antifraude da Paytime não é utilizado
Caso você não utilize o antifraude da Paytime, entende-se que a análise de risco será feita por conta própria, utilizando ferramentas ou processos internos.

Por esse motivo:

O objeto client torna-se opcional

A Paytime exige menos dados, pois não realizará a validação antifraude

Na prática, a responsabilidade pela análise e prevenção de fraude passa a ser totalmente do seu sistema.

Resumo das regras
Com antifraude Paytime (3DS e IDPAY)
client: obrigatório
client.address: opcional
Sem antifraude
client: opcional
Sobre IDPay
As informações solicitadas pelo **SDK do IDPay **seguem regras definidas pelo próprio fornecedor do serviço. Por esse motivo, não é possível alterar, remover ou flexibilizar os dados exigidos pelo SDK, mesmo que alguns campos pareçam redundantes.

Esses dados fazem parte do processo de validação de identidade e são indispensáveis para o funcionamento correto do antifraude.

