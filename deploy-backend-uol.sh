#!/bin/bash

echo "====================================="
echo "Deploy Backend TeamCruz - Servidor UOL"
echo "====================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Diretório do backend
BACKEND_DIR="/var/www/teamcruz/backend"

echo -e "${YELLOW}📁 Navegando para o diretório do backend...${NC}"
cd $BACKEND_DIR

# Backup do .env atual se existir
if [ -f ".env" ]; then
    echo -e "${YELLOW}💾 Fazendo backup do .env atual...${NC}"
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
fi

# Criar o arquivo .env correto para o servidor UOL
echo -e "${GREEN}📝 Criando arquivo .env para o servidor UOL...${NC}"
cat > .env << 'EOF'
# Database - Servidor UOL Local
DB_HOST=localhost
DB_PORT=5432
DB_NAME=teamcruz_db
DB_USER=teamcruz_app
DB_PASS=TeamCruz2024@Secure!

# Application
NODE_ENV=production
PORT=3000

# JWT
JWT_SECRET=jwt_secret_muito_forte_para_producao_teamcruz_2025
JWT_EXPIRES_IN=8h

# CORS - Permitir acesso do frontend no servidor UOL
CORS_ORIGIN=http://200.98.72.161

# Logs
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=100
EOF

echo -e "${GREEN}✅ Arquivo .env criado com sucesso!${NC}"

# Instalar dependências
echo -e "${YELLOW}📦 Instalando dependências...${NC}"
npm install --production

# Build do projeto
echo -e "${YELLOW}🔨 Compilando o projeto...${NC}"
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Erro: Diretório dist não foi criado. Build falhou!${NC}"
    exit 1
fi

# Criar diretório de logs
echo -e "${YELLOW}📂 Criando diretório de logs...${NC}"
mkdir -p logs

# Criar arquivo ecosystem.config.js para PM2
echo -e "${YELLOW}⚙️ Criando configuração do PM2...${NC}"
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

# Parar e remover aplicação anterior se existir
echo -e "${YELLOW}🛑 Parando aplicação anterior...${NC}"
pm2 delete teamcruz-backend 2>/dev/null || true

# Iniciar aplicação com PM2
echo -e "${GREEN}🚀 Iniciando backend com PM2...${NC}"
pm2 start ecosystem.config.js

# Salvar configuração do PM2
pm2 save

# Aguardar a aplicação iniciar
echo -e "${YELLOW}⏳ Aguardando aplicação iniciar...${NC}"
sleep 5

# Verificar status
echo -e "${YELLOW}📊 Status da aplicação:${NC}"
pm2 status teamcruz-backend

# Testar se o backend está respondendo
echo -e "${YELLOW}🧪 Testando backend...${NC}"
sleep 2

# Teste de saúde
if curl -f http://localhost:3000/api/health 2>/dev/null; then
    echo -e "\n${GREEN}✅ Backend está rodando corretamente!${NC}"
else
    echo -e "\n${YELLOW}⚠️ Backend pode não estar respondendo em /api/health${NC}"
    echo "Verificando logs..."
    pm2 logs teamcruz-backend --lines 20 --nostream
fi

# Informações úteis
echo -e "\n${GREEN}====================================="
echo "✅ Deploy do Backend Concluído!"
echo "====================================="
echo ""
echo "📝 Comandos úteis:"
echo "  pm2 status               - Ver status das aplicações"
echo "  pm2 logs teamcruz-backend - Ver logs em tempo real"
echo "  pm2 restart teamcruz-backend - Reiniciar o backend"
echo "  pm2 monit                 - Monitoramento em tempo real"
echo ""
echo "🌐 URLs:"
echo "  Backend (direto): http://200.98.72.161:3000/api"
echo "  Backend (via Nginx): http://200.98.72.161/api"
echo "====================================="
echo -e "${NC}"