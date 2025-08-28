#!/bin/bash

# Script de Backup Automatizado
set -e

# Configurações
BACKUP_DIR="/backups/gestao-publica"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/$DATE"
RETENTION_DAYS=30

# Criar diretório de backup
mkdir -p $BACKUP_PATH

echo "🔄 Iniciando backup em $(date)"

# 1. Backup do banco de dados
echo "📦 Fazendo backup do banco PostgreSQL..."
docker exec gestao-postgres-prod pg_dump -U postgres -h localhost gestao_publica_prod | gzip > $BACKUP_PATH/database.sql.gz

# 2. Backup dos volumes Docker
echo "💾 Fazendo backup dos volumes..."
docker run --rm -v gestao-publica_postgres_data:/data -v $BACKUP_PATH:/backup alpine tar czf /backup/postgres_data.tar.gz -C /data .

# 3. Backup dos arquivos de configuração
echo "📁 Fazendo backup das configurações..."
tar czf $BACKUP_PATH/configs.tar.gz \
    docker-compose.prod.yml \
    nginx/ \
    backend/.env.production \
    keycloak/realm/

# 4. Backup dos logs
echo "📋 Fazendo backup dos logs..."
docker-compose -f docker-compose.prod.yml logs > $BACKUP_PATH/application.log 2>&1

# 5. Verificar integridade
echo "🔍 Verificando integridade dos backups..."
if [ -f "$BACKUP_PATH/database.sql.gz" ] && [ -f "$BACKUP_PATH/postgres_data.tar.gz" ]; then
    echo "✅ Backups criados com sucesso!"
    
    # Informações do backup
    echo "📊 Informações do backup:"
    echo "Data: $(date)"
    echo "Localização: $BACKUP_PATH"
    echo "Tamanho do banco: $(du -h $BACKUP_PATH/database.sql.gz | cut -f1)"
    echo "Tamanho dos volumes: $(du -h $BACKUP_PATH/postgres_data.tar.gz | cut -f1)"
    echo "Tamanho total: $(du -sh $BACKUP_PATH | cut -f1)"
else
    echo "❌ Erro na criação dos backups!"
    exit 1
fi

# 6. Limpeza de backups antigos
echo "🧹 Removendo backups antigos (mais de $RETENTION_DAYS dias)..."
find $BACKUP_DIR -type d -name "20*" -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true

# 7. Enviar notificação (opcional)
# curl -X POST -H 'Content-type: application/json' \
#     --data '{"text":"✅ Backup da Gestão Pública concluído com sucesso!"}' \
#     YOUR_SLACK_WEBHOOK_URL

echo "✅ Backup concluído com sucesso em $(date)"

# 8. Backup remoto (opcional - para cloud storage)
# aws s3 sync $BACKUP_PATH s3://gestao-publica-backups/$DATE/ --delete
