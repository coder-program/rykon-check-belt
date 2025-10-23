# Deploy TeamCruz - UOL (Otimizado)
$serverIP = "200.98.72.161"
$serverUser = "root"

Write-Host "Iniciando Deploy TeamCruz - UOL (Otimizado)" -ForegroundColor Cyan

# BACKEND
Write-Host "`nPreparando BACKEND..." -ForegroundColor Cyan
Write-Host "Empacotando backend..." -ForegroundColor Yellow

Push-Location backend
tar -czf ../backend-deploy.tar.gz --exclude=node_modules --exclude=dist --exclude=logs --exclude=.git --exclude='*.log' --exclude='*.gz' --exclude='*.zip' --exclude=coverage .
Pop-Location

Write-Host "Enviando backend..." -ForegroundColor Yellow
scp backend-deploy.tar.gz "$serverUser@${serverIP}:/tmp/"

Write-Host "Configurando no servidor..." -ForegroundColor Yellow
ssh "$serverUser@$serverIP" @"
mkdir -p /var/www/teamcruz/backend
cd /var/www/teamcruz/backend
tar -xzf /tmp/backend-deploy.tar.gz
rm /tmp/backend-deploy.tar.gz
npm install --production
npm run build
mkdir -p logs
pm2 delete teamcruz-backend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
"@

Remove-Item backend-deploy.tar.gz
Write-Host "Backend OK!" -ForegroundColor Green

# FRONTEND
Write-Host "`nPreparando FRONTEND..." -ForegroundColor Cyan
Write-Host "Empacotando frontend..." -ForegroundColor Yellow

Push-Location frontend
tar -czf ../frontend-deploy.tar.gz --exclude=node_modules --exclude=.next --exclude=out --exclude=logs --exclude=.git --exclude='*.log' --exclude='*.gz' --exclude='*.zip' .
Pop-Location

Write-Host "Enviando frontend..." -ForegroundColor Yellow
scp frontend-deploy.tar.gz "$serverUser@${serverIP}:/tmp/"

Write-Host "Configurando no servidor..." -ForegroundColor Yellow
ssh "$serverUser@$serverIP" @"
mkdir -p /var/www/teamcruz/frontend
cd /var/www/teamcruz/frontend
tar -xzf /tmp/frontend-deploy.tar.gz
rm /tmp/frontend-deploy.tar.gz
npm install --production
npm run build
mkdir -p logs
pm2 delete teamcruz-frontend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
"@

Remove-Item frontend-deploy.tar.gz
Write-Host "Frontend OK!" -ForegroundColor Green

Write-Host "`nSTATUS" -ForegroundColor Cyan
ssh "$serverUser@$serverIP" "pm2 status"

Write-Host "`nDEPLOY CONCLUIDO!" -ForegroundColor Green
Write-Host "Frontend: http://$serverIP" -ForegroundColor White
Write-Host "API: http://$serverIP/api/health" -ForegroundColor White
