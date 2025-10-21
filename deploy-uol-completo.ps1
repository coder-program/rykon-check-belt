# 🚀 Script de Deploy Completo - Servidor UOL TeamCruz
# Execute este script no PowerShell como Administrador

$ErrorActionPreference = "Continue"

# Configurações
$SERVER = "root@200.98.72.161"
$LOCAL_BACKEND = "C:\Users\Lenovo\Documents\project\rykon-check-belt\backend"
$LOCAL_FRONTEND = "C:\Users\Lenovo\Documents\project\rykon-check-belt\frontend"
$REMOTE_BACKEND = "/var/www/teamcruz/backend"
$REMOTE_FRONTEND = "/var/www/teamcruz/frontend"

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 DEPLOY TEAMCRUZ - SERVIDOR UOL" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# ETAPA 1: Upload do Backend
# ============================================================================
Write-Host "📤 [1/6] Fazendo upload do BACKEND..." -ForegroundColor Green
Write-Host "Origem: $LOCAL_BACKEND" -ForegroundColor Gray
Write-Host "Destino: $SERVER`:$REMOTE_BACKEND" -ForegroundColor Gray
Write-Host ""

# Criar backup no servidor antes de sobrescrever
Write-Host "💾 Criando backup do backend atual..." -ForegroundColor Yellow
ssh $SERVER "cd /var/www/teamcruz && tar -czf backend-backup-$(date +%Y%m%d-%H%M%S).tar.gz backend/ 2>/dev/null || echo 'Sem backup anterior'"

# Upload dos arquivos do backend
scp -r "$LOCAL_BACKEND\*" "$SERVER`:$REMOTE_BACKEND/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend enviado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao enviar backend!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Start-Sleep -Seconds 2

# ============================================================================
# ETAPA 2: Executar Migrations no Servidor
# ============================================================================
Write-Host "📊 [2/6] Executando MIGRATIONS no banco de dados..." -ForegroundColor Green

ssh $SERVER @"
cd $REMOTE_BACKEND

# Executar migration da tabela recepcionista_unidades
echo '🔄 Executando create-recepcionista-unidades-table.sql...'
sudo -u postgres psql -d teamcruz_db -f create-recepcionista-unidades-table.sql

if [ \$? -eq 0 ]; then
    echo '✅ Migration executada com sucesso!'
else
    echo '⚠️ Erro na migration (pode já existir)'
fi

# Verificar se a tabela foi criada
echo ''
echo '🔍 Verificando tabela recepcionista_unidades...'
sudo -u postgres psql -d teamcruz_db -c '\d teamcruz.recepcionista_unidades'
"@

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migrations executadas!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Algumas migrations podem ter falhado (pode ser normal se já existirem)" -ForegroundColor Yellow
}

Write-Host ""
Start-Sleep -Seconds 2

# ============================================================================
# ETAPA 3: Deploy do Backend
# ============================================================================
Write-Host "🔧 [3/6] Instalando dependências e compilando BACKEND..." -ForegroundColor Green

ssh $SERVER @"
cd $REMOTE_BACKEND

# Instalar dependências
echo '📦 Instalando dependências...'
npm install

# Compilar TypeScript
echo '🔨 Compilando TypeScript...'
npm run build

# Verificar se compilou
if [ -d "dist" ]; then
    echo '✅ Compilação concluída!'
else
    echo '❌ Erro na compilação!'
    exit 1
fi

# Reiniciar com PM2
echo '🔄 Reiniciando backend com PM2...'
pm2 delete teamcruz-backend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# Ver status
pm2 status

# Aguardar inicialização
sleep 3

# Ver logs recentes
echo ''
echo '📋 Últimas linhas do log:'
pm2 logs teamcruz-backend --lines 20 --nostream
"@

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend deployado e reiniciado!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro no deploy do backend!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Start-Sleep -Seconds 2

# ============================================================================
# ETAPA 4: Upload do Frontend
# ============================================================================
Write-Host "📤 [4/6] Fazendo upload do FRONTEND..." -ForegroundColor Green
Write-Host "Origem: $LOCAL_FRONTEND" -ForegroundColor Gray
Write-Host "Destino: $SERVER`:$REMOTE_FRONTEND" -ForegroundColor Gray
Write-Host ""

# Criar backup no servidor antes de sobrescrever
Write-Host "💾 Criando backup do frontend atual..." -ForegroundColor Yellow
ssh $SERVER "cd /var/www/teamcruz && tar -czf frontend-backup-$(date +%Y%m%d-%H%M%S).tar.gz frontend/ 2>/dev/null || echo 'Sem backup anterior'"

# Upload dos arquivos do frontend
scp -r "$LOCAL_FRONTEND\*" "$SERVER`:$REMOTE_FRONTEND/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend enviado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao enviar frontend!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Start-Sleep -Seconds 2

# ============================================================================
# ETAPA 5: Deploy do Frontend
# ============================================================================
Write-Host "🔧 [5/6] Instalando dependências e compilando FRONTEND..." -ForegroundColor Green

ssh $SERVER @"
cd $REMOTE_FRONTEND

# Instalar dependências
echo '📦 Instalando dependências...'
npm install

# Build do Next.js
echo '🔨 Fazendo build do Next.js...'
npm run build

# Verificar se buildou
if [ -d ".next" ]; then
    echo '✅ Build concluído!'
else
    echo '❌ Erro no build!'
    exit 1
fi

# Reiniciar com PM2
echo '🔄 Reiniciando frontend com PM2...'
pm2 delete teamcruz-frontend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# Ver status
pm2 status

# Aguardar inicialização
sleep 3

# Ver logs recentes
echo ''
echo '📋 Últimas linhas do log:'
pm2 logs teamcruz-frontend --lines 20 --nostream
"@

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend deployado e reiniciado!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro no deploy do frontend!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Start-Sleep -Seconds 2

# ============================================================================
# ETAPA 6: Testar Aplicação
# ============================================================================
Write-Host "🧪 [6/6] Testando aplicação no servidor..." -ForegroundColor Green

# Testar Backend
Write-Host "🔍 Testando Backend API..." -ForegroundColor Cyan
ssh $SERVER "curl -s http://localhost:3000/api/health || echo 'Backend não respondeu'"

Write-Host ""

# Testar Frontend
Write-Host "🔍 Testando Frontend..." -ForegroundColor Cyan
ssh $SERVER "curl -s -I http://localhost:3001 | head -n 1"

Write-Host ""

# Status final do PM2
Write-Host "📊 Status final dos serviços:" -ForegroundColor Cyan
ssh $SERVER "pm2 status"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ DEPLOY CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Acesse a aplicação em:" -ForegroundColor Yellow
Write-Host "   Frontend: http://200.98.72.161" -ForegroundColor White
Write-Host "   API:      http://200.98.72.161/api" -ForegroundColor White
Write-Host ""
Write-Host "📋 Comandos úteis:" -ForegroundColor Yellow
Write-Host "   Ver logs:     ssh $SERVER 'pm2 logs'" -ForegroundColor Gray
Write-Host "   Status:       ssh $SERVER 'pm2 status'" -ForegroundColor Gray
Write-Host "   Reiniciar:    ssh $SERVER 'pm2 restart all'" -ForegroundColor Gray
Write-Host ""
