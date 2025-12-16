# Script para configurar ambiente de STAGING no servidor UOL
# Execute: .\setup-staging.ps1

Write-Host "Configurando ambiente de STAGING no servidor UOL..." -ForegroundColor Green

ssh root@200.98.72.161 @"
echo '=== Configurando Staging ==='

# Criar diretório para staging
cd /var/www
if [ ! -d "teamcruz-staging" ]; then
    echo 'Clonando repositório para staging...'
    git clone https://github.com/coder-program/rykon-check-belt.git teamcruz-staging
fi

# Entrar no diretório de staging
cd teamcruz-staging

# Fazer checkout da branch develop
git checkout develop
git pull origin develop

# Configurar backend de staging
cd backend

# Criar arquivo .env para staging
cat > .env << 'EOL'
# Database (Staging)
DB_HOST=200.98.72.161
DB_PORT=5432
DB_NAME=teamcruz_db
DB_USER=teamcruz_app
DB_PASS=TeamCruz2024@Secure!
DB_SCHEMA=teamcruz_staging

# Application
NODE_ENV=staging
PORT=3001

# JWT
JWT_SECRET=jwt_secret_muito_forte_para_producao_123456789
JWT_EXPIRES_IN=8h

# CORS
CORS_ORIGIN=https://rykon-check-belt-git-develop-coder-programs-projects.vercel.app

# Logs
LOG_LEVEL=debug

# Email / SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=techrykon@gmail.com
SMTP_PASS=pdurdvdjnkrfekph
SUPPORT_EMAIL=techrykon@gmail.com
FRONTEND_URL=https://rykon-check-belt-git-develop-coder-programs-projects.vercel.app
EOL

# Instalar dependências
npm install --legacy-peer-deps

# Fazer build
npm run build

# Parar processo antigo se existir
pm2 delete teamcruz-backend-staging 2>/dev/null || true

# Iniciar processo de staging na porta 3001
PORT=3001 pm2 start dist/src/main.js --name teamcruz-backend-staging

# Salvar configuração
pm2 save

echo '=== Staging configurado com sucesso! ==='
pm2 status

echo ''
echo 'Backend Staging rodando em: http://200.98.72.161:3001'
"@

Write-Host ""
Write-Host "Ambiente de STAGING configurado!" -ForegroundColor Green
Write-Host "Staging API: http://200.98.72.161:3001" -ForegroundColor Cyan
Write-Host "Production API: http://200.98.72.161:3000" -ForegroundColor Cyan
