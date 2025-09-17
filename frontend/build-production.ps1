# Script de build para produção (Windows PowerShell)
# Uso: .\build-production.ps1

Write-Host "🚀 Iniciando build de produção do frontend..." -ForegroundColor Green

# Configuração
$PROJECT_ID = "teamcruz-controle-alunos"
$SERVICE_NAME = "teamcruz-frontend"
$REGION = "us-central1"
$API_URL = "https://teamcruz-backend-m2olfa5bfa-rj.a.run.app/api"
$IMAGE_TAG = "gcr.io/$PROJECT_ID/${SERVICE_NAME}:latest"

Write-Host "`n📦 Configurações:" -ForegroundColor Cyan
Write-Host "  - Project ID: $PROJECT_ID"
Write-Host "  - Service: $SERVICE_NAME"
Write-Host "  - Region: $REGION"
Write-Host "  - API URL: $API_URL"
Write-Host ""

# Build da imagem Docker com a variável de ambiente
Write-Host "🔨 Construindo imagem Docker..." -ForegroundColor Yellow
docker build `
  --build-arg NEXT_PUBLIC_API_URL="$API_URL" `
  -f Dockerfile.cloudrun `
  -t $IMAGE_TAG `
  .

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Build concluído com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📤 Para fazer push da imagem:" -ForegroundColor Cyan
    Write-Host "  docker push $IMAGE_TAG" -ForegroundColor White
    Write-Host ""
    Write-Host "🚀 Para fazer deploy no Cloud Run:" -ForegroundColor Cyan
    Write-Host "  gcloud run deploy $SERVICE_NAME --image $IMAGE_TAG --region $REGION --platform managed --allow-unauthenticated" -ForegroundColor White
} else {
    Write-Host "❌ Erro no build. Verifique os logs acima." -ForegroundColor Red
    exit 1
}