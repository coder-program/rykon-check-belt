#!/bin/bash

###############################################################################
# Script para Corrigir e Redeploy Frontend TeamCruz
# Execute este script NO SERVIDOR via SSH
###############################################################################

set -e

echo "======================================================================"
echo "🔧 Corrigindo Configuração do Frontend TeamCruz"
echo "======================================================================"

cd /var/www/teamcruz/frontend

echo ""
echo "📍 Diretório atual: $(pwd)"

# 1. Parar o frontend atual
echo ""
echo "🛑 Parando frontend atual..."
pm2 delete teamcruz-frontend 2>/dev/null || echo "Nenhum processo anterior encontrado"

# 2. Corrigir arquivo .env.production
echo ""
echo "🔧 Corrigindo arquivo .env.production..."
cat > .env.production << 'EOF'
NEXT_PUBLIC_API_URL=http://200.98.72.161/api
NODE_ENV=production
EOF

echo "✅ Arquivo .env.production corrigido com URL: http://200.98.72.161/api"

# 3. Corrigir arquivo .env.local (se existir)
if [ -f ".env.local" ]; then
    echo ""
    echo "🔧 Corrigindo arquivo .env.local..."
    cat > .env.local << 'EOF'
# API Servidor UOL
NEXT_PUBLIC_API_URL=http://200.98.72.161/api
EOF
    echo "✅ Arquivo .env.local corrigido"
fi

# 4. Limpar cache do Next.js
echo ""
echo "🧹 Limpando cache do Next.js..."
rm -rf .next
rm -rf node_modules/.cache
npm cache clean --force

# 5. Reinstalar dependências
echo ""
echo "📦 Reinstalando dependências..."
npm install

# 6. Fazer novo build
echo ""
echo "🔨 Fazendo novo build do Next.js..."
npm run build

# 7. Verificar se as variáveis estão corretas
echo ""
echo "🔍 Verificando configuração..."
if grep -q "200.98.72.161" .env.production; then
    echo "✅ URL da API correta no .env.production"
else
    echo "❌ URL da API incorreta no .env.production"
    exit 1
fi

# 8. Recriar configuração PM2
echo ""
echo "⚙️  Recriando configuração PM2..."
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

echo "✅ Configuração PM2 recriada"

# 9. Criar diretório de logs
mkdir -p logs

# 10. Iniciar com PM2
echo ""
echo "🚀 Iniciando frontend com PM2..."
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "======================================================================"
echo "✅ FRONTEND CORRIGIDO E REDEPLOY CONCLUÍDO!"
echo "======================================================================"
echo ""
echo "📊 Status da aplicação:"
pm2 status

echo ""
echo "📋 Últimas linhas de log:"
pm2 logs teamcruz-frontend --lines 10 --nostream

echo ""
echo "🔍 Testando frontend..."
sleep 5
curl -I http://localhost:3001 2>/dev/null | head -n 1 || echo "⚠️  Frontend ainda não está respondendo (aguarde alguns segundos)"

echo ""
echo "📋 URLs Corretas:"
echo "  - Frontend: http://200.98.72.161"
echo "  - API: http://200.98.72.161/api"
echo ""
echo "📋 Comandos úteis:"
echo "  - Ver logs: pm2 logs teamcruz-frontend"
echo "  - Reiniciar: pm2 restart teamcruz-frontend"
echo "  - Status: pm2 status"
echo ""
echo "🎯 Agora o frontend deve fazer requisições para http://200.98.72.161/api"
echo ""