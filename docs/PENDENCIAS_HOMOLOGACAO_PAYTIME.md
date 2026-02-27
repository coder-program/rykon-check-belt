# 🔴 Pendências de Homologação — Paytime

**Data de identificação:** 21/02/2026  
**Origem:** Retorno da análise do roteiro de homologação pela equipe Paytime  
**Status:** 🔄 EM ANDAMENTO — ponto a ponto

---

## 📋 Resumo do Que Faltou

Após análise do roteiro de homologação enviado, a Paytime apontou dois grupos de pendências:

| # | Pendência | Projeto | Status |
|---|-----------|---------|--------|
| 2A | IDPAY: 1 ID de Transação com Validação **Aprovada** | **rykon-check-belt** → **rykon-pay** | 🟡 Aguardando teste no sandbox |
| 2B | IDPAY: 1 ID de Transação com Validação **Inconclusiva** | **rykon-check-belt** → **rykon-pay** | 🟡 Aguardando teste no sandbox |
| 2C | IDPAY: Print da captura de tela (biometria em execução) | **rykon-check-belt** (frontend) | ✅ UI implementada — pronto para print |


## 🟣 PONTO 2 — Antifraude IDPAY (Biometria Facial)

### O que a Paytime pediu

> *"Além do antifraude IDPAY, que precisa ser encaminhada às seguintes evidências:"*
> - *1 ID da Transação com Validação Aprovada*
> - *1 ID da Transação com Validação Inconclusiva*
> - *1 Print da captura da tela*

### O que é o IDPAY

O IDPAY é o sistema de antifraude biométrico da Unico, integrado à Paytime. Quando ativado em uma transação de cartão, o fluxo funciona assim:

```
1. Sistema envia transação de cartão para Paytime
2. Paytime retorna: { antifraud_required: "IDPAY", transaction_id: "xyz" }
3. Frontend carrega o SDK da Unico (AcessoBio)
4. SDK abre IFRAME fullscreen com câmera para biometria facial
5. Usuário completa a selfie + prova de vida
6. SDK retorna: { encrypted, jwt, uniqueness_id }
7. Sistema envia POST /api/antifraud/idpay/:transactionId/authenticate
8. Paytime valida → retorna APPROVED ou INCONCLUSIVE
```

### Onde está implementado

| Camada | Arquivo | Funções |
|--------|---------|---------|
| Backend | `backend/src/paytime/paytime.service.ts` | `getIdpaySdkConfig()`, `authenticateIdpay()` |
| Backend | `backend/src/paytime/paytime.controller.ts` | `GET /paytime/antifraud/idpay/sdk-config`, `POST /paytime/antifraud/idpay/:id/authenticate` |
| Frontend | `frontend/hooks/useAntifraud.ts` | `loadIdpaySdk()`, `loadIdpaySdkConfig()`, `authenticateIdpay()` |
| Frontend | `frontend/components/financeiro/ProcessarPagamentoModal.tsx` | Fluxo de pagamento com antifraude |

### Status atual da implementação

- ✅ Backend: endpoints implementados e prontos
- ✅ Frontend hook: `useAntifraud.ts` — SDK `idpay-b2b-sdk@2.1.2` integrado (IDPaySDK.init/open), corpo de auth correto `{id, concluded, capture_concluded}`, tratamento correto de `type==='ERROR'`
- ✅ **Modal: Trigger IDPAY implementado** — `ProcessarPagamentoModal.tsx` detecta `antifraud[0].analyse_required === 'IDPAY'`, extrai `antifraud_id` + `session`, fluxo completo
- ✅ **Página `/admin/antifraude`** — cards de status (ClearSale, 3DS, IDPAY) corrigidos e prontos para print de evidência
- 🟡 **Aguardando:** Transações reais no ambiente de homologação para coleta dos IDs

---

---

## 🧭 ROTEIRO COMPLETO DE EXECUÇÃO — EVIDÊNCIAS IDPAY

> Abaixo estão listados **todos os itens** que precisam ser feitos, em ordem. Execute um de cada vez.

### 📋 Lista de Todos os Itens

