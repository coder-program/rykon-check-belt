# 🚀 Instruções de Instalação - Servidor UOL

## 📋 Pré-requisitos

- Servidor UOL com Ubuntu 22.04
- Acesso SSH como root
- IP do servidor: `200.98.72.161`

---

## 🔧 Passo 1: Conectar ao Servidor via SSH

### No PowerShell do Windows:

```powershell
ssh root@200.98.72.161
```

Quando pedir a senha, digite a senha do usuário root.

---

## 📦 Passo 2: Executar Script de Instalação Automatizado

### Opção A: Copiar e Colar o Script Completo (RECOMENDADO)

1. Abra o arquivo `setup-uol-server.sh` no seu computador
2. Copie TODO o conteúdo do arquivo
3. No terminal SSH conectado ao servidor, execute:

```bash
# Criar o arquivo do script
cat > setup-server.sh << 'ENDOFSCRIPT'
# [Cole aqui todo o conteúdo do arquivo setup-uol-server.sh]
ENDOFSCRIPT

# Dar permissão de execução
chmod +x setup-server.sh

# Executar o script
./setup-server.sh
```

### Opção B: Comandos Manuais (se preferir executar um por um)

Se preferir executar manualmente, siga os comandos abaixo na ordem:

#### 1. Atualizar o Sistema

```bash
apt update && apt upgrade -y
```

#### 2. Instalar Dependências Básicas

```bash
apt install -y curl wget git build-essential software-properties-common
```

#### 3. Instalar Node.js 20.x

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version
npm --version
```

#### 4. Instalar PM2

```bash
npm install -g pm2
pm2 startup systemd -u root --hp /root
pm2 save
```

#### 5. Instalar PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
```

#### 6. Criar Banco de Dados e Usuário

```bash
sudo -u postgres psql
```

Dentro do PostgreSQL, execute:

```sql
CREATE USER teamcruz_app WITH PASSWORD 'TeamCruz2024@Secure!';
CREATE DATABASE teamcruz_db OWNER teamcruz_app;
GRANT ALL PRIVILEGES ON DATABASE teamcruz_db TO teamcruz_app;

\c teamcruz_db
GRANT ALL ON SCHEMA public TO teamcruz_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO teamcruz_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO teamcruz_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO teamcruz_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO teamcruz_app;
\q
```

#### 7. Instalar Nginx

```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

#### 8. Instalar Certbot (para SSL)

```bash
apt install -y certbot python3-certbot-nginx
```

#### 9. Configurar Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
ufw --force enable
```

#### 10. Criar Diretórios da Aplicação

```bash
mkdir -p /var/www/teamcruz/backend
mkdir -p /var/www/teamcruz/frontend
```

---

## ✅ Verificar Instalações

Após executar o script ou comandos manuais, verifique se tudo foi instalado:

```bash
# Verificar Node.js
node --version  # Deve mostrar v20.x.x

# Verificar NPM
npm --version

# Verificar PM2
pm2 --version

# Verificar PostgreSQL
psql --version

# Verificar Nginx
nginx -v

# Verificar status dos serviços
systemctl status postgresql
systemctl status nginx
```

---

## 📝 Informações Importantes

### Credenciais do Banco de Dados:
```
Host: localhost
Porta: 5432
Database: teamcruz_db
Usuário: teamcruz_app
Senha: TeamCruz2024@Secure!
```

### Diretórios da Aplicação:
```
Backend: /var/www/teamcruz/backend
Frontend: /var/www/teamcruz/frontend
```

---

## 🎯 Próximos Passos

Após a instalação, você estará pronto para:

1. ✅ Fazer upload do código (via Git ou SCP)
2. ✅ Configurar variáveis de ambiente
3. ✅ Instalar dependências do projeto
4. ✅ Executar migrations
5. ✅ Iniciar as aplicações com PM2
6. ✅ Configurar Nginx como proxy reverso

---

## 🆘 Troubleshooting

### Se algum comando falhar:

1. Verifique se está logado como root: `whoami`
2. Verifique a conexão com a internet: `ping -c 4 google.com`
3. Limpe o cache do apt: `apt clean && apt update`

### Se o PostgreSQL não iniciar:

```bash
systemctl status postgresql
journalctl -u postgresql -n 50
```

### Se o Nginx não iniciar:

```bash
systemctl status nginx
nginx -t  # Testa a configuração
```

---

## 📞 Suporte

Caso encontre algum problema durante a instalação, me envie:
- A mensagem de erro completa
- O comando que estava executando
- A saída do comando: `uname -a`
