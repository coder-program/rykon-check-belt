# Contexto do Projeto Team Cruz

## 🏗️ Estrutura do Projeto

### Repositório
- **Nome**: rykon-check-belt
- **Caminho Local**: `C:\Users\Lenovo\Documents\project\rykon-check-belt`
- **Estrutura Principal**:
  ```
  rykon-check-belt/
  ├── frontend/         # Next.js frontend
  ├── backend/          # NestJS backend
  └── docs/            # Documentação
  ```

## 🌐 Google Cloud Platform

### Configurações do Projeto
- **ID do Projeto**: `teamcruz-controle-alunos`
- **Número do Projeto**: `943403834207`
- **Região**: `southamerica-east1`

### Serviços
#### Frontend
- **Nome do Serviço**: `teamcruz-frontend`
- **URL de Produção**: `https://teamcruz-frontend-m2olfa5bfa-uc.a.run.app`
- **Container Registry**: `gcr.io/teamcruz-controle-alunos/teamcruz-frontend`
- **Recursos**:
  - CPU: 1 core
  - Memória: 256Mi
  - Min Instâncias: 0
  - Max Instâncias: 10

#### Backend
- **Nome do Serviço**: `teamcruz-backend`
- **URL de Produção**: `https://teamcruz-backend-m2olfa5bfa-rj.a.run.app/api`
- **Container Registry**: `gcr.io/teamcruz-controle-alunos/teamcruz-backend`

## 🔧 Variáveis de Ambiente

### Frontend
```env
NEXT_PUBLIC_API_URL=https://teamcruz-backend-m2olfa5bfa-rj.a.run.app/api
NODE_ENV=production
```

### Backend
```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
```

## 📁 Arquivos Importantes

### Frontend
- **Dockerfile Principal**: `frontend/Dockerfile.cloudrun`
- **CI/CD**: `frontend/cloudbuild.yaml`
- **Scripts de Deploy**:
  - Windows: `frontend/deploy-production.ps1`
  - Linux/Mac: `frontend/build-production.sh`
- **Configuração Next.js**: `frontend/next.config.ts`

### Backend
- **Dockerfile**: `backend/Dockerfile`
- **Configuração NestJS**: `backend/nest-cli.json`

## 🚀 Comandos Principais

### Deploy Frontend
```powershell
# Deploy completo
cd frontend
.\deploy-production.ps1

# Apenas Cloud Build
gcloud builds submit --config=cloudbuild.yaml

# Ver logs
gcloud run services logs read teamcruz-frontend --region us-central1
```

### Verificação de Serviços
```powershell
# Status do frontend
gcloud run services describe teamcruz-frontend --region us-central1

# Status do backend
gcloud run services describe teamcruz-backend --region us-central1
```

## 🔑 Autenticação e Segurança

### Google Cloud
- **Conta de Serviço**: `techrykon@gmail.com`
- **Roles Necessários**:
  - Cloud Run Admin
  - Cloud Build Service Account
  - Storage Admin

### APIs Necessárias
- Cloud Run API
- Cloud Build API
- Container Registry API
- Cloud Storage API

## 📊 Monitoramento

### URLs de Monitoramento
- **Cloud Run Dashboard**: https://console.cloud.google.com/run?project=teamcruz-controle-alunos
- **Cloud Build History**: https://console.cloud.google.com/cloud-build/builds?project=teamcruz-controle-alunos
- **Logs**: https://console.cloud.google.com/logs/query?project=teamcruz-controle-alunos

### Métricas Importantes
- Latência de Requisições
- Uso de CPU/Memória
- Número de Instâncias
- Taxa de Erro

## 🚨 Troubleshooting

### Problemas Comuns
1. **Frontend chamando localhost**
   - Verificar `.env.production`
   - Verificar build args no Dockerfile
   - Limpar cache do navegador

2. **Deploy falha por quota**
   - Verificar limites no `cloudbuild.yaml`
   - Ajustar recursos no Cloud Run

3. **Erro de autenticação**
   - Reautenticar: `gcloud auth login`
   - Verificar projeto: `gcloud config set project teamcruz-controle-alunos`

## 📝 Notas Adicionais

### Padrões de Código
- **Frontend**: Next.js com TypeScript
- **Backend**: NestJS com TypeScript
- **Estilo**: TailwindCSS + DaisyUI

### Convenções de Branch
- `main`: Produção
- `develop`: Desenvolvimento
- `feature/*`: Novas funcionalidades
- `hotfix/*`: Correções urgentes

---

**Última Atualização**: 17/09/2025