```
[ ] ITEM 1 — Verificar que o sistema está rodando (frontend + backend)
[ ] ITEM 2 — Logar com usuário ALUNO no sistema TeamCruz
[ ] ITEM 3 — Navegar para a fatura PENDENTE do aluno
[ ] ITEM 4A — Realizar pagamento com cartão APROVADO (IDPAY) → coletar _id
[ ] ITEM 4B — Tirar print do iframe biométrico aberto (evidência 2C)
[ ] ITEM 4C — Coletar o _id da transação APROVADA (evidência 2A)
[ ] ITEM 5A — Realizar pagamento com cartão INCONCLUSIVO (IDPAY)
[ ] ITEM 5B — Coletar o _id da transação INCONCLUSIVA (evidência 2B)
[ ] ITEM 6 — Registrar os IDs coletados neste documento
[ ] ITEM 7 — Salvar os prints na pasta evidencias/
```

---

### ITEM 1 — Verificar que o Sistema está Rodando

**O que fazer:** Garantir que frontend e backend estão ativos antes de iniciar os testes.

- Frontend: `http://localhost:3000` (ou URL de staging)
- Backend: deve responder na porta configurada
- Confirmar que o estabelecimento no sandbox Paytime está com IDPAY habilitado

---

### ITEM 2 — Logar com Usuário ALUNO

**Perfil necessário:** `ALUNO` (ou `RESPONSÁVEL`)  
**Tela de login:** `/login`

**Dados de login de teste (aluno com fatura pendente no sandbox):**

| Campo | Valor |
|-------|-------|
| Email | *(usar email do aluno de teste cadastrado no sandbox)* |
| Senha | *(senha do aluno de teste)* |

> ⚠️ O aluno precisa ter pelo menos **1 fatura com status PENDENTE ou ATRASADA** para o botão "Pagar Online" aparecer.

---

### ITEM 3 — Navegar para a Fatura

**Tela:** `/financeiro/minhas-faturas`  
**O que fazer:** Localizar uma fatura com status **PENDENTE** ou **ATRASADA** e clicar no botão **"Pagar Online"**.

O modal `ProcessarPagamentoModal` abrirá — selecionar a aba/opção **Cartão de Crédito**.

---

### ITEM 4A — Pagamento com Cartão APROVADO (evidências 2A + 2C)

**Objetivo:** Gerar transação com resultado IDPAY = APPROVED e tirar o print do iframe.

#### Dados a preencher no formulário de cartão:

| Campo | Valor |
|-------|-------|
| **Número do cartão** | `9876 5432 1234 9876` |
| **Nome no cartão** | `TESTE APROVADO` (qualquer nome) |
| **CPF do portador** | `123.456.789-09` |
| **Validade** | qualquer data futura (ex: `12/2030`) |
| **CVV** | qualquer 3 dígitos (ex: `123`) |
| **Parcelas** | `1x` |

#### Dados do cliente (se solicitado no modal):

| Campo | Valor |
|-------|-------|
| **Telefone** | `(11) 99999-9991` ← ⚠️ **último dígito deve ser DIFERENTE de 2** |
| **CPF** | `123.456.789-09` |
| **Email** | email do aluno logado |

#### O que acontece após confirmar:

1. API retorna `status: PENDING` + `antifraud[0].analyse_required: "IDPAY"`
2. Modal exibe o step de biometria com botão **"Iniciar Verificação Biométrica"**
3. **→ TIRAR PRINT AGORA** (evidência 2C) — mostrar o iframe do IDPAY aberto
4. Completar a biometria facial no iframe
5. Modal exibe resultado **APPROVED** ✅
6. **Anotar o `_id` da transação** (aparece na tela ou no console do navegador)

---

### ITEM 4B — Print do Iframe Biométrico (evidência 2C)

**O que printar:** A tela do sistema TeamCruz com o iframe do IDPAY (Unico) aberto em fullscreen, mostrando a câmera e a instrução de biometria facial.

**Quando tirar:** Assim que o iframe abrir — **antes** de completar a biometria.

