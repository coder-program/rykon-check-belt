# Deploy do Backend no UOL
# Execute este script no PowerShell

Write-Host "Iniciando deploy do backend..." -ForegroundColor Green

Write-Host "Conectando ao servidor e fazendo deploy..." -ForegroundColor Yellow

# Conectar ao servidor e fazer deploy
ssh root@200.98.72.161 "cd /var/www/teamcruz && echo 'Atualizando código...' && git stash && git clean -fd && git pull origin main && echo 'Deploy do BACKEND...' && cd backend && npm install --legacy-peer-deps && npm run build && pm2 delete teamcruz-backend 2>/dev/null || true && PORT=3000 pm2 start dist/src/main.js --name teamcruz-backend && echo 'Salvando configuração PM2...' && pm2 save && echo 'Deploy do backend concluído!' && pm2 status"

Write-Host ""
Write-Host "Deploy do backend finalizado!" -ForegroundColor Green
Write-Host "Backend rodando em: http://200.98.72.161:3000" -ForegroundColor Cyan
