# 📘 Módulo Financeiro – Documento Técnico Completo

## 🎯 Objetivo Geral

Implementar um módulo financeiro completo para o sistema de controle de presença e gerenciamento da academia de Jiu-Jitsu, integrado aos alunos, unidades e com suporte a planos recorrentes (mensal, semestral e anual).
O módulo deve contemplar frontend, backend, banco de dados, integrações e migrations, respeitando a estrutura já existente no projeto.

---

# 📁 Estrutura Geral do Módulo Financeiro

## 1. Menu Financeiro

O menu lateral terá as seguintes rotas:

- Dashboard (Resumo Financeiro)
- Extrato
- Vendas Online
- A Receber
- A Pagar
- Assinaturas / Mensalidades (Recorrências)
- Transações
- Configurações de Cobrança

---

# 2. Dashboard Financeiro (Tela Principal)

### Objetivo:

Exibir de forma clara os principais indicadores financeiros da unidade.

### Elementos:

#### KPIs:

- Receita do Mês
- Despesas do Mês
- Saldo Atual
- Recebimentos Pendentes
- Pagamentos Pendentes

#### Gráficos:

- Evolução de receita mensal (linha ou barra)
- Inadimplência por aluno ou plano (pizza)
- Comparação entre unidades (opcional)

#### Ações rápidas:

- Criar Fatura
- Registrar Pagamento
- Gerar Relatório
- Enviar Cobrança

---

# 3. Extrato Financeiro

### Filtros:

- Período (dia, mês, intervalo)
- Tipo (Entrada / Saída)
- Categoria
- Unidade

### Tabela:

- Data
- Descrição
- Aluno (quando aplicável)
- Tipo
- Categoria
- Valor
- Status (confirmado, pendente, estornado)

---

# 4. Vendas Online

Integração com o futuro gateway de pagamentos.

### Colunas:

- ID da venda
- Aluno
- Método de pagamento (Pix, Cartão, Boleto)
- Valor
- Status (Pago, Aguardando, Falhou)
- Data

### Ações:

- Ver Detalhes
- Reenviar Link de Pagamento

---

# 5. A Receber (Contas a Receber)

### Dados exibidos:

- Fatura #
- Aluno
- Plano (mensal, semestral, anual)
- Valor
- Vencimento
- Situação (a vencer, vencido, negociado)
- Método (Pix, Cartão, Boleto)

### Ações:

- Enviar cobrança
- Baixar manualmente (marcar como pago)
- Parcelar
- Cancelar

### Filtros:

- Unidade
- Período
- Status
- Tipo de plano

---

# 6. A Pagar (Contas a Pagar)

### Colunas:

- Despesa
- Categoria
- Valor
- Vencimento
- Recorrência (única / mensal / anual)
- Anexos (comprovantes)
- Status (a pagar / pago / atrasado)

### Ações:

- Marcar como pago
- Editar
- Adicionar comprovante
- Criar lembrete automático

---

# 7. Assinaturas / Mensalidades (Recorrências)

### Funcionalidades:

- Controle de planos dos alunos:
  - Plano Mensal
  - Plano Semestral (6 meses)
  - Plano Anual (12 meses)
- Registro da próxima cobrança
- Status da assinatura:
  - Ativa
  - Pausada
  - Inadimplente
- Troca de plano
- Alteração do método de pagamento
- Histórico de cobranças

### Dados por assinatura:

- Aluno
- Unidade
- Tipo de plano
- Valor
- Próxima cobrança
- Status da cobrança
- Método (Pix recorrente, cartão tokenizado)

---

# 8. Transações Financeiras

Listagem geral de todas as transações geradas pelo sistema.

### Exibir:

- ID
- Tipo (entrada / saída)
- Origem (fatura, venda, despesa)
- Categoria
- Aluno (quando existir)
- Método de pagamento
- Valor
- Data
- Status

---

# 9. Configurações de Cobrança

### Métodos de pagamento:

- Pix (geração automática)
- Cartão (tokenizado)
- Boleto

### Integrações:

- Gateway da academia
- Integração Gympass / Corporate

### Regras de cobrança:

- Multa por atraso (%)
- Juros diário
- Dias de bloqueio por inadimplência
- Vencimento padrão (por unidade)

### Configurações de Planos:

- Mensal
- Semestral
- Anual
  Cada plano deve conter:
- Nome
- Descrição
- Valor
- Benefícios
- Número de aulas (opcional)
- Recorrência automática (sim/não)

---

# 🏗️ Migrations Necessárias

## TABELA: `planos`