**Arquivo:** `evidencias/pendencias-pos-analise/ponto2/idpay-captura-tela-biometria.png`

---

### ITEM 4C — Coletar _id da Transação APROVADA (evidência 2A)

Após o IDPAY retornar APPROVED, o `_id` da transação pode ser coletado de 3 formas:

1. **Na tela do modal** — se o resultado exibir o transaction ID
2. **No console do navegador (F12)** — buscar no log a resposta do endpoint `/paytime/antifraud/idpay/*/authenticate`
3. **No painel `/admin/transacoes`** — logar como `ADMIN_SISTEMA` e localizar a transação mais recente

**Preencher aqui:**

| Resultado | Transaction ID (`_id`) | Data |
|-----------|------------------------|------|
| ✅ APPROVED | `[A PREENCHER]` | 22/02/2026 |

---

### ITEM 5A — Pagamento com Cartão INCONCLUSIVO (evidência 2B)

**Objetivo:** Gerar transação com resultado IDPAY = INCONCLUSIVE.

#### Dados a preencher no formulário de cartão:

| Campo | Valor |
|-------|-------|
| **Número do cartão** | `4989 2312 3456 0123` |
| **Nome no cartão** | `TESTE INCONCLUSIVO` (qualquer nome) |
| **CPF do portador** | `000.000.001-91` |
| **Validade** | qualquer data futura (ex: `12/2030`) |
| **CVV** | qualquer 3 dígitos (ex: `456`) |
| **Parcelas** | `1x` |

#### Dados do cliente (se solicitado no modal):

| Campo | Valor |
|-------|-------|
| **Telefone** | `(11) 99999-9991` ← ⚠️ **último dígito deve ser DIFERENTE de 2** |
| **CPF** | `000.000.001-91` |
| **Email** | email do aluno logado |

#### O que acontece após confirmar:

1. API retorna `status: PENDING` + `antifraud[0].analyse_required: "IDPAY"`
2. Modal exibe o step de biometria
3. Completar (ou abandonar) a biometria — o sandbox retornará INCONCLUSIVE
4. Modal exibe resultado **INCONCLUSIVE** ⚠️
5. **Anotar o `_id` da transação**

---

### ITEM 5B — Coletar _id da Transação INCONCLUSIVA (evidência 2B)

**Preencher aqui:**

| Resultado | Transaction ID (`_id`) | Data |
|-----------|------------------------|------|
| ⚠️ INCONCLUSIVE | `[A PREENCHER]` | 22/02/2026 |

---

### ITEM 6 — IDs Coletados (Preencher após os testes)

| Evidência | Resultado | Transaction ID (`_id`) | Data | Observação |
|-----------|-----------|------------------------|------|------------|
| 2A | ✅ APPROVED | `[A PREENCHER]` | | CPF `123.456.789-09` + Cartão `9876 5432 1234 9876` |
| 2B | ⚠️ INCONCLUSIVE | `[A PREENCHER]` | | CPF `000.000.001-91` + Cartão `4989 2312 3456 0123` |

---

### ITEM 7 — Salvar os Prints

```
evidencias/
└── pendencias-pos-analise/
    └── ponto2/
        ├── idpay-transacao-aprovada.png        ← tela do resultado APPROVED com _id visível
        ├── idpay-transacao-inconclusiva.png    ← tela do resultado INCONCLUSIVE com _id visível
        └── idpay-captura-tela-biometria.png   ← iframe IDPAY aberto (câmera ativa)
```

---

### PONTO 2 — Sub-item A e B: IDs de Transação (Aprovada e Inconclusiva)

> Seguir o roteiro dos ITENS 4A→4C e 5A→5B acima.

**Cartões de teste oficiais Paytime (IDPAY):**

| Resultado | CPF | Número do Cartão |
|-----------|-----|-----------------|
| ✅ APPROVED | `123.456.789-09` | `9876 5432 1234 9876` |
| ⚠️ INCONCLUSIVE | `000.000.001-91` | `4989 2312 3456 0123` |

> ⚠️ O último dígito do **telefone** deve ser **diferente de 2** para o webhook retornar PAID/APPROVED. Use `(11) 99999-9991`.

