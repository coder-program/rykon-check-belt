# Deploy completo - Frontend e Backend
# Execute este script no PowerShell

Write-Host "Iniciando deploy..." -ForegroundColor Green

# Conectar ao servidor e fazer deploy
ssh root@200.98.72.161 @"
cd /var/www/teamcruz

echo 'Atualizando código...'
git stash
git clean -fd
git pull origin main

echo 'Deploy do BACKEND...'
cd backend
npm install --legacy-peer-deps
npm run build
pm2 delete teamcruz-backend 2>/dev/null || true
PORT=3000 pm2 start dist/src/main.js --name teamcruz-backend

echo 'Deploy do FRONTEND...'
cd ../frontend
npm install --legacy-peer-deps
npm run build
pm2 delete teamcruz-frontend 2>/dev/null || true
PORT=3001 pm2 start npm --name teamcruz-frontend -- start

echo 'Salvando configuração PM2...'
pm2 save

echo 'Deploy concluído!'
pm2 status
"@

Write-Host ""
Write-Host "Deploy finalizado!" -ForegroundColor Green
Write-Host "Acesse: http://200.98.72.161" -ForegroundColor Cyan
