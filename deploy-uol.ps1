# Script de Deploy Otimizado - UOL TeamCruz
# Envia apenas arquivos necessários, excluindo node_modules, builds, backups, etc.

$ErrorActionPreference = "Stop"

Write-Host "🚀 Iniciando Deploy TeamCruz - UOL" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Configurações
$serverIP = "200.98.72.161"
$serverUser = "root"
$localBackendPath = "C:\Users\Lenovo\Documents\project\rykon-check-belt\backend"
$localFrontendPath = "C:\Users\Lenovo\Documents\project\rykon-check-belt\frontend"
$remoteBackendPath = "/var/www/teamcruz/backend"
$remoteFrontendPath = "/var/www/teamcruz/frontend"

# Função para fazer deploy do backend
function Deploy-Backend {
    Write-Host "`n🔧 DEPLOY DO BACKEND" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    
    Write-Host "📤 Enviando código do backend..." -ForegroundColor Yellow
    
    # Criar diretório remoto
    ssh "$serverUser@$serverIP" "mkdir -p $remoteBackendPath"
    
    # Enviar arquivos (usando rsync é mais eficiente, mas como pode não estar instalado no Windows, usamos scp)
    # Precisamos criar um arquivo temporário com a lista de exclusões
    $excludeList = @(
        'node_modules',
        'dist',
        'logs',
        '.git',
        '.env',
        '.env.local',
        '*.log',
        '*.gz',
        '*.zip',
        '*.tar',
        '.DS_Store',
        'Thumbs.db',
        'coverage',
        '.nyc_output',
        'temp',
        'tmp'
    )
    
    Write-Host "⚠️  Nota: scp não suporta --exclude. Enviando todos os arquivos..." -ForegroundColor Yellow
    Write-Host "📝 Será necessário limpar node_modules e dist remotamente." -ForegroundColor Yellow
    
    scp -r "$localBackendPath\*" "$serverUser@${serverIP}:$remoteBackendPath/"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Código enviado!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro ao enviar backend!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "`n🧹 Limpando arquivos desnecessários no servidor..." -ForegroundColor Yellow
    
    ssh "$serverUser@$serverIP" @"
        cd $remoteBackendPath
        rm -rf node_modules dist logs *.log *.gz *.zip *.tar .git coverage .nyc_output temp tmp
        echo '✓ Arquivos desnecessários removidos'
"@
    
    Write-Host "`nInstalando dependencias e compilando..." -ForegroundColor Yellow
    
    ssh "$serverUser@$serverIP" @"
        cd $remoteBackendPath
        npm install --production
        npm run build
        mkdir -p logs
        pm2 delete teamcruz-backend 2>/dev/null || true
        pm2 start ecosystem.config.js
        pm2 save
"@
    
    Write-Host "✅ Backend deployado!" -ForegroundColor Green
}

# Função para fazer deploy do frontend
function Deploy-Frontend {
    Write-Host "`n🎨 DEPLOY DO FRONTEND" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    
    Write-Host "📤 Enviando código do frontend..." -ForegroundColor Yellow
    
    ssh "$serverUser@$serverIP" "mkdir -p $remoteFrontendPath"
    
    scp -r "$localFrontendPath\*" "$serverUser@${serverIP}:$remoteFrontendPath/"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Código enviado!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro ao enviar frontend!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "`n🧹 Limpando arquivos desnecessários no servidor..." -ForegroundColor Yellow
    
    ssh "$serverUser@$serverIP" @"
        cd $remoteFrontendPath
        rm -rf node_modules .next out logs *.log *.gz *.zip *.tar .git coverage temp tmp
        echo '✓ Arquivos desnecessários removidos'
"@
    
    Write-Host "`nInstalando dependencias e fazendo build..." -ForegroundColor Yellow
    
    ssh "$serverUser@$serverIP" @"
        cd $remoteFrontendPath
        npm install --production
        npm run build
        mkdir -p logs
        pm2 delete teamcruz-frontend 2>/dev/null || true
        pm2 start ecosystem.config.js
        pm2 save
"@
    
    Write-Host "✅ Frontend deployado!" -ForegroundColor Green
}

# Função para verificar status
function Check-Status {
    Write-Host "`n📊 STATUS DOS SERVIÇOS" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    
    ssh "$serverUser@$serverIP" "pm2 status"
    
    Write-Host "`n🧪 Testando endpoints..." -ForegroundColor Yellow
    
    ssh "$serverUser@$serverIP" "pm2 logs --lines 10 --nostream"
}

# Execução principal
try {
    Write-Host "`nQual componente deseja fazer deploy?" -ForegroundColor Yellow
    Write-Host "1 - Backend apenas" -ForegroundColor White
    Write-Host "2 - Frontend apenas" -ForegroundColor White
    Write-Host "3 - Ambos (Backend + Frontend)" -ForegroundColor White
    Write-Host -NoNewline "Escolha (1/2/3): " -ForegroundColor Yellow
    $choice = Read-Host
    
    switch ($choice) {
        "1" {
            Deploy-Backend
        }
        "2" {
            Deploy-Frontend
        }
        "3" {
            Deploy-Backend
            Deploy-Frontend
        }
        default {
            Write-Host "❌ Opção inválida!" -ForegroundColor Red
            exit 1
        }
    }
    
    Check-Status
    
    Write-Host "`n✅ DEPLOY CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "🌐 Frontend: http://$serverIP" -ForegroundColor White
    Write-Host "🔌 API: http://$serverIP/api/health" -ForegroundColor White
    Write-Host "================================================" -ForegroundColor Cyan
    
} catch {
    Write-Host "`n❌ ERRO NO DEPLOY!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
