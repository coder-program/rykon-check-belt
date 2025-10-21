# 🚀 Deploy Otimizado - Apenas arquivos necessários
# Exclui: node_modules, .next, dist, logs, backups, etc.

$SERVER = "root@200.98.72.161"
$PROJECT_ROOT = "C:\Users\Lenovo\Documents\project\rykon-check-belt"

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 DEPLOY OTIMIZADO - SERVIDOR UOL" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# ETAPA 1: Upload do Backend (SEM node_modules, dist, logs)
# ============================================================================
Write-Host "📤 [1/5] Upload BACKEND (apenas código fonte)..." -ForegroundColor Green

scp -r `
  --exclude='node_modules' `
  --exclude='dist' `
  --exclude='logs' `
  --exclude='*.log' `
  --exclude='*.tar.gz' `
  --exclude='.env' `
  "$PROJECT_ROOT\backend\*" `
  "$SERVER:/var/www/teamcruz/backend/"

Write-Host "✅ Backend enviado!" -ForegroundColor Green
Write-Host ""

# ============================================================================
# ETAPA 2: Deploy Backend no Servidor
# ============================================================================
Write-Host "🔧 [2/5] Deploy Backend no servidor..." -ForegroundColor Green

ssh $SERVER @'
cd /var/www/teamcruz/backend

echo "📊 Executando migration..."
sudo -u postgres psql -d teamcruz_db -f create-recepcionista-unidades-table.sql 2>&1 | grep -v "já existe" || true

echo "📦 Instalando dependências..."
npm install --production

echo "🔨 Compilando..."
npm run build

echo "🔄 Reiniciando PM2..."
pm2 delete teamcruz-backend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo "✅ Backend pronto!"
pm2 status
'@

Write-Host "✅ Backend deployado!" -ForegroundColor Green
Write-Host ""

# ============================================================================
# ETAPA 3: Upload do Frontend (SEM node_modules, .next)
# ============================================================================
Write-Host "📤 [3/5] Upload FRONTEND (apenas código fonte)..." -ForegroundColor Green

scp -r `
  --exclude='node_modules' `
  --exclude='.next' `
  --exclude='logs' `
  --exclude='*.log' `
  --exclude='.env.local' `
  "$PROJECT_ROOT\frontend\*" `
  "$SERVER:/var/www/teamcruz/frontend/"

Write-Host "✅ Frontend enviado!" -ForegroundColor Green
Write-Host ""

# ============================================================================
# ETAPA 4: Deploy Frontend no Servidor
# ============================================================================
Write-Host "🔧 [4/5] Deploy Frontend no servidor..." -ForegroundColor Green

ssh $SERVER @'
cd /var/www/teamcruz/frontend

echo "📦 Instalando dependências..."
npm install --production

echo "🔨 Building Next.js..."
npm run build

echo "🔄 Reiniciando PM2..."
pm2 delete teamcruz-frontend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo "✅ Frontend pronto!"
pm2 status
'@

Write-Host "✅ Frontend deployado!" -ForegroundColor Green
Write-Host ""

# ============================================================================
# ETAPA 5: Teste
# ============================================================================
Write-Host "🧪 [5/5] Testando..." -ForegroundColor Green

ssh $SERVER "curl -s http://localhost:3000/api/health && pm2 status"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ DEPLOY CONCLUÍDO!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Acesse: http://200.98.72.161" -ForegroundColor Yellow
Write-Host ""
