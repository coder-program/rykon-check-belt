# Deploy to Google Cloud Run - PowerShell version
# Usage: .\deploy-to-cloudrun.ps1 [PROJECT_ID] [REGION]

param(
    [string]$ProjectId = "teamcruz-controle-alunos",
    [string]$Region = "southamerica-east1"
)

Write-Host "🚀 Deploying to Google Cloud Run" -ForegroundColor Green
Write-Host "Project: $ProjectId" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan
Write-Host ""

# Check if gcloud is installed
try {
    $null = Get-Command gcloud -ErrorAction Stop
    Write-Host "✅ gcloud CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ gcloud CLI not found. Please install Google Cloud SDK" -ForegroundColor Red
    Write-Host "Download from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Check authentication
Write-Host "🔐 Checking authentication..." -ForegroundColor Yellow
$authStatus = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
if (-not $authStatus) {
    Write-Host "Please authenticate with Google Cloud:" -ForegroundColor Yellow
    gcloud auth login
}

# Set the project
Write-Host "📋 Setting project..." -ForegroundColor Yellow
gcloud config set project $ProjectId

# Enable required APIs
Write-Host "🔧 Enabling required APIs..." -ForegroundColor Yellow
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and deploy backend
Write-Host "🏗️  Building and deploying backend..." -ForegroundColor Blue
Set-Location backend

# Build Docker image
Write-Host "Building backend Docker image..." -ForegroundColor Cyan
docker build -f Dockerfile.cloudrun -t "gcr.io/$ProjectId/teamcruz-backend:latest" .

# Push to Container Registry
Write-Host "Pushing backend image..." -ForegroundColor Cyan
docker push "gcr.io/$ProjectId/teamcruz-backend:latest"

# Deploy to Cloud Run
Write-Host "Deploying backend to Cloud Run..." -ForegroundColor Cyan
gcloud run deploy teamcruz-backend `
    --image "gcr.io/$ProjectId/teamcruz-backend:latest" `
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

# Get backend URL
$backendUrl = gcloud run services describe teamcruz-backend --platform managed --region $Region --format 'value(status.url)'
Write-Host "✅ Backend deployed at: $backendUrl" -ForegroundColor Green

Set-Location ..

# Build and deploy frontend
Write-Host "🏗️  Building and deploying frontend..." -ForegroundColor Blue
Set-Location frontend

# Build Docker image
Write-Host "Building frontend Docker image..." -ForegroundColor Cyan
docker build -f Dockerfile.cloudrun -t "gcr.io/$ProjectId/teamcruz-frontend:latest" .

# Push to Container Registry
Write-Host "Pushing frontend image..." -ForegroundColor Cyan
docker push "gcr.io/$ProjectId/teamcruz-frontend:latest"

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
    --set-env-vars "NODE_ENV=production,PORT=8080,NEXT_PUBLIC_API_URL=$backendUrl" `
    --timeout 300

# Get frontend URL
$frontendUrl = gcloud run services describe teamcruz-frontend --platform managed --region $Region --format 'value(status.url)'

Set-Location ..

Write-Host ""
Write-Host "🎉 Deployment completed!" -ForegroundColor Green
Write-Host "Backend URL:  $backendUrl" -ForegroundColor Cyan
Write-Host "Frontend URL: $frontendUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "1. Configure your database connection in Cloud Run environment variables"
Write-Host "2. Set up Cloud SQL or external PostgreSQL database"
Write-Host "3. Configure domain mapping (optional)"
Write-Host "4. Set up monitoring and logging"