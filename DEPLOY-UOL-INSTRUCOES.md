# 🚀 Instruções de Deploy - Servidor UOL TeamCruz

## 📋 Resumo do Processo

1. ✅ Enviar código para o servidor
2. ✅ Deploy do Backend
3. ✅ Deploy do Frontend
4. ✅ Configurar Nginx
5. ✅ Liberar portas no firewall
6. ✅ Testar aplicação

---

## 🎯 PASSO 1: Preparar o Servidor

**No terminal SSH conectado ao servidor:**

```bash
# Criar diretórios
mkdir -p /var/www/teamcruz/backend
mkdir -p /var/www/teamcruz/frontend

# Verificar se tudo está instalado
node --version
npm --version
pm2 --version
psql --version
nginx -v
```

---

## 📤 PASSO 2: Enviar Código do BACKEND

**No seu COMPUTADOR LOCAL (PowerShell):**

```powershell
# Enviar código do backend (pode demorar alguns minutos)
scp -r C:\Users\Lenovo\Documents\project\rykon-check-belt\backend\* root@200.98.72.161:/var/www/teamcruz/backend/
```

⏳ **Aguarde o upload terminar...**

---

## 🔧 PASSO 3: Deploy do Backend

**No terminal SSH do servidor:**

```bash
cd /var/www/teamcruz/backend

# Criar arquivo .env
cat > .env << 'EOF'
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=teamcruz_db
DB_USER=teamcruz_app
DB_PASS=TeamCruz2024@Secure!

# JWT
JWT_SECRET=jwt_secret_muito_forte_para_producao_teamcruz_2025

# Server
PORT=3000
NODE_ENV=production

# CORS
CORS_ORIGIN=http://200.98.72.161
EOF

# Instalar dependências
npm install

# Compilar TypeScript
npm run build

# Executar migrations (SE NECESSÁRIO - você disse que já fez)
# npm run migration:run

# Criar configuração PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'teamcruz-backend',
    script: './dist/main.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Criar diretório de logs
mkdir -p logs

# Iniciar com PM2
pm2 delete teamcruz-backend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# Ver status
pm2 status
pm2 logs teamcruz-backend --lines 50
```

**Teste se o backend está rodando:**

```bash
curl http://localhost:3000/api/health
```

Se retornar algo, está funcionando! ✅

---

## 📤 PASSO 4: Enviar Código do FRONTEND

**No seu COMPUTADOR LOCAL (PowerShell):**

```powershell
# Enviar código do frontend (pode demorar alguns minutos)
scp -r C:\Users\Lenovo\Documents\project\rykon-check-belt\frontend\* root@200.98.72.161:/var/www/teamcruz/frontend/
```

⏳ **Aguarde o upload terminar...**

---

## 🔧 PASSO 5: Deploy do Frontend

**No terminal SSH do servidor:**

```bash
cd /var/www/teamcruz/frontend

# Criar arquivo .env.production
cat > .env.production << 'EOF'
NEXT_PUBLIC_API_URL=http://200.98.72.161/api
NODE_ENV=production
EOF

# Instalar dependências
npm install

# Build do Next.js
npm run build

# Criar configuração PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'teamcruz-frontend',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3001',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Criar diretório de logs
mkdir -p logs

# Iniciar com PM2
pm2 delete teamcruz-frontend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# Ver status
pm2 status
pm2 logs teamcruz-frontend --lines 50
```

---

## 🌐 PASSO 6: Configurar Nginx

**No terminal SSH do servidor:**

```bash
# Criar arquivo de configuração do Nginx
cat > /etc/nginx/sites-available/teamcruz << 'EOF'
server {
    listen 80;
    server_name 200.98.72.161;

    access_log /var/log/nginx/teamcruz-access.log;
    error_log /var/log/nginx/teamcruz-error.log;

    client_max_body_size 10M;

    # API routes
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /_next/static {
        proxy_pass http://localhost:3001;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=3600, immutable";
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
}
EOF

# Remover configuração padrão
rm -f /etc/nginx/sites-enabled/default

# Ativar nova configuração
ln -sf /etc/nginx/sites-available/teamcruz /etc/nginx/sites-enabled/

# Testar configuração
nginx -t

# Recarregar Nginx
systemctl reload nginx
systemctl status nginx
```

---

## 🔥 PASSO 7: Liberar Portas no Firewall da UOL

**No painel web da UOL, adicione estas regras:**

| Porta | Protocolo | Origem    | Descrição          |
|-------|-----------|-----------|-------------------|
| 80    | TCP       | 0.0.0.0/0 | HTTP (Nginx)      |
| 443   | TCP       | 0.0.0.0/0 | HTTPS (futuro)    |
| 3000  | TCP       | 0.0.0.0/0 | Backend (temp)    |
| 3001  | TCP       | 0.0.0.0/0 | Frontend (temp)   |

---

## ✅ PASSO 8: Testar a Aplicação

**No seu navegador:**

1. **Frontend:** http://200.98.72.161
2. **Backend API:** http://200.98.72.161/api/health
3. **Backend direto:** http://200.98.72.161:3000/api/health

---

## 📊 Comandos Úteis PM2

```bash
# Ver status de todas as aplicações
pm2 status

# Ver logs
pm2 logs
pm2 logs teamcruz-backend
pm2 logs teamcruz-frontend

# Reiniciar aplicações
pm2 restart teamcruz-backend
pm2 restart teamcruz-frontend
pm2 restart all

# Parar aplicações
pm2 stop teamcruz-backend
pm2 stop teamcruz-frontend

# Monitoramento em tempo real
pm2 monit
```

---

## 🆘 Troubleshooting

### Backend não inicia:

```bash
cd /var/www/teamcruz/backend
pm2 logs teamcruz-backend --lines 100
cat logs/err.log
```

### Frontend não inicia:

```bash
cd /var/www/teamcruz/frontend
pm2 logs teamcruz-frontend --lines 100
cat logs/err.log
```

### Nginx com erro:

```bash
nginx -t
systemctl status nginx
cat /var/log/nginx/teamcruz-error.log
```

### Banco de dados não conecta:

```bash
sudo -u postgres psql -c "\l"
sudo -u postgres psql -d teamcruz_db -c "\dt"
```

---

## 🔄 Redeploy (Atualizações Futuras)

**Para atualizar o código:**

```bash
# Backend
cd /var/www/teamcruz/backend
git pull  # ou fazer upload via scp novamente
npm install
npm run build
pm2 restart teamcruz-backend

# Frontend
cd /var/www/teamcruz/frontend
git pull  # ou fazer upload via scp novamente
npm install
npm run build
pm2 restart teamcruz-frontend
```

---

## 📝 Informações Importantes

**URLs:**
- Frontend: http://200.98.72.161
- API: http://200.98.72.161/api

**Diretórios:**
- Backend: /var/www/teamcruz/backend
- Frontend: /var/www/teamcruz/frontend

**Banco de Dados:**
- Host: localhost
- Porta: 5432
- Database: teamcruz_db
- Usuário: teamcruz_app
- Senha: TeamCruz2024@Secure!

**PM2 Apps:**
- Backend: teamcruz-backend
- Frontend: teamcruz-frontend