---

### PONTO 2 — Sub-item C: Print da Captura de Tela (Biometria em Execução)

> Seguir o ITEM 4B acima.

**O que a Paytime quer ver:** screenshot do iframe IDPAY (Unico) aberto no sistema TeamCruz, com a câmera ativa, **antes** de completar a biometria.

| Print | Conteúdo | Arquivo |
|-------|----------|---------|
| Print IDPAY-1 | Iframe biométrico IDPAY aberto no TeamCruz | `idpay-captura-tela-biometria.png` |

---

---

## 🗺️ Plano de Execução (Ponto a Ponto)

```
SEMANA ATUAL
└── 🟣 PONTO 2 (implementação concluída — falta testes no sandbox)
    ├── ✅ Implementar trigger IDPAY no ProcessarPagamentoModal.tsx ← FEITO 21/02/2026
    ├── ✅ Migrar SDK: CDN/AcessoBio → idpay-b2b-sdk@2.1.2 (npm) ← FEITO 22/02/2026
    ├── ✅ Corrigir trigger field: antifraud_required → antifraud[0].analyse_required ← FEITO 22/02/2026
    ├── ✅ Corrigir corpo da auth: {encrypted,jwt} → {id, concluded, capture_concluded} ← FEITO 22/02/2026
    ├── ✅ Corrigir type===ERROR: não chamar authenticate, mostrar retry ← FEITO 22/02/2026
    ├── ✅ Corrigir /admin/antifraude: status IDPAY reativo + info SDK para print ← FEITO 22/02/2026
    ├── 🟡 Realizar transação APROVADA no sandbox → coletar transaction_id
    ├── 🟡 Realizar transação INCONCLUSIVA no sandbox → coletar transaction_id
    └── 🟡 Tirar prints: iframe biométrico + tela /admin/antifraude com IDPAY Ativo
```

---

## 📁 Onde Guardar as Evidências

Criar pasta `evidencias/pendencias-pos-analise/` na raiz deste repositório:

```
evidencias/
└── pendencias-pos-analise/

    └── ponto2/
        ├── idpay-transacao-aprovada.png
        ├── idpay-transacao-inconclusiva.png
        └── idpay-captura-tela-biometria.png
```

---

## ✅ Checklist Final

### Ponto 2 — IDPAY

- [x] Implementação do trigger IDPAY no frontend (rykon-check-belt) ← FEITO 21/02/2026
- [x] SDK migrado para `idpay-b2b-sdk@2.1.2` (npm) ← FEITO 22/02/2026
- [x] Trigger field corrigido: `antifraud[0].analyse_required` ← FEITO 22/02/2026
- [x] Corpo da auth corrigido: `{id, concluded, capture_concluded}` ← FEITO 22/02/2026
- [x] Tratamento `type==='ERROR'` corrigido (sem chamar authenticate) ← FEITO 22/02/2026
- [x] Página `/admin/antifraude` corrigida e pronta para print de evidência ← FEITO 22/02/2026
- [ ] Transação APROVADA realizada no sandbox → ID coletado
- [ ] Transação INCONCLUSIVA realizada no sandbox → ID coletado
- [ ] Print do iframe IDPAY em execução no sistema TeamCruz
- [ ] Print da página `/admin/antifraude` com IDPAY status Ativo

---

## 📌 Observações Importantes

2. **Não expor os valores reais das credenciais** nos prints. Mostrar o código usando variáveis de ambiente (ex: `process.env.PAYTIME_INTEGRATION_KEY`) ou usar placeholders como `sk_***************************` (mascarados).

3. **Para o IDPAY funcionar**, é necessário que o `establishment` no sandbox da Paytime esteja com o **antifraude IDPAY habilitado**. Verificar com a Paytime se está ativo no ambiente de testes.

4. **Transação "Inconclusiva"** pode ser provocada interrompendo o fluxo de biometria (fechar o IFRAME antes de completar, ou usar luz insuficiente). Confirmar o cartão/cenário de teste correto com a Paytime.
