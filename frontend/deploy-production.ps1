# Script completo de deploy para produção (Windows PowerShell)
# Uso: .\deploy-production.ps1

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectId = "teamcruz-controle-alunos",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$UseCloudBuild = $false
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   DEPLOY FRONTEND PARA PRODUÇÃO    " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Configuração
$SERVICE_NAME = "teamcruz-frontend"
$REGION = "us-central1"
$API_URL = "https://teamcruz-backend-m2olfa5bfa-rj.a.run.app/api"
$IMAGE_TAG = "gcr.io/$ProjectId/${SERVICE_NAME}:latest"
$TIMESTAMP = Get-Date -Format "yyyyMMdd-HHmmss"
$IMAGE_TAG_VERSIONED = "gcr.io/$ProjectId/${SERVICE_NAME}:$TIMESTAMP"

Write-Host "📦 Configurações do Deploy:" -ForegroundColor Yellow
Write-Host "  Project ID: $ProjectId"
Write-Host "  Service: $SERVICE_NAME"
Write-Host "  Region: $REGION"
Write-Host "  API URL: $API_URL"
Write-Host "  Image: $IMAGE_TAG"
Write-Host ""

# Verificar se gcloud está instalado
Write-Host "🔍 Verificando ferramentas necessárias..." -ForegroundColor Yellow
$gcloudInstalled = Get-Command gcloud -ErrorAction SilentlyContinue
if (-not $gcloudInstalled) {
    Write-Host "❌ gcloud CLI não está instalado!" -ForegroundColor Red
    Write-Host "Por favor, instale em: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Verificar se Docker está instalado
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerInstalled -and -not $UseCloudBuild) {
    Write-Host "❌ Docker não está instalado!" -ForegroundColor Red
    Write-Host "Por favor, instale Docker Desktop ou use -UseCloudBuild" -ForegroundColor Yellow
    exit 1
}

# Verificar autenticação do gcloud
Write-Host "🔐 Verificando autenticação do Google Cloud..." -ForegroundColor Yellow
$authList = gcloud auth list --format="value(account)" 2>$null
if (-not $authList) {
    Write-Host "⚠️  Você não está autenticado no gcloud" -ForegroundColor Yellow
    Write-Host "Executando login..." -ForegroundColor Yellow
    gcloud auth login
}

# Configurar projeto
Write-Host "🎯 Configurando projeto $ProjectId..." -ForegroundColor Yellow
gcloud config set project $ProjectId

if ($UseCloudBuild) {
    # Usar Cloud Build
    Write-Host ""
    Write-Host "☁️  Usando Google Cloud Build..." -ForegroundColor Cyan
    Write-Host ""
    
    # Submeter build para Cloud Build
    gcloud builds submit `
        --config=cloudbuild.yaml `
        --substitutions=COMMIT_SHA=$TIMESTAMP `
        .
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Deploy concluído com sucesso via Cloud Build!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro no deploy via Cloud Build" -ForegroundColor Red
        exit 1
    }
} else {
    # Build local
    if (-not $SkipBuild) {
        Write-Host ""
        Write-Host "🔨 Construindo imagem Docker localmente..." -ForegroundColor Yellow
        docker build `
            --build-arg NEXT_PUBLIC_API_URL="$API_URL" `
            -f Dockerfile.cloudrun `
            -t $IMAGE_TAG `
            -t $IMAGE_TAG_VERSIONED `
            .
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Erro no build da imagem Docker" -ForegroundColor Red
            exit 1
        }
        Write-Host "✅ Build concluído!" -ForegroundColor Green
    }
    
    # Configurar Docker para usar gcloud como helper de autenticação
    Write-Host ""
    Write-Host "🔑 Configurando autenticação do Docker..." -ForegroundColor Yellow
    gcloud auth configure-docker
    
    # Push da imagem
    Write-Host ""
    Write-Host "📤 Enviando imagem para Google Container Registry..." -ForegroundColor Yellow
    docker push $IMAGE_TAG
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao enviar imagem" -ForegroundColor Red
        exit 1
    }
    
    docker push $IMAGE_TAG_VERSIONED
    Write-Host "✅ Imagem enviada!" -ForegroundColor Green
    
    # Deploy para Cloud Run
    Write-Host ""
    Write-Host "🚀 Fazendo deploy para Cloud Run..." -ForegroundColor Yellow
    gcloud run deploy $SERVICE_NAME `
        --image $IMAGE_TAG `
        --region $REGION `
        --platform managed `
        --allow-unauthenticated `
        --port 8080 `
        --memory 512Mi `
        --cpu 1 `
        --min-instances 0 `
        --max-instances 100 `
        --set-env-vars NODE_ENV=production
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Deploy concluído com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro no deploy para Cloud Run" -ForegroundColor Red
        exit 1
    }
}

# Obter URL do serviço
Write-Host ""
Write-Host "📋 Obtendo informações do serviço..." -ForegroundColor Yellow
$serviceUrl = gcloud run services describe $SERVICE_NAME `
    --region $REGION `
    --format "value(status.url)" `
    2>$null

if ($serviceUrl) {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "   🎉 DEPLOY CONCLUÍDO COM SUCESSO!  " -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 URL do Frontend: $serviceUrl" -ForegroundColor Cyan
    Write-Host "🔗 API Backend: $API_URL" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📝 Próximos passos:" -ForegroundColor Yellow
    Write-Host "  1. Acesse $serviceUrl para testar"
    Write-Host "  2. Verifique se a conexão com a API está funcionando"
    Write-Host "  3. Teste o login e navegação"
} else {
    Write-Host "⚠️  Não foi possível obter a URL do serviço" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "💡 Dica: Para ver os logs do serviço, execute:" -ForegroundColor Gray
Write-Host "  gcloud run services logs read $SERVICE_NAME --region $REGION" -ForegroundColor White