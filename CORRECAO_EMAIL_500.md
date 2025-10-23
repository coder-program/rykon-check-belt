# 🚨 CORREÇÃO RÁPIDA - Erro 500 no Envio de Email

## ❌ Erro Atual

```
Invalid login: 535-5.7.8 Username and Password not accepted
```

**Causa:** Senha do Gmail não está configurada ou é inválida.

---

## ✅ Solução 1: Usar Gmail (5 minutos)

### Passo 1: Gerar Senha de App do Gmail

**IMPORTANTE:** Você PRECISA usar senha de app (não é a senha normal do Gmail)

1. Acesse: https://myaccount.google.com/security
2. Procure **"Verificação em duas etapas"** → ATIVE (obrigatório)
3. Acesse: https://myaccount.google.com/apppasswords
4. Se não aparecer "Senhas de app", verifique se:
   - Verificação em 2 etapas está ATIVADA
   - Você está usando uma conta Google Workspace (não conta pessoal)
5. Clique em "Selecionar app" → **E-mail**
6. Clique em "Selecionar dispositivo" → **Outro (nome personalizado)**
7. Digite: "Team Cruz Backend"
8. Clique em **GERAR**
9. Copie a senha de 16 caracteres (ex: `abcd efgh ijkl mnop`)

### Passo 2: Atualizar o .env

Abra `backend/.env` e substitua:

```env
SMTP_PASS=SENHA_DE_APP_AQUI_TEMPORARIO
```

Por:

```env
SMTP_PASS=abcdefghijklmnop  # Cole a senha SEM ESPAÇOS
```

### Passo 3: Reiniciar Backend

```powershell
cd backend
npm run start:dev
```

### Passo 4: Testar

- Acesse http://localhost:3000/login
- Clique "Suporte Técnico"
- Envie um teste
- ✅ Email deve chegar em contato@rykon.com.br

---

## ✅ Solução 2: SMTP de Teste (Ethereal Email) - SEM CONFIGURAÇÃO

Se você quer testar AGORA sem configurar Gmail, use Ethereal (servidor SMTP de teste):

### Gerar credenciais automáticas

Execute no terminal do backend:

\`\`\`bash
cd backend
node -e "const nodemailer = require('nodemailer'); nodemailer.createTestAccount((err, account) => { console.log('SMTP_HOST=smtp.ethereal.email'); console.log('SMTP_PORT=587'); console.log('SMTP_USER=' + account.user); console.log('SMTP_PASS=' + account.pass); console.log('Link para ver emails: https://ethereal.email/messages'); });"
\`\`\`

**Copie a saída** e cole no `.env`:

```env
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=generated_user@ethereal.email
SMTP_PASS=generated_password
SUPPORT_EMAIL=contato@rykon.com.br
FRONTEND_URL=http://localhost:3000
```

**Vantagem:** Não precisa configurar nada, funciona na hora!
**Desvantagem:** Emails não chegam de verdade (aparecem em https://ethereal.email/messages)

---

## ✅ Solução 3: SendGrid (Produção - Melhor)

### Mais confiável que Gmail para produção

1. Cadastre-se: https://sendgrid.com (grátis 100 emails/dia)
2. Vá em **Settings** → **API Keys**
3. Create API Key → **Mail Send** (full access)
4. Copie a chave (começa com `SG.`)

**Atualize o `.env`:**

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.sua_api_key_completa_aqui
SUPPORT_EMAIL=contato@rykon.com.br
FRONTEND_URL=http://localhost:3000
```

---

## 🔍 Verificar se funcionou

No log do backend, você deve ver:

```
[EmailService] Conexão SMTP verificada com sucesso
[EmailService] Email de suporte enviado para contato@rykon.com.br
```

Se ver isso: ✅ **FUNCIONOU!**

---

## 📞 Qual você prefere?

1. **Gmail** - Mais simples, mas precisa configurar senha de app
2. **Ethereal** - Teste rápido, não envia emails reais
3. **SendGrid** - Melhor para produção

**Recomendação:** Use Ethereal agora para testar, depois configure Gmail/SendGrid.

---

## 🆘 Ainda com erro?

### Erro: "Invalid login"

- ✅ Certifique-se de usar senha de APP (não senha normal)
- ✅ Remova espaços da senha
- ✅ Verifique se a conta tem verificação em 2 etapas ATIVADA

### Erro: "Connection timeout"

- ✅ Verifique firewall/antivírus bloqueando porta 587
- ✅ Tente porta 465 (SSL):
  ```env
  SMTP_PORT=465
  ```
  E no código altere `secure: true` em `email.service.ts`

### Emails não chegam

- ✅ Verifique spam
- ✅ Use Ethereal para testar o envio primeiro
- ✅ Verifique logs do backend

---

**Próximo passo:** Escolha uma solução e me avise quando configurar para eu te ajudar a testar! 🚀