```sql
id (uuid)
nome (varchar)
tipo (enum: mensal, semestral, anual)
valor (numeric)
descricao (text)
duracao_meses (int)
ativo (boolean)
created_at
updated_at

TABELA: assinaturas
id
aluno_id (fk)
plano_id (fk)
unidade_id (fk)
status (ativo, pausado, cancelado, inadimplente)
metodo_pagamento (pix, cartao, boleto)
data_inicio
data_fim
proxima_cobranca
created_at
updated_at

TABELA: faturas
id
assinatura_id (fk)
aluno_id (fk)
valor
vencimento
status (pendente, pago, vencido, cancelado)
metodo_pagamento
gateway_payment_id
created_at
updated_at

TABELA: transacoes
id
tipo (entrada, saída)
origem (fatura, venda, despesa)
descricao
aluno_id (fk) nullable
valor
data
status
categoria
created_at
updated_at

TABELA: despesas
id
unidade_id (fk)
categoria
descricao
valor
vencimento
recorrencia (unica, mensal, anual)
status (a pagar, pago, atrasado)
anexo (url)
created_at
updated_at

🔌 Integração com Gateway de Pagamentos
O módulo deve permitir:

Criar cobrança via API externa

Confirmar pagamentos (webhook)

Cancelar cobrança

Gerar Pix com QR Code

Tokenizar cartão para recorrência anual/semestral/mensal

Endpoints futuros esperados:

POST /payment/create

POST /payment/refund

POST /payment/webhook

GET /payment/status/:id

🧩 Regras de Negócio Importantes

Aluno com 2 faturas vencidas → marcar assinatura como inadimplente.

Unidade pode ter integração Gympass → transações devem entrar como entrada externa.

Quando plano é alterado:

cancelar próxima cobrança

recalcular data final do novo plano

Pagamento manual pode ser registrado por administrador.

Bloqueio automático de check-in para inadimplentes (se configurado).

🎨 Frontend – Telas que devem ser criadas

Dashboard Financeiro

Extrato

Lista de Vendas Online

Lista de A Receber

Lista de A Pagar

Tela de Assinatura do Aluno

Tela de Configuração de Planos

Tela de Configurações do Gateway

Tela de Transações

Proposta de Tela – Dashboard Financeiro da Academia
🎯 Objetivo

Dar ao gestor uma visão clara do financeiro da unidade: entradas, saídas, inadimplência, próximos recebimentos e pagamento de contas.

🖥️ 1. Tela Principal – Dashboard Financeiro

Quando clicar em Financeiro, ao invés de já abrir “Extrato”, você pode abrir um Resumo Financeiro com:

Top Cards (KPIs)

Receita do Mês

Despesas do Mês

Saldo Atual

Recebimentos Pendentes

Pagamentos Pendentes

Gráficos

Linha ou Barra → Evolução da receita mensal

Pizza → % de inadimplência por aluno ou por plano

Barra → Comparação de unidades (se houver)

Atalhos Rápidos

Criar Fatura

Registrar Pagamento

Gerar Relatório

Enviar Cobrança para aluno

🧾 2. Menu que você enviou (ajustado)

Ele está bom, mas pode ficar mais completo assim:

Financeiro

Dashboard (Resumo) ← recomendado como principal

Extrato

Vendas Online

A Receber

A Pagar

Assinaturas / Mensalidades

Transações

Configurações de Cobrança

Métodos de pagamento

Integração Gateway

Configurar planos de cobrança

Configurar juros / multa

🧾 3. Tela: Extrato

Filtros essenciais:

Período (dia, semana, mês, customizado)

Tipo (Entrada / Saída)

Categoria (Mensalidade, Produto, Aula Avulsa, Competição, etc.)

Unidade

Tabela:

Data

Descrição

Aluno (se aplicável)

Tipo (receita/despesa)

Categoria

Valor

Status (confirmado, pendente, estornado)

💳 4. Tela: Vendas Online

Para exibir pagamentos vindos do futuro gateway:

Colunas:

ID da venda

Aluno

Método (Pix, Cartão, Boleto)

Valor

Status (Pago, Aguardando, Falhou)

Data
Botões:

Ver detalhes

Reenviar link de pagamento

📥 5. Tela: A Receber

Lista de faturas geradas ainda não pagas:

Fatura #

Aluno

Plano

Valor

Vencimento

Situação (A vencer / Vencido / Negociado)

Ações:

Enviar cobrança por WhatsApp

Baixar manualmente

Parcelar

Cancelar

Filtros:

Unidade

Período

Status

Plano

📤 6. Tela: A Pagar

Para contas da academia:

Conta (água, luz, aluguel, funcionários, fornecedores)

Categoria

Valor

Vencimento

Repetição (mensal, único)

Anexos (nota fiscal)

Status (A pagar / Pago / Atrasado)

Ações:

Marcar como pago

Editar

Anexar nota

Criar lembrete

🔁 7. Tela: Assinaturas (Mensalidades Recorrentes)

Lista de mensalidades com cobrança automática:

Aluno

Plano

Valor

Próxima cobrança

Status (ativa, pausada, inadimplente)

Método de pagamento salvo

Ações:

Pausar

Reativar

Alterar método

Alterar plano

⚙️ 8. Tela: Configurações de Cobrança

Aqui a unidade controla:

Métodos de pagamento aceitos

Pix (geração automática)

Cartão (tokenizado)

Boleto

Integrações

Gateway da academia

Gympass / Corporate

Regras de repasse

Regras financeiras

Multa por atraso (%)

Juros diário

Dias para bloquear aluno inadimplente
```
