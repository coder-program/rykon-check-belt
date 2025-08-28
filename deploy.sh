#!/bin/bash

# Script de Deploy para Produção - Gestão Pública
set -e

echo "🚀 Iniciando deploy da aplicação de Gestão Pública..."

# Variáveis
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
DOMAIN=${DOMAIN:-"seudominio.gov.br"}

# Criar diretório de backup
mkdir -p $BACKUP_DIR

# 1. Backup do banco de dados
echo "📦 Fazendo backup do banco de dados..."
docker exec gestao-postgres-prod pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/database_backup.sql

# 2. Parar aplicação
echo "⏹️  Parando aplicação atual..."
docker-compose -f docker-compose.prod.yml down --remove-orphans

# 3. Backup dos volumes
echo "💾 Fazendo backup dos volumes..."
docker run --rm -v gestao-publica_postgres_data:/data -v $(pwd)/$BACKUP_DIR:/backup alpine tar czf /backup/postgres_data.tar.gz -C /data .

# 4. Pull das últimas mudanças
echo "🔄 Atualizando código..."
git pull origin main

# 5. Build das imagens
echo "🔨 Construindo imagens..."
docker-compose -f docker-compose.prod.yml build --no-cache

# 6. Verificar certificado SSL
echo "🔒 Verificando certificado SSL..."
if [ ! -f "./nginx/ssl/certificate.crt" ]; then
    echo "❌ Certificado SSL não encontrado!"
    echo "Execute: certbot certonly --webroot -w /var/www/html -d $DOMAIN"
    exit 1
fi

# 7. Iniciar aplicação
echo "🚀 Iniciando aplicação..."
docker-compose -f docker-compose.prod.yml up -d

# 8. Aguardar serviços ficarem prontos
echo "⏳ Aguardando serviços ficarem prontos..."
sleep 30

# 9. Health check
echo "🏥 Verificando saúde da aplicação..."
for i in {1..10}; do
    if curl -f https://$DOMAIN/api/health; then
        echo "✅ Aplicação está funcionando!"
        break
    else
        echo "❌ Tentativa $i falhou, tentando novamente em 10s..."
        sleep 10
    fi
done

# 10. Limpeza
echo "🧹 Limpando imagens antigas..."
docker image prune -f

echo "✅ Deploy concluído com sucesso!"
echo "🌐 Aplicação disponível em: https://$DOMAIN"

# 11. Logs finais
echo "📋 Últimos logs:"
docker-compose -f docker-compose.prod.yml logs --tail=20
