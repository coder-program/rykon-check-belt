# 📋 Deploy Manual - Passo a Passo

## 1️⃣ Preparar o código localmente

```bash
# Commit e push das alterações
git add .
git commit -m "sua mensagem"
git push origin main
```

## 2️⃣ Conectar ao servidor

```bash
ssh root@200.98.72.161
# Senha: (sua senha)
```

## 3️⃣ Atualizar o código no servidor

```bash
cd /var/www/teamcruz

# Fazer stash de alterações locais (se houver)
git stash

# Limpar arquivos não rastreados
git clean -fd

# Atualizar do repositório
git pull origin main
```

## 4️⃣ Deploy do BACKEND

```bash
cd /var/www/teamcruz/backend

# Instalar dependências (se houver novas)
npm install --legacy-peer-deps

# Compilar o TypeScript
npm run build

# Parar o serviço antigo
pm2 delete teamcruz-backend

# Iniciar o backend na porta 3000
PORT=3000 pm2 start dist/src/main.js --name teamcruz-backend

# Verificar se está rodando
pm2 status
pm2 logs teamcruz-backend --lines 20
```

## 5️⃣ Deploy do FRONTEND

```bash
cd /var/www/teamcruz/frontend

# Instalar dependências (se houver novas)
npm install --legacy-peer-deps

# Build do Next.js
npm run build

# Parar o serviço antigo
pm2 delete teamcruz-frontend

# Iniciar o frontend na porta 3001
PORT=3001 pm2 start npm --name teamcruz-frontend -- start

# Verificar se está rodando
pm2 status
pm2 logs teamcruz-frontend --lines 20
```

## 6️⃣ Salvar configuração do PM2

```bash
pm2 save
```

## 7️⃣ Verificar se tudo está funcionando

```bash
# Ver status dos serviços
pm2 status

# Ver quais portas estão em uso
netstat -tlnp | grep -E ':(3000|3001)'

# Testar backend localmente
curl http://localhost:3000/unidades/public/ativas

# Testar frontend localmente
curl -I http://localhost:3001

# Reiniciar nginx (se necessário)
systemctl restart nginx
```

## 8️⃣ Sair do servidor

```bash
exit
```

---

## 🎯 Comandos Rápidos (tudo de uma vez)

Se quiser fazer tudo em um único comando do seu computador:

```powershell
ssh root@200.98.72.161 "cd /var/www/teamcruz && git stash && git clean -fd && git pull origin main && cd backend && npm install --legacy-peer-deps && npm run build && pm2 delete teamcruz-backend ; PORT=3000 pm2 start dist/src/main.js --name teamcruz-backend && cd ../frontend && npm install --legacy-peer-deps && npm run build && pm2 delete teamcruz-frontend ; PORT=3001 pm2 start npm --name teamcruz-frontend -- start && pm2 save && pm2 status"
```

---

## ⚠️ Troubleshooting

### Se o backend não iniciar:

```bash
pm2 logs teamcruz-backend --lines 50
```

### Se o frontend não iniciar:

```bash
pm2 logs teamcruz-frontend --lines 50
```

### Se precisar matar processos na porta:

```bash
# Ver o que está usando a porta
lsof -i :3000
lsof -i :3001

# Matar processo
kill -9 [PID]
```

### Reiniciar tudo do zero:

```bash
pm2 delete all
cd /var/www/teamcruz/backend
PORT=3000 pm2 start dist/src/main.js --name teamcruz-backend
cd /var/www/teamcruz/frontend
PORT=3001 pm2 start npm --name teamcruz-frontend -- start
pm2 save
```

---

## 📌 Informações Importantes

- **Servidor**: 200.98.72.161
- **Diretório do projeto**: `/var/www/teamcruz`
- **Backend porta**: 3000
- **Frontend porta**: 3001
- **Nginx porta**: 80 (proxy reverso)
- **URL de acesso**: http://200.98.72.161

### Estrutura de diretórios:

```
/var/www/teamcruz/
├── backend/
│   ├── dist/src/main.js  (arquivo compilado)
│   └── ...
└── frontend/
    ├── .next/
    └── ...
```

### Comandos PM2 úteis:

```bash
pm2 status              # Ver status dos serviços
pm2 logs [nome]         # Ver logs de um serviço
pm2 restart [nome]      # Reiniciar um serviço
pm2 stop [nome]         # Parar um serviço
pm2 delete [nome]       # Deletar um serviço
pm2 save                # Salvar lista de processos
pm2 resurrect           # Restaurar processos salvos
```
