# Deploy TeamCruz - UOL
$serverIP = "200.98.72.161"
$serverUser = "root"

Write-Host "Iniciando Deploy TeamCruz - UOL" -ForegroundColor Cyan

# BACKEND
Write-Host "`nDEPLOY DO BACKEND" -ForegroundColor Cyan
Write-Host "Enviando codigo do backend..." -ForegroundColor Yellow

ssh "$serverUser@$serverIP" "mkdir -p /var/www/teamcruz/backend"
scp -r backend/* "$serverUser@${serverIP}:/var/www/teamcruz/backend/"

Write-Host "Limpando arquivos desnecessarios..." -ForegroundColor Yellow
ssh "$serverUser@$serverIP" "cd /var/www/teamcruz/backend && rm -rf node_modules dist logs *.log *.gz *.zip *.tar .git"

Write-Host "Instalando e compilando..." -ForegroundColor Yellow
ssh "$serverUser@$serverIP" "cd /var/www/teamcruz/backend && npm install --production && npm run build && mkdir -p logs"

Write-Host "Reiniciando servico..." -ForegroundColor Yellow
ssh "$serverUser@$serverIP" "pm2 delete teamcruz-backend 2>/dev/null; pm2 start /var/www/teamcruz/backend/ecosystem.config.js; pm2 save"

Write-Host "Backend deployado!" -ForegroundColor Green

# FRONTEND
Write-Host "`nDEPLOY DO FRONTEND" -ForegroundColor Cyan
Write-Host "Enviando codigo do frontend..." -ForegroundColor Yellow

ssh "$serverUser@$serverIP" "mkdir -p /var/www/teamcruz/frontend"
scp -r frontend/* "$serverUser@${serverIP}:/var/www/teamcruz/frontend/"

Write-Host "Limpando arquivos desnecessarios..." -ForegroundColor Yellow
ssh "$serverUser@$serverIP" "cd /var/www/teamcruz/frontend && rm -rf node_modules .next out logs *.log *.gz *.zip *.tar .git"

Write-Host "Instalando e compilando..." -ForegroundColor Yellow
ssh "$serverUser@$serverIP" "cd /var/www/teamcruz/frontend && npm install --production && npm run build && mkdir -p logs"

Write-Host "Reiniciando servico..." -ForegroundColor Yellow
ssh "$serverUser@$serverIP" "pm2 delete teamcruz-frontend 2>/dev/null; pm2 start /var/www/teamcruz/frontend/ecosystem.config.js; pm2 save"

Write-Host "Frontend deployado!" -ForegroundColor Green

# STATUS
Write-Host "`nSTATUS DOS SERVICOS" -ForegroundColor Cyan
ssh "$serverUser@$serverIP" "pm2 status"

Write-Host "`nDEPLOY CONCLUIDO!" -ForegroundColor Green
Write-Host "Frontend: http://$serverIP" -ForegroundColor White
Write-Host "API: http://$serverIP/api/health" -ForegroundColor White
