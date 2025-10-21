# 🚀 Deploy Manual - Comandos Passo a Passo

## Execute estes comandos no PowerShell

---

## 📤 ETAPA 1: Upload do Backend

```powershell
# Upload dos arquivos do backend
scp -r C:\Users\Lenovo\Documents\project\rykon-check-belt\backend\* root@200.98.72.161:/var/www/teamcruz/backend/
```

⏳ Aguarde o upload terminar... (pode demorar alguns minutos)

---

## 📊 ETAPA 2: Executar Migration no Servidor

```powershell
# Conectar ao servidor e executar migration
ssh root@200.98.72.161
```

Dentro do servidor SSH, execute:

```bash
cd /var/www/teamcruz/backend

# Executar migration da tabela recepcionista_unidades
sudo -u postgres psql -d teamcruz_db -f create-recepcionista-unidades-table.sql

# Verificar se a tabela foi criada
sudo -u postgres psql -d teamcruz_db -c "\d teamcruz.recepcionista_unidades"

# Verificar dados da tabela
sudo -u postgres psql -d teamcruz_db -c "SELECT * FROM teamcruz.recepcionista_unidades LIMIT 5;"
```

---

## 🔧 ETAPA 3: Deploy do Backend

Ainda no SSH do servidor:

```bash
cd /var/www/teamcruz/backend

# Instalar dependências
npm install

# Compilar TypeScript
npm run build

# Reiniciar com PM2
pm2 delete teamcruz-backend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# Ver status e logs
pm2 status
pm2 logs teamcruz-backend --lines 30
```

✅ Backend deployado!

**Sair do SSH:**

```bash
exit
```

---

## 📤 ETAPA 4: Upload do Frontend

De volta ao PowerShell:

```powershell
# Upload dos arquivos do frontend
scp -r C:\Users\Lenovo\Documents\project\rykon-check-belt\frontend\* root@200.98.72.161:/var/www/teamcruz/frontend/
```

⏳ Aguarde o upload terminar... (pode demorar alguns minutos)

---

## 🔧 ETAPA 5: Deploy do Frontend

```powershell
# Conectar ao servidor novamente
ssh root@200.98.72.161
```

Dentro do servidor SSH:

```bash
cd /var/www/teamcruz/frontend

# Instalar dependências
npm install

# Build do Next.js
npm run build

# Reiniciar com PM2
pm2 delete teamcruz-frontend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# Ver status e logs
pm2 status
pm2 logs teamcruz-frontend --lines 30
```

✅ Frontend deployado!

---

## 🧪 ETAPA 6: Testar Aplicação

Ainda no SSH:

```bash
# Testar backend
curl http://localhost:3000/api/health

# Testar frontend
curl -I http://localhost:3001

# Ver status final
pm2 status

# Ver logs em tempo real (Ctrl+C para sair)
pm2 logs
```

**Sair do SSH:**

```bash
exit
```

---

## 🌐 Acessar Aplicação

Abra no navegador:

- **Frontend:** http://200.98.72.161
- **API:** http://200.98.72.161/api/health
- **Backend direto:** http://200.98.72.161:3000/api/health

---

## 📋 Comandos Úteis para Gerenciar

```powershell
# Ver logs remotamente
ssh root@200.98.72.161 "pm2 logs"

# Ver status
ssh root@200.98.72.161 "pm2 status"

# Reiniciar backend
ssh root@200.98.72.161 "pm2 restart teamcruz-backend"

# Reiniciar frontend
ssh root@200.98.72.161 "pm2 restart teamcruz-frontend"

# Reiniciar tudo
ssh root@200.98.72.161 "pm2 restart all"

# Ver logs do backend
ssh root@200.98.72.161 "pm2 logs teamcruz-backend --lines 50"

# Ver logs do frontend
ssh root@200.98.72.161 "pm2 logs teamcruz-frontend --lines 50"
```

---

## 🆘 Troubleshooting

### Backend não inicia:

```bash
cd /var/www/teamcruz/backend
cat logs/err.log
pm2 logs teamcruz-backend --err --lines 50
```

### Frontend não inicia:

```bash
cd /var/www/teamcruz/frontend
cat logs/err.log
pm2 logs teamcruz-frontend --err --lines 50
```

### Migration falhou:

```bash
sudo -u postgres psql -d teamcruz_db

# Dentro do psql:
\dt teamcruz.*
\d teamcruz.recepcionista_unidades
\q
```

### Nginx não está servindo:

```bash
nginx -t
systemctl status nginx
cat /var/log/nginx/teamcruz-error.log
```

---

## ✅ Checklist Final

Após o deploy, verifique:

- [ ] Backend responde em http://200.98.72.161/api/health
- [ ] Frontend carrega em http://200.98.72.161
- [ ] Login funciona
- [ ] Dashboard carrega corretamente
- [ ] Tabela recepcionista_unidades existe no banco
- [ ] PM2 mostra ambos serviços rodando
- [ ] Logs não mostram erros críticos

---

## 🎯 Próximos Passos Após Deploy

1. **Testar onboarding de recepcionista:**

   - Criar usuário com perfil recepcionista
   - Fazer login
   - Verificar redirecionamento para /onboarding/recepcionista
   - Completar cadastro com seleção de unidades

2. **Verificar vínculos criados:**

   ```sql
   SELECT * FROM teamcruz.recepcionista_unidades;
   ```

3. **Testar filtros de dados:**
   - Login como recepcionista
   - Verificar se vê apenas alunos das unidades vinculadas
   - Testar check-in de presença

---

## 📝 Notas Importantes

- **Backups:** O script cria backups automáticos antes de sobrescrever
- **Logs:** Sempre verifique os logs após deploy (`pm2 logs`)
- **Permissões:** Se houver erro de permissão, execute `chown -R root:root /var/www/teamcruz`
- **Memória:** Se PM2 reiniciar constantemente, pode ser falta de memória (aumente no ecosystem.config.js)

---

**🚀 Deploy pronto! Boa sorte!**
