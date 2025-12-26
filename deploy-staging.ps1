# Deploy do Backend STAGING no UOL
# Execute: .\deploy-staging.ps1

Write-Host "Iniciando deploy do backend STAGING..." -ForegroundColor Green

ssh root@200.98.72.161 @"
cd /var/www/teamcruz-staging

echo 'Atualizando código da branch develop...'
git stash
git checkout develop
git pull origin develop

echo 'Atualizando .env de staging...'
cd backend
cat > .env << 'ENVEOF'
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
ENVEOF

echo 'Deploy do BACKEND STAGING...'
npm install --legacy-peer-deps
npm run build

pm2 delete teamcruz-backend-staging 2>/dev/null || true
PORT=3001 pm2 start dist/src/main.js --name teamcruz-backend-staging

echo 'Salvando configuração PM2...'
pm2 save

echo 'Deploy do backend STAGING concluído!'
pm2 status
"@

Write-Host ""
Write-Host "Deploy do backend STAGING finalizado!" -ForegroundColor Green
Write-Host "Staging rodando em: http://200.98.72.161:3001" -ForegroundColor Cyan
