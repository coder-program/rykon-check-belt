#!/bin/bash

# Deploy script for Google Cloud Run
# Usage: ./deploy-to-cloudrun.sh [PROJECT_ID] [REGION]

set -e

# Default values
DEFAULT_PROJECT_ID="your-project-id"
DEFAULT_REGION="us-central1"

# Get project ID and region from arguments or use defaults
PROJECT_ID=${1:-$DEFAULT_PROJECT_ID}
REGION=${2:-$DEFAULT_REGION}

echo "🚀 Deploying to Google Cloud Run"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Authenticate with gcloud (if not already authenticated)
echo "🔐 Checking authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo "Please authenticate with Google Cloud:"
    gcloud auth login
fi

# Set the project
echo "📋 Setting project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and deploy backend
echo "🏗️  Building and deploying backend..."
cd backend

# Build Docker image
docker build -f Dockerfile.cloudrun -t gcr.io/$PROJECT_ID/teamcruz-backend:latest .

# Push to Container Registry
docker push gcr.io/$PROJECT_ID/teamcruz-backend:latest

# Deploy to Cloud Run
gcloud run deploy teamcruz-backend \
    --image gcr.io/$PROJECT_ID/teamcruz-backend:latest \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 8080 \
    --memory 1Gi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --set-env-vars "NODE_ENV=production,PORT=8080" \
    --timeout 300

# Get backend URL
BACKEND_URL=$(gcloud run services describe teamcruz-backend --platform managed --region $REGION --format 'value(status.url)')
echo "✅ Backend deployed at: $BACKEND_URL"

cd ..

# Build and deploy frontend
echo "🏗️  Building and deploying frontend..."
cd frontend

# Set environment variables for build
export NEXT_PUBLIC_API_URL=$BACKEND_URL

# Build Docker image
docker build -f Dockerfile.cloudrun -t gcr.io/$PROJECT_ID/teamcruz-frontend:latest .

# Push to Container Registry
docker push gcr.io/$PROJECT_ID/teamcruz-frontend:latest

# Deploy to Cloud Run
gcloud run deploy teamcruz-frontend \
    --image gcr.io/$PROJECT_ID/teamcruz-frontend:latest \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 8080 \
    --memory 1Gi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --set-env-vars "NODE_ENV=production,PORT=8080,NEXT_PUBLIC_API_URL=$BACKEND_URL" \
    --timeout 300

# Get frontend URL
FRONTEND_URL=$(gcloud run services describe teamcruz-frontend --platform managed --region $REGION --format 'value(status.url)')

cd ..

echo ""
echo "🎉 Deployment completed!"
echo "Backend URL:  $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""
echo "📝 Next steps:"
echo "1. Configure your database connection in Cloud Run environment variables"
echo "2. Set up Cloud SQL or external PostgreSQL database"
echo "3. Configure domain mapping (optional)"
echo "4. Set up monitoring and logging"