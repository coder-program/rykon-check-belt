#!/bin/bash

echo "🔧 Configurando PostgreSQL para aceitar conexões externas..."

# Backup dos arquivos originais
cp /etc/postgresql/14/main/postgresql.conf /etc/postgresql/14/main/postgresql.conf.backup
cp /etc/postgresql/14/main/pg_hba.conf /etc/postgresql/14/main/pg_hba.conf.backup

# Configurar listen_addresses
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/14/main/postgresql.conf

# Adicionar regra para aceitar conexões externas
echo "host    all             all             0.0.0.0/0               md5" >> /etc/postgresql/14/main/pg_hba.conf

# Reiniciar PostgreSQL
systemctl restart postgresql

# Verificar status
systemctl status postgresql --no-pager | head -15

echo ""
echo "✅ PostgreSQL configurado para aceitar conexões externas!"
echo ""
echo "📋 Credenciais para DBeaver:"
echo "   Host: 200.98.72.161"
echo "   Port: 5432"
echo "   Database: teamcruz_db"
echo "   Username: teamcruz_app"
echo "   Password: TeamCruz2024@Secure!"
