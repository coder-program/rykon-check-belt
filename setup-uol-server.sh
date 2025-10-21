#!/bin/bash

###############################################################################
# Script de Configuração do Servidor UOL - TeamCruz
# Ubuntu Server 22.04
# Execute este script como root
###############################################################################

set -e  # Para em caso de erro

echo "======================================================================"
echo "🚀 Iniciando configuração do servidor TeamCruz"
echo "======================================================================"

# 1. Atualizar sistema
echo ""
echo "📦 Atualizando sistema..."
apt update && apt upgrade -y

# 2. Instalar dependências básicas
echo ""
echo "📦 Instalando dependências básicas..."
apt install -y curl wget git build-essential software-properties-common

# 3. Instalar Node.js 20.x (LTS)
echo ""
echo "📦 Instalando Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verificar instalação
echo "✅ Node.js versão: $(node --version)"
echo "✅ NPM versão: $(npm --version)"

# 4. Instalar PM2 globalmente
echo ""
echo "📦 Instalando PM2..."
npm install -g pm2

# Configurar PM2 para iniciar com o sistema
pm2 startup systemd -u root --hp /root
pm2 save

echo "✅ PM2 instalado: $(pm2 --version)"

# 5. Instalar PostgreSQL
echo ""
echo "📦 Instalando PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Iniciar PostgreSQL
systemctl start postgresql
systemctl enable postgresql

echo "✅ PostgreSQL instalado: $(psql --version)"

# 6. Instalar Nginx
echo ""
echo "📦 Instalando Nginx..."
apt install -y nginx

# Iniciar Nginx
systemctl start nginx
systemctl enable nginx

echo "✅ Nginx instalado: $(nginx -v)"

# 7. Instalar Certbot (para SSL gratuito - Let's Encrypt)
echo ""
echo "📦 Instalando Certbot para SSL..."
apt install -y certbot python3-certbot-nginx

# 8. Configurar Firewall (UFW)
echo ""
echo "🔥 Configurando Firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp  # Backend (temporário)
ufw --force enable

echo "✅ Firewall configurado"

# 9. Criar usuário PostgreSQL e banco de dados
echo ""
echo "🗄️  Configurando PostgreSQL..."

# Criar usuário e banco de dados
sudo -u postgres psql <<EOF
-- Criar usuário
CREATE USER teamcruz_app WITH PASSWORD 'TeamCruz2024@Secure!';

-- Criar banco de dados
CREATE DATABASE teamcruz_db OWNER teamcruz_app;

-- Conceder privilégios
GRANT ALL PRIVILEGES ON DATABASE teamcruz_db TO teamcruz_app;

-- Conectar ao banco e conceder permissões no schema
\c teamcruz_db
GRANT ALL ON SCHEMA public TO teamcruz_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO teamcruz_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO teamcruz_app;

-- Configurar permissões futuras
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO teamcruz_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO teamcruz_app;

\q
EOF

echo "✅ Banco de dados 'teamcruz_db' criado"
echo "✅ Usuário 'teamcruz_app' criado com senha 'TeamCruz2024@Secure!'"

# 10. Configurar PostgreSQL para aceitar conexões externas (opcional)
echo ""
echo "🗄️  Configurando PostgreSQL para aceitar conexões..."
PG_HBA="/etc/postgresql/14/main/pg_hba.conf"
PG_CONF="/etc/postgresql/14/main/postgresql.conf"

# Backup dos arquivos originais
cp $PG_HBA ${PG_HBA}.backup
cp $PG_CONF ${PG_CONF}.backup

# Adicionar regra para aceitar conexões locais
echo "host    all             all             127.0.0.1/32            md5" >> $PG_HBA

# Reiniciar PostgreSQL
systemctl restart postgresql

echo "✅ PostgreSQL configurado"

# 11. Criar diretórios para a aplicação
echo ""
echo "📁 Criando diretórios da aplicação..."
mkdir -p /var/www/teamcruz/backend
mkdir -p /var/www/teamcruz/frontend
chown -R root:root /var/www/teamcruz

echo "✅ Diretórios criados em /var/www/teamcruz"

# 12. Configurar Git (se for usar deploy via Git)
echo ""
echo "🔧 Configurando Git..."
git config --global user.name "TeamCruz Deploy"
git config --global user.email "deploy@teamcruz.com"

# 13. Informações finais
echo ""
echo "======================================================================"
echo "✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
echo "======================================================================"
echo ""
echo "📋 INFORMAÇÕES DO SISTEMA:"
echo "----------------------------------------"
echo "Sistema Operacional: Ubuntu 22.04"
echo "Node.js: $(node --version)"
echo "NPM: $(npm --version)"
echo "PM2: $(pm2 --version)"
echo "PostgreSQL: $(psql --version | head -n 1)"
echo "Nginx: $(nginx -v 2>&1)"
echo ""
echo "📋 CREDENCIAIS DO BANCO DE DADOS:"
echo "----------------------------------------"
echo "Host: localhost"
echo "Porta: 5432"
echo "Database: teamcruz_db"
echo "Usuário: teamcruz_app"
echo "Senha: TeamCruz2024@Secure!"
echo ""
echo "📋 DIRETÓRIOS:"
echo "----------------------------------------"
echo "Backend: /var/www/teamcruz/backend"
echo "Frontend: /var/www/teamcruz/frontend"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "----------------------------------------"
echo "1. Fazer upload/clone do código da aplicação"
echo "2. Configurar variáveis de ambiente (.env)"
echo "3. Instalar dependências (npm install)"
echo "4. Executar migrations do banco de dados"
echo "5. Iniciar aplicações com PM2"
echo "6. Configurar Nginx como reverse proxy"
echo "7. Configurar SSL com Certbot (se tiver domínio)"
echo ""
echo "======================================================================"
