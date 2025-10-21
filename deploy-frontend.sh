#!/bin/bash

###############################################################################
# Script de Deploy - Frontend TeamCruz
# Execute este script NO SERVIDOR via SSH
###############################################################################

set -e

echo "======================================================================"
echo "🚀 Deploy Frontend TeamCruz"
echo "======================================================================"

# Variáveis
FRONTEND_DIR="/var/www/teamcruz/frontend"
API_URL="http://200.98.72.161/api"
PORT="3001"

echo "📁 Preparando diretório do frontend..."
mkdir -p $FRONTEND_DIR
cd $FRONTEND_DIR

# Se já existe código, fazer backup
if [ -d ".next" ]; then
    echo "📦 Fazendo backup da versão anterior..."
    mv .next .next.backup.$(date +%Y%m%d_%H%M%S) || true
fi

echo ""
echo "======================================================================"
echo "📤 AGUARDANDO UPLOAD DO CÓDIGO"
echo "======================================================================"
echo ""
echo "Agora você precisa enviar o código do frontend para o servidor."
echo ""
echo "👉 No seu COMPUTADOR LOCAL, abra outro terminal PowerShell e execute:"
echo ""
echo "   scp -r C:\\Users\\Lenovo\\Documents\\project\\rykon-check-belt\\frontend\\* root@200.98.72.161:/var/www/teamcruz/frontend/"
echo ""
echo "Após o upload, volte aqui e pressione ENTER para continuar..."
read -p ""

echo ""
echo "📦 Instalando dependências..."
npm install --production

echo ""
echo "🔧 Criando arquivo .env.production..."
cat > .env.production << EOF
NEXT_PUBLIC_API_URL=$API_URL
NODE_ENV=production
EOF

echo "✅ Arquivo .env.production criado"

echo ""
echo "🔨 Fazendo build do Next.js..."
npm run build

echo ""
echo "🔧 Configurando PM2..."

# Criar arquivo de configuração do PM2
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
      PORT: 3001,
      NEXT_PUBLIC_API_URL: 'http://200.98.72.161/api'
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
pm2 delete teamcruz-frontend || true
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "======================================================================"
echo "✅ FRONTEND DEPLOYADO COM SUCESSO!"
echo "======================================================================"
echo ""
echo "📋 Informações:"
echo "  - Diretório: $FRONTEND_DIR"
echo "  - Porta: $PORT"
echo "  - PM2 App: teamcruz-frontend"
echo ""
echo "📋 Comandos úteis:"
echo "  - Ver logs: pm2 logs teamcruz-frontend"
echo "  - Status: pm2 status"
echo "  - Restart: pm2 restart teamcruz-frontend"
echo "  - Stop: pm2 stop teamcruz-frontend"
echo ""
