# Script de Deploy para Servidor UOL - TeamCruz
# Faz upload apenas dos arquivos essenciais

$ErrorActionPreference = "Stop"

$SERVER = "root@200.98.72.161"
$BACKEND_LOCAL = "C:\Users\Lenovo\Documents\project\rykon-check-belt\backend"
$FRONTEND_LOCAL = "C:\Users\Lenovo\Documents\project\rykon-check-belt\frontend"
$BACKEND_REMOTE = "/var/www/teamcruz/backend"
$FRONTEND_REMOTE = "/var/www/teamcruz/frontend"

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "🚀 Deploy TeamCruz para Servidor UOL" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# BACKEND DEPLOY
# ============================================
Write-Host "📦 ETAPA 1: Deploy do Backend" -ForegroundColor Yellow
Write-Host "---------------------------------------------------------------------" -ForegroundColor Yellow

# Arquivos e pastas essenciais do backend
$backendFiles = @(
    "src",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "nest-cli.json",
    ".env.production",
    "ecosystem.config.js"
)

Write-Host "Enviando arquivos do backend..." -ForegroundColor Green

foreach ($item in $backendFiles) {
    $sourcePath = Join-Path $BACKEND_LOCAL $item

    if (Test-Path $sourcePath) {
        Write-Host "  ✓ Enviando: $item" -ForegroundColor Gray

        if ((Get-Item $sourcePath).PSIsContainer) {
            scp -r "$sourcePath" "${SERVER}:${BACKEND_REMOTE}/"
        }
        else {
            scp "$sourcePath" "${SERVER}:${BACKEND_REMOTE}/"
        }

        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ✗ Erro ao enviar: $item" -ForegroundColor Red
            exit 1
        }
    }
    else {
        Write-Host "  ⚠ Arquivo não encontrado: $item" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ Backend enviado com sucesso!" -ForegroundColor Green
Write-Host ""

# ============================================
# FRONTEND DEPLOY
# ============================================
Write-Host "📦 ETAPA 2: Deploy do Frontend" -ForegroundColor Yellow
Write-Host "---------------------------------------------------------------------" -ForegroundColor Yellow

# Arquivos e pastas essenciais do frontend
$frontendFiles = @(
    "app",
    "components",
    "lib",
    "public",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "next.config.js",
    "tailwind.config.ts",
    "postcss.config.js",
    ".env.production",
    "ecosystem.config.js"
)

Write-Host "Enviando arquivos do frontend..." -ForegroundColor Green

foreach ($item in $frontendFiles) {
    $sourcePath = Join-Path $FRONTEND_LOCAL $item

    if (Test-Path $sourcePath) {
        Write-Host "  ✓ Enviando: $item" -ForegroundColor Gray

        if ((Get-Item $sourcePath).PSIsContainer) {
            scp -r "$sourcePath" "${SERVER}:${FRONTEND_REMOTE}/"
        }
        else {
            scp "$sourcePath" "${SERVER}:${FRONTEND_REMOTE}/"
        }

        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ✗ Erro ao enviar: $item" -ForegroundColor Red
            exit 1
        }
    }
    else {
        Write-Host "  ⚠ Arquivo não encontrado: $item" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ Frontend enviado com sucesso!" -ForegroundColor Green
Write-Host ""

# ============================================
# DEPLOY NO SERVIDOR
# ============================================
Write-Host "🚀 ETAPA 3: Executando Deploy no Servidor" -ForegroundColor Yellow
Write-Host "---------------------------------------------------------------------" -ForegroundColor Yellow

$deployScript = @"
#!/bin/bash
set -e

echo '========================================='
echo '📦 Instalando dependências do Backend...'
echo '========================================='
cd $BACKEND_REMOTE
npm install --production

echo ''
echo '========================================='
echo '🔨 Compilando Backend...'
echo '========================================='
npm run build

echo ''
echo '========================================='
echo '🔄 Reiniciando Backend com PM2...'
echo '========================================='
pm2 delete teamcruz-backend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo ''
echo '========================================='
echo '📦 Instalando dependências do Frontend...'
echo '========================================='
cd $FRONTEND_REMOTE
npm install --production

echo ''
echo '========================================='
echo '🔨 Buildando Frontend...'
echo '========================================='
npm run build

echo ''
echo '========================================='
echo '🔄 Reiniciando Frontend com PM2...'
echo '========================================='
pm2 delete teamcruz-frontend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo ''
echo '========================================='
echo '✅ DEPLOY CONCLUÍDO COM SUCESSO!'
echo '========================================='
pm2 status

echo ''
echo '📊 Últimos logs do Backend:'
pm2 logs teamcruz-backend --lines 10 --nostream

echo ''
echo '📊 Últimos logs do Frontend:'
pm2 logs teamcruz-frontend --lines 10 --nostream

echo ''
echo '========================================='
echo '🌐 Acesse a aplicação em:'
echo 'Frontend: http://200.98.72.161'
echo 'API: http://200.98.72.161/api/health'
echo '========================================='
"@

# Salvar script temporário
$tempScript = [System.IO.Path]::GetTempFileName() + ".sh"
$deployScript | Out-File -FilePath $tempScript -Encoding ASCII

Write-Host "Enviando script de deploy..." -ForegroundColor Green
scp $tempScript "${SERVER}:/tmp/deploy.sh"

Write-Host "Executando deploy no servidor..." -ForegroundColor Green
ssh $SERVER "chmod +x /tmp/deploy.sh && /tmp/deploy.sh"

# Limpar arquivo temporário
Remove-Item $tempScript

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "✅ DEPLOY COMPLETO!" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Aplicação disponível em:" -ForegroundColor Yellow
Write-Host "   Frontend: http://200.98.72.161" -ForegroundColor White
Write-Host "   API: http://200.98.72.161/api/health" -ForegroundColor White
Write-Host ""
