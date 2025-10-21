# 🔧 Correções do Backend para Servidor UOL

## ❌ Problemas Identificados

### 1. **Configuração do Banco de Dados Incorreta**
- ❌ Backend estava configurado para conectar ao Google Cloud (`34.39.173.213`)
- ❌ SSL estava habilitado para conexão local
- ✅ **Solução:** Usar `localhost` e desabilitar SSL

### 2. **Porta do Backend Incorreta**
- ❌ Estava configurado para porta `8080`
- ✅ **Solução:** Usar porta `3000` conforme instruções UOL

### 3. **CORS Configurado para URL Errada**
- ❌ Estava apontando para `https://teamcruz-frontend-943403834207.southamerica-east1.run.app`
- ✅ **Solução:** Configurar para `http://200.98.72.161`

### 4. **SSL no TypeORM**
- ❌ SSL estava sempre habilitado no `app.module.ts`
- ✅ **Solução:** Detectar conexão local e desabilitar SSL

## ✅ Arquivos Criados/Modificados

### 1. `.env.uol` (NOVO)
Arquivo de configuração específico para o servidor UOL com as configurações corretas.

### 2. `app.module.ts` (MODIFICADO)
Ajustado para detectar conexão localhost e desabilitar SSL automaticamente.

### 3. `deploy-backend-uol.sh` (NOVO)
Script de deploy completo com todas as configurações corretas.

## 📝 Passos para Deploy no Servidor UOL

### Passo 1: Enviar os arquivos para o servidor

**No PowerShell (sua máquina local):**

```powershell
# Enviar backend
scp -r C:\Users\Lenovo\Documents\project\rykon-check-belt\backend\* root@200.98.72.161:/var/www/teamcruz/backend/

# Enviar script de deploy
scp C:\Users\Lenovo\Documents\project\rykon-check-belt\deploy-backend-uol.sh root@200.98.72.161:/root/
```

### Passo 2: Conectar ao servidor e executar deploy

**No terminal SSH:**

```bash
# Conectar ao servidor
ssh root@200.98.72.161

# Tornar script executável
chmod +x /root/deploy-backend-uol.sh

# Executar script de deploy
/root/deploy-backend-uol.sh
```

### Passo 3: Verificar se está funcionando

```bash
# Verificar status
pm2 status

# Testar API
curl http://localhost:3000/api/health

# Ver logs se houver problemas
pm2 logs teamcruz-backend
```

## 🧪 Testes de Verificação

### 1. Teste Direto do Backend
```bash
curl http://200.98.72.161:3000/api/health
```

### 2. Teste via Nginx
```bash
curl http://200.98.72.161/api/health
```

### 3. Teste no Navegador
- Abra: `http://200.98.72.161/api/docs` (Swagger)
- Deve aparecer a documentação da API

## 🔍 Troubleshooting

### Se o backend não iniciar:

1. **Verificar logs:**
```bash
pm2 logs teamcruz-backend --lines 100
cat /var/www/teamcruz/backend/logs/err.log
```

2. **Verificar conexão com banco:**
```bash
sudo -u postgres psql -c "\l"
sudo -u postgres psql -d teamcruz_db -c "\dt"
```

3. **Verificar porta 3000:**
```bash
netstat -tlnp | grep 3000
```

4. **Reiniciar com logs detalhados:**
```bash
cd /var/www/teamcruz/backend
pm2 delete teamcruz-backend
NODE_ENV=production node dist/main.js
```

### Se o frontend não conseguir conectar ao backend:

1. **Verificar CORS no backend:**
   - O arquivo `.env` deve ter: `CORS_ORIGIN=http://200.98.72.161`

2. **Verificar configuração do Nginx:**
```bash
nginx -t
cat /etc/nginx/sites-available/teamcruz
```

3. **Verificar firewall:**
```bash
ufw status
```

## 📊 Configurações Finais Corretas

### Backend (.env)
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=teamcruz_db
DB_USER=teamcruz_app
DB_PASS=TeamCruz2024@Secure!
PORT=3000
CORS_ORIGIN=http://200.98.72.161
```

### Frontend (.env.production)
```
NEXT_PUBLIC_API_URL=http://200.98.72.161/api
```

### Nginx
- Backend: `proxy_pass http://localhost:3000`
- Frontend: `proxy_pass http://localhost:3001`

## ✅ Checklist de Verificação

- [ ] Backend rodando na porta 3000
- [ ] Frontend rodando na porta 3001
- [ ] Nginx configurado corretamente
- [ ] CORS permitindo requisições do frontend
- [ ] Banco de dados conectando localmente
- [ ] SSL desabilitado para conexão local
- [ ] PM2 mantendo aplicações rodando
- [ ] Logs sendo gerados corretamente

## 🚀 Comando Rápido de Deploy

Se precisar fazer redeploy completo:

```bash
cd /var/www/teamcruz/backend && \
npm install && \
npm run build && \
pm2 restart teamcruz-backend && \
pm2 logs teamcruz-backend --lines 20
```