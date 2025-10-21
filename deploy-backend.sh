#!/bin/bash

###############################################################################
# Script de Deploy - Backend TeamCruz
# Execute este script NO SERVIDOR via SSH
###############################################################################

set -e

echo "======================================================================"
echo "🚀 Deploy Backend TeamCruz"
echo "======================================================================"

# Variáveis
BACKEND_DIR="/var/www/teamcruz/backend"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="teamcruz_db"
DB_USER="teamcruz_app"
DB_PASS="TeamCruz2024@Secure!"
JWT_SECRET="jwt_secret_muito_forte_para_producao_$(date +%s)"
PORT="3000"

echo "📁 Preparando diretório do backend..."
mkdir -p $BACKEND_DIR
cd $BACKEND_DIR

# Se já existe código, fazer backup
if [ -d "dist" ]; then
    echo "📦 Fazendo backup da versão anterior..."
    mv dist dist.backup.$(date +%Y%m%d_%H%M%S) || true
fi

echo ""
echo "======================================================================"
echo "📤 AGUARDANDO UPLOAD DO CÓDIGO"
echo "======================================================================"
echo ""
echo "Agora você precisa enviar o código do backend para o servidor."
echo ""
echo "👉 No seu COMPUTADOR LOCAL, abra outro terminal PowerShell e execute:"
echo ""
echo "   scp -r C:\\Users\\Lenovo\\Documents\\project\\rykon-check-belt\\backend\\* root@200.98.72.161:/var/www/teamcruz/backend/"
echo ""
echo "Após o upload, volte aqui e pressione ENTER para continuar..."
read -p ""

echo ""
echo "📦 Instalando dependências..."
npm install --production

echo ""
echo "🔧 Criando arquivo .env..."
cat > .env << EOF
# Database
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASS=$DB_PASS

# JWT
JWT_SECRET=$JWT_SECRET

# Server
PORT=$PORT
NODE_ENV=production

# CORS
CORS_ORIGIN=http://200.98.72.161
EOF

echo "✅ Arquivo .env criado"

echo ""
echo "🔨 Compilando TypeScript..."
npm run build

echo ""
echo "🗄️  Executando migrations..."
npm run migration:run || echo "⚠️  Migrations já executadas ou erro (verifique manualmente)"

echo ""
echo "🔧 Configurando PM2..."

# Criar arquivo de configuração do PM2
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

echo ""
echo "🚀 Iniciando aplicação com PM2..."
pm2 delete teamcruz-backend || true
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "======================================================================"
echo "✅ BACKEND DEPLOYADO COM SUCESSO!"
echo "======================================================================"
echo ""
echo "📋 Informações:"
echo "  - Diretório: $BACKEND_DIR"
echo "  - Porta: $PORT"
echo "  - PM2 App: teamcruz-backend"
echo ""
echo "📋 Comandos úteis:"
echo "  - Ver logs: pm2 logs teamcruz-backend"
echo "  - Status: pm2 status"
echo "  - Restart: pm2 restart teamcruz-backend"
echo "  - Stop: pm2 stop teamcruz-backend"
echo ""
echo "🔍 Testando backend..."
curl -f http://localhost:3000/api/health || echo "⚠️  Backend pode não estar respondendo ainda (verifique logs: pm2 logs)"
echo ""
