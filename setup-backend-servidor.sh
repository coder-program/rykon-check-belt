#!/bin/bash

###############################################################################
# Script de Deploy Completo - Backend TeamCruz
# Execute este script NO SERVIDOR via SSH
###############################################################################

set -e

echo "======================================================================"
echo "🚀 Iniciando Deploy do Backend TeamCruz"
echo "======================================================================"

cd /var/www/teamcruz/backend

echo ""
echo "✅ Diretório: $(pwd)"
echo ""

# 1. Criar arquivo .env
echo "📝 Criando arquivo .env..."
cat > .env << 'EOF'
DB_HOST=localhost
DB_PORT=5432
DB_NAME=teamcruz_db
DB_USER=teamcruz_app
DB_PASS=TeamCruz2024@Secure!
JWT_SECRET=jwt_secret_muito_forte_para_producao_teamcruz_2025
PORT=3000
NODE_ENV=production
CORS_ORIGIN=http://200.98.72.161
EOF

echo "✅ Arquivo .env criado"

# 2. Compilar TypeScript
echo ""
echo "🔨 Compilando TypeScript..."
npm run build

echo "✅ Build concluído"

# 3. Criar configuração PM2
echo ""
echo "⚙️  Criando configuração PM2..."
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

echo "✅ Configuração PM2 criada"

# 4. Criar diretório de logs
echo ""
echo "📁 Criando diretório de logs..."
mkdir -p logs

# 5. Parar processo anterior se existir
echo ""
echo "🛑 Parando processo anterior (se existir)..."
pm2 delete teamcruz-backend 2>/dev/null || echo "Nenhum processo anterior encontrado"

# 6. Iniciar com PM2
echo ""
echo "🚀 Iniciando aplicação com PM2..."
pm2 start ecosystem.config.js

# 7. Salvar configuração PM2
pm2 save

echo ""
echo "======================================================================"
echo "✅ BACKEND DEPLOYADO COM SUCESSO!"
echo "======================================================================"
echo ""
echo "📊 Status da aplicação:"
pm2 status

echo ""
echo "📋 Últimas linhas de log:"
pm2 logs teamcruz-backend --lines 20 --nostream

echo ""
echo "======================================================================"
echo "🔍 Testando backend..."
sleep 3
curl -f http://localhost:3000/api/health || echo "⚠️  Backend ainda não está respondendo (aguarde alguns segundos)"

echo ""
echo "📋 Comandos úteis:"
echo "  - Ver logs: pm2 logs teamcruz-backend"
echo "  - Ver status: pm2 status"
echo "  - Reiniciar: pm2 restart teamcruz-backend"
echo ""
