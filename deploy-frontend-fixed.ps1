# Deploy Frontend to Google Cloud Run - São Paulo
# Usage: .\deploy-frontend.ps1

param(
    [string]$ProjectId = "teamcruz-controle-alunos",
    [string]$Region = "southamerica-east1"
)

Write-Host "🚀 Deploying Frontend to Google Cloud Run" -ForegroundColor Green
Write-Host "Project: $ProjectId" -ForegroundColor Cyan
Write-Host "Region: $Region (São Paulo)" -ForegroundColor Cyan
Write-Host ""

# Check if gcloud is installed
try {
    $null = Get-Command gcloud -ErrorAction Stop
    Write-Host "✅ gcloud CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ gcloud CLI not found. Please install Google Cloud SDK" -ForegroundColor Red
    exit 1
}

# Check if Docker is running
try {
    $null = docker version 2>$null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop" -ForegroundColor Red
    exit 1
}

# Set the project
Write-Host "📋 Setting project..." -ForegroundColor Yellow
gcloud config set project $ProjectId

# Enable required APIs
Write-Host "🔧 Enabling required APIs..." -ForegroundColor Yellow
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and deploy frontend
Write-Host "🏗️  Building and deploying frontend..." -ForegroundColor Blue
Set-Location frontend

# Build Docker image
Write-Host "Building frontend Docker image..." -ForegroundColor Cyan
docker build -f Dockerfile.cloudrun -t "gcr.io/$ProjectId/teamcruz-frontend:latest" .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed!" -ForegroundColor Red
    exit 1
}

# Push to Container Registry
Write-Host "Pushing frontend image..." -ForegroundColor Cyan
docker push "gcr.io/$ProjectId/teamcruz-frontend:latest"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker push failed!" -ForegroundColor Red
    exit 1
}

# Deploy to Cloud Run
Write-Host "Deploying frontend to Cloud Run..." -ForegroundColor Cyan
gcloud run deploy teamcruz-frontend `
    --image "gcr.io/$ProjectId/teamcruz-frontend:latest" `
    --platform managed `
    --region $Region `
    --allow-unauthenticated `
    --port 8080 `
    --memory 1Gi `
    --cpu 1 `
    --min-instances 0 `
    --max-instances 10 `
    --set-env-vars "NODE_ENV=production,PORT=8080" `
    --timeout 300

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Cloud Run deployment failed!" -ForegroundColor Red
    exit 1
}

# Get frontend URL
$frontendUrl = gcloud run services describe teamcruz-frontend --platform managed --region $Region --format 'value(status.url)'

Set-Location ..

Write-Host ""
Write-Host "🎉 Frontend deployment completed!" -ForegroundColor Green
Write-Host "Frontend URL: $frontendUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 You can access your application at: $frontendUrl" -ForegroundColor Yellow