# Configuração de Email SMTP - Team Cruz

## 📧 Serviço de Email Implementado

O sistema agora possui um serviço completo de envio de emails que é usado para:

1. **Suporte Técnico** - Usuários podem enviar pedidos de ajuda direto do login
2. **Recuperação de Senha** - Emails automáticos com link de reset

---

## ⚙️ Configuração

### 1. Escolha seu provedor SMTP

#### Opção A: Gmail (Recomendado para começar - Grátis)

**Vantagens:**

- ✅ Grátis até 500 emails/dia
- ✅ Fácil de configurar
- ✅ Confiável

**Como configurar:**

1. Acesse sua conta Google (contato@rykon.com.br)
2. Vá em **Segurança** → https://myaccount.google.com/security
3. Ative **Verificação em duas etapas** (obrigatório)
4. Vá em **Senhas de app** → https://myaccount.google.com/apppasswords
5. Crie uma senha de app:
   - App: **E-mail**
   - Dispositivo: **Servidor Team Cruz**
6. Copie a senha gerada (16 caracteres, ex: `abcd efgh ijkl mnop`)

**Variáveis no `.env`:**

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=contato@rykon.com.br
SMTP_PASS=zxhhdqsgvrplkubc  # ✅ CONFIGURADO
SUPPORT_EMAIL=contato@rykon.com.br
FRONTEND_URL=http://localhost:3000  # ou sua URL de produção
```

---

#### Opção B: SendGrid (Recomendado para produção)

**Vantagens:**

- ✅ Grátis até 100 emails/dia
- ✅ 40.000 emails/mês nos primeiros 30 dias
- ✅ Estatísticas de entrega
- ✅ Melhor reputação de entrega

**Como configurar:**

1. Cadastre-se em https://sendgrid.com
2. Vá em **Settings** → **API Keys**
3. Crie uma nova API Key com permissão de **Mail Send**
4. Copie a API key

**Variáveis no `.env`:**

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.sua_api_key_completa_aqui
SUPPORT_EMAIL=contato@rykon.com.br
FRONTEND_URL=http://localhost:3000
```

---

#### Opção C: Mailgun

**Vantagens:**

- ✅ 5.000 emails/mês grátis (primeiros 3 meses)
- ✅ 1.000 emails/mês depois
- ✅ Bom para produção

**Como configurar:**

1. Cadastre-se em https://www.mailgun.com
2. Adicione e verifique seu domínio
3. Vá em **Sending** → **Domain settings** → **SMTP credentials**
4. Copie as credenciais

**Variáveis no `.env`:**

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@seu-dominio.mailgun.org
SMTP_PASS=sua_senha_mailgun
SUPPORT_EMAIL=contato@rykon.com.br
FRONTEND_URL=http://localhost:3000
```

---

### 2. Atualizar o arquivo `.env`

Edite o arquivo `backend/.env` e adicione/atualize as variáveis SMTP:

```env
# Email / SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=contato@rykon.com.br
SMTP_PASS=sua_senha_de_app_aqui
SUPPORT_EMAIL=contato@rykon.com.br
FRONTEND_URL=http://localhost:3000
```

---

### 3. Reiniciar o backend

```bash
cd backend
npm run start:dev
```

---

## 🧪 Testar o Serviço

### Teste 1: Suporte Técnico

1. Acesse http://localhost:3000/login
2. Clique em "Suporte Técnico"
3. Preencha email e descrição do problema
4. Clique em "Enviar Email"
5. Verifique se o email chegou em `SUPPORT_EMAIL`

### Teste 2: Recuperação de Senha

1. Acesse http://localhost:3000/login
2. Clique em "Esqueceu sua senha?"
3. Digite um email cadastrado
4. Clique em "Enviar Email de Recuperação"
5. Verifique se o email chegou com o link de reset

---

## 📊 Endpoints Criados

### POST `/support/contact`

Envia email de suporte técnico.

**Body:**

```json
{
  "email": "usuario@exemplo.com",
  "message": "Descrição do problema"
}
```

**Response 200:**

```json
{
  "success": true,
  "message": "Email enviado com sucesso! Nossa equipe entrará em contato em breve."
}
```

### POST `/auth/forgot-password`

Envia email de recuperação de senha (já existia, agora integrado com email service).

**Body:**

```json
{
  "email": "usuario@exemplo.com"
}
```

---

## 🚨 Troubleshooting

### Erro: "Invalid login: 535-5.7.8 Username and Password not accepted"

- Verifique se ativou a verificação em 2 etapas no Google
- Certifique-se de usar a senha de app (não a senha normal)
- Remova espaços da senha de app

### Erro: "Connection timeout"

- Verifique se a porta 587 está aberta no firewall
- Tente usar porta 465 com `secure: true` no código

### Emails não chegam

- Verifique a caixa de spam
- Verifique se o email `SMTP_USER` está verificado no provedor
- Use Gmail primeiro para testar (mais simples)

### Limite de emails atingido

- Gmail: máximo 500/dia
- SendGrid free: 100/dia
- Considere upgrade do plano

---

## 📁 Arquivos Criados/Modificados

### Backend

- `src/email/email.service.ts` - Serviço de envio de emails
- `src/email/email.module.ts` - Módulo de email
- `src/support/support.controller.ts` - Controller de suporte
- `src/support/support.module.ts` - Módulo de suporte
- `src/support/dto/send-support-email.dto.ts` - DTO de validação
- `src/auth/auth.service.ts` - Integrado com EmailService
- `src/auth/auth.module.ts` - Importa EmailModule
- `src/app.module.ts` - Importa SupportModule
- `.env` - Variáveis SMTP adicionadas
- `.env.example` - Template com instruções

### Frontend

- `app/login/page.tsx` - Modal de suporte chama API `/support/contact`

---

## 🔐 Segurança

- ✅ Senhas de app (não usa senha principal)
- ✅ Validação de inputs (max 2000 caracteres)
- ✅ Rate limiting recomendado (adicionar depois)
- ✅ Logs de envio para auditoria
- ✅ Não expõe erros detalhados para o usuário

---

## 📝 Próximos Passos

1. **Configure o SMTP** escolhendo um provedor
2. **Teste localmente** os 2 fluxos (suporte e recuperação)
3. **Adicione rate limiting** para evitar spam (opcional)
4. **Configure domínio próprio** no SendGrid/Mailgun para produção
5. **Monitore estatísticas** de entrega

---

**Data**: 2025-10-21
**Desenvolvedor**: GitHub Copilot
**Status**: ✅ Implementado - Aguardando Configuração SMTP
