# Configuração do Domínio rykonfit.com.br

## 📋 Informações do Domínio

- **Domínio**: rykonfit.com.br
- **Registrado em**: 09/10/2025
- **Expira em**: 09/10/2026
- **Titular**: Marcos Augusto Lima Silva (CPF: 054.321.654-30)
- **Servidor**: 200.98.72.161 (UOL Host)

## 🚀 Passo a Passo da Configuração

### 1️⃣ Configurar DNS (Painel UOL Host)

Acesse o painel de gerenciamento de DNS da UOL Host e configure:

```
Tipo: A
Nome: @
Valor: 200.98.72.161
TTL: 3600 (1 hora)

Tipo: A
Nome: www
Valor: 200.98.72.161
TTL: 3600 (1 hora)
```

**Instruções detalhadas:**

1. Acesse https://www.uol.com.br/host/
2. Faça login com suas credenciais
3. Vá em "Meus Domínios" → rykonfit.com.br
4. Clique em "Gerenciar DNS" ou "Editar zona DNS"
5. Adicione os registros A acima
6. Salve as alterações

### 2️⃣ Executar Script de Configuração no Servidor

No seu computador local, execute:

```powershell
# Copiar script para o servidor
scp setup-domain.sh root@200.98.72.161:/root/

# Conectar ao servidor
ssh root@200.98.72.161

# Executar script
chmod +x /root/setup-domain.sh
/root/setup-domain.sh
```

Ou executar remotamente em um único comando:

```powershell
ssh root@200.98.72.161 'bash -s' < setup-domain.sh
```

### 3️⃣ Verificar Propagação do DNS

Aguarde alguns minutos e teste se o DNS está propagado:

```bash
# No Windows PowerShell
nslookup rykonfit.com.br
nslookup www.rykonfit.com.br

# Ou usando dig (se disponível)
dig rykonfit.com.br +short
dig www.rykonfit.com.br +short
```

O resultado deve mostrar: **200.98.72.161**

### 4️⃣ Instalar Certificado SSL (Após DNS Propagado)

Conecte ao servidor e execute:

```bash
ssh root@200.98.72.161

# Obter certificado SSL
certbot --nginx -d rykonfit.com.br -d www.rykonfit.com.br

# Responda as perguntas:
# - Email: seu-email@exemplo.com
# - Aceitar termos: Yes
# - Redirecionar HTTP para HTTPS: 2 (Yes)
```

O Certbot irá:

- ✅ Obter o certificado SSL
- ✅ Configurar automaticamente o Nginx
- ✅ Ativar redirecionamento HTTPS
- ✅ Configurar renovação automática

### 5️⃣ Atualizar Variáveis de Ambiente

#### Backend (.env.production)

```bash
ssh root@200.98.72.161

cd /var/www/teamcruz/backend
nano .env.production
```

Adicione/Atualize:

```env
# URLs
FRONTEND_URL=https://rykonfit.com.br
BACKEND_URL=https://rykonfit.com.br/api

# CORS
CORS_ORIGIN=https://rykonfit.com.br,https://www.rykonfit.com.br

# JWT
JWT_SECRET=seu-secret-super-seguro-aqui-change-me
JWT_EXPIRES_IN=7d
```

#### Frontend (.env.production.local)

```bash
cd /var/www/teamcruz/frontend
nano .env.production.local
```

```env
NEXT_PUBLIC_API_URL=https://rykonfit.com.br/api
NODE_ENV=production
```

### 6️⃣ Reiniciar Aplicações

```bash
# Reiniciar backend
pm2 restart teamcruz-backend

# Reiniciar frontend
pm2 restart teamcruz-frontend

# Verificar status
pm2 status
```

### 7️⃣ Verificar Funcionamento

Acesse no navegador:

- ✅ https://rykonfit.com.br
- ✅ https://www.rykonfit.com.br

Verifique:

- [ ] Site carrega corretamente
- [ ] SSL ativo (cadeado verde)
- [ ] Login funcionando
- [ ] API respondendo
- [ ] Sem erros de CORS

## 🔍 Testes e Verificações

### Testar SSL

```bash
# Verificar certificado
openssl s_client -connect rykonfit.com.br:443 -servername rykonfit.com.br

# Testar renovação SSL
certbot renew --dry-run
```

### Testar Nginx

```bash
# Verificar configuração
nginx -t

# Ver logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Testar Aplicações

```bash
# Logs do backend
pm2 logs teamcruz-backend

# Logs do frontend
pm2 logs teamcruz-frontend
```

## 🔄 Renovação Automática do SSL

O Certbot configura automaticamente a renovação via cron. Verificar:

```bash
# Ver cron do certbot
systemctl list-timers | grep certbot

# Testar renovação
certbot renew --dry-run
```

O certificado será renovado automaticamente 30 dias antes de expirar.

## 🛠️ Troubleshooting

### DNS não propaga

- Aguarde mais tempo (pode levar até 48h)
- Limpe cache DNS: `ipconfig /flushdns` (Windows) ou `sudo systemd-resolve --flush-caches` (Linux)
- Use ferramenta: https://dnschecker.org/

### Certificado SSL falha

- Verifique se DNS está propagado: `dig rykonfit.com.br +short`
- Certifique-se que portas 80 e 443 estão abertas no firewall
- Verifique logs: `tail -f /var/log/letsencrypt/letsencrypt.log`

### Erro 502 Bad Gateway

- Verifique se backend está rodando: `pm2 status`
- Verifique logs: `pm2 logs teamcruz-backend`
- Verifique se porta 3000 está escutando: `netstat -tlnp | grep 3000`

### Erro de CORS

- Verifique variável `CORS_ORIGIN` no backend
- Reinicie o backend: `pm2 restart teamcruz-backend`

## 📞 Suporte

Em caso de problemas:

1. Verifique logs do Nginx: `/var/log/nginx/error.log`
2. Verifique logs do PM2: `pm2 logs`
3. Verifique status dos serviços: `pm2 status` e `systemctl status nginx`

## ✅ Checklist Final

- [ ] DNS configurado (A records)
- [ ] DNS propagado (teste com dig/nslookup)
- [ ] Nginx instalado e configurado
- [ ] Certificado SSL obtido e instalado
- [ ] Variáveis de ambiente atualizadas
- [ ] Aplicações reiniciadas
- [ ] Site acessível via HTTPS
- [ ] Login funcionando
- [ ] API respondendo corretamente
- [ ] Sem erros de CORS
- [ ] Renovação automática SSL configurada
