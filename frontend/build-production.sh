#!/bin/bash

# Script de build para produção
# Uso: ./build-production.sh

echo "🚀 Iniciando build de produção do frontend..."

# Configuração
PROJECT_ID="teamcruz-controle-alunos"
SERVICE_NAME="teamcruz-frontend"
REGION="us-central1"
API_URL="https://teamcruz-backend-m2olfa5bfa-rj.a.run.app/api"
IMAGE_TAG="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

echo "📦 Configurações:"
echo "  - Project ID: ${PROJECT_ID}"
echo "  - Service: ${SERVICE_NAME}"
echo "  - Region: ${REGION}"
echo "  - API URL: ${API_URL}"
echo ""

# Build da imagem Docker com a variável de ambiente
echo "🔨 Construindo imagem Docker..."
docker build \
  --build-arg NEXT_PUBLIC_API_URL="${API_URL}" \
  -f Dockerfile.cloudrun \
  -t ${IMAGE_TAG} \
  .

if [ $? -eq 0 ]; then
    echo "✅ Build concluído com sucesso!"
    echo ""
    echo "📤 Para fazer push da imagem:"
    echo "  docker push ${IMAGE_TAG}"
    echo ""
    echo "🚀 Para fazer deploy no Cloud Run:"
    echo "  gcloud run deploy ${SERVICE_NAME} --image ${IMAGE_TAG} --region ${REGION}"
else
    echo "❌ Erro no build. Verifique os logs acima."
    exit 1
fi