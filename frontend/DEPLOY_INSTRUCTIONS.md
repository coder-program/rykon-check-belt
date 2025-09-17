# 🚀 Instruções de Deploy - Frontend Team Cruz

## 📋 Pré-requisitos

### Ferramentas Necessárias
- **Docker Desktop** (para build local)
- **Google Cloud SDK** (gcloud CLI)
- **Node.js 20+** (para desenvolvimento)
- **Git** (controle de versão)

### Configuração Inicial
1. Instalar Google Cloud SDK: https://cloud.google.com/sdk/docs/install
2. Instalar Docker Desktop: https://www.docker.com/products/docker-desktop
3. Autenticar no Google Cloud:
   ```bash
   gcloud auth login
   gcloud config set project teamcruz-backend
   ```

## 🔧 Variáveis de Ambiente

### Produção
O frontend precisa da variável `NEXT_PUBLIC_API_URL` configurada em tempo de build:
```
NEXT_PUBLIC_API_URL=https://teamcruz-backend-m2olfa5bfa-rj.a.run.app/api
```

### Arquivos de Configuração
- `.env` - Desenvolvimento local
- `.env.production` - Variáveis de produção
- `.env.local` - Sobrescreve as outras (não commitado)

## 🏗️ Build Local

### Windows PowerShell
```powershell
# Build simples
.\build-production.ps1

# Build manual com Docker
docker build \
  --build-arg NEXT_PUBLIC_API_URL="https://teamcruz-backend-m2olfa5bfa-rj.a.run.app/api" \
  -f Dockerfile.cloudrun \
  -t gcr.io/teamcruz-backend/teamcruz-frontend:latest \
  .
```

### Linux/Mac
```bash
# Tornar executável
chmod +x build-production.sh

# Executar build
./build-production.sh
```

## 🚀 Deploy para Produção

### Método 1: Deploy Automatizado (Recomendado)

#### Windows PowerShell
```powershell
# Deploy completo (build + push + deploy)
.\deploy-production.ps1

# Deploy usando Cloud Build (sem Docker local)
.\deploy-production.ps1 -UseCloudBuild

# Deploy sem rebuild (usa imagem existente)
.\deploy-production.ps1 -SkipBuild

# Deploy para projeto específico
.\deploy-production.ps1 -ProjectId "meu-projeto"
```

### Método 2: Deploy Manual Passo a Passo

```bash
# 1. Build da imagem
docker build \
  --build-arg NEXT_PUBLIC_API_URL="https://teamcruz-backend-m2olfa5bfa-rj.a.run.app/api" \
  -f Dockerfile.cloudrun \
  -t gcr.io/teamcruz-backend/teamcruz-frontend:latest \
  .

# 2. Configurar autenticação Docker
gcloud auth configure-docker

# 3. Push da imagem
docker push gcr.io/teamcruz-backend/teamcruz-frontend:latest

# 4. Deploy no Cloud Run
gcloud run deploy teamcruz-frontend \
  --image gcr.io/teamcruz-backend/teamcruz-frontend:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 100 \
  --set-env-vars NODE_ENV=production
```

### Método 3: CI/CD com Cloud Build

```bash
# Submeter build para Cloud Build (usa cloudbuild.yaml)
gcloud builds submit --config=cloudbuild.yaml .

# Ou configurar trigger automático no GitHub
gcloud builds triggers create github \
  --repo-name=rykon-check-belt \
  --repo-owner=seu-usuario \
  --branch-pattern="^main$" \
  --build-config=frontend/cloudbuild.yaml
```

## 🔍 Verificação e Monitoramento

### Verificar Status do Serviço
```bash
# Listar serviços
gcloud run services list --region us-central1

# Detalhes do serviço
gcloud run services describe teamcruz-frontend --region us-central1

# Obter URL do serviço
gcloud run services describe teamcruz-frontend \
  --region us-central1 \
  --format "value(status.url)"
```

### Logs e Debugging
```bash
# Ver logs em tempo real
gcloud run services logs tail teamcruz-frontend --region us-central1

# Últimos 50 logs
gcloud run services logs read teamcruz-frontend --region us-central1 --limit 50

# Logs com filtro
gcloud run services logs read teamcruz-frontend \
  --region us-central1 \
  --filter "severity>=ERROR"
```

### Métricas e Performance
```bash
# Ver métricas do serviço
gcloud monitoring metrics-descriptors list \
  --filter="metric.type:run.googleapis.com"

# Dashboard no Console
# https://console.cloud.google.com/run/detail/us-central1/teamcruz-frontend/metrics
```

## 🔄 Rollback

Se houver problemas após o deploy:

```bash
# Listar revisões
gcloud run revisions list \
  --service teamcruz-frontend \
  --region us-central1

# Rollback para revisão anterior
gcloud run services update-traffic teamcruz-frontend \
  --region us-central1 \
  --to-revisions REVISION_NAME=100
```

## ⚠️ Troubleshooting

### Problema: Frontend ainda chama localhost
**Solução:**
1. Verificar se a variável foi configurada no build:
   ```bash
   docker inspect gcr.io/teamcruz-backend/teamcruz-frontend:latest | grep NEXT_PUBLIC
   ```
2. Limpar cache do navegador
3. Verificar Network tab no DevTools

### Problema: Build falha
**Soluções:**
1. Verificar logs do Docker: `docker logs container_id`
2. Aumentar memória do Docker Desktop
3. Limpar cache: `docker system prune -a`

### Problema: Deploy falha no Cloud Run
**Soluções:**
1. Verificar quota do projeto
2. Verificar permissões IAM
3. Verificar logs: `gcloud builds log LAST`

## 📊 Custos Estimados

### Google Cloud Run
- **Requests**: $0.40 por milhão de requests
- **CPU**: $0.024 por vCPU-hora
- **Memória**: $0.0025 por GB-hora
- **Rede**: $0.085 por GB (egress)

### Estimativa Mensal (1000 usuários ativos)
- ~10M requests: $4.00
- CPU (0.5 vCPU média): ~$8.64
- Memória (512MB): ~$0.90
- Rede (50GB): $4.25
- **Total estimado**: ~$18/mês

## 🔐 Segurança

### Checklist de Segurança
- [ ] Variáveis sensíveis não estão no código
- [ ] HTTPS habilitado (automático no Cloud Run)
- [ ] CORS configurado corretamente
- [ ] Rate limiting configurado
- [ ] Logs não contêm dados sensíveis

### Boas Práticas
1. Usar Secret Manager para chaves sensíveis
2. Habilitar Cloud Armor para proteção DDoS
3. Configurar alertas de segurança
4. Fazer auditorias regulares

## 📞 Suporte

### Links Úteis
- [Console Cloud Run](https://console.cloud.google.com/run)
- [Documentação Next.js](https://nextjs.org/docs)
- [Documentação Cloud Run](https://cloud.google.com/run/docs)

### Contatos
- DevOps: devops@teamcruz.com.br
- Suporte: suporte@teamcruz.com.br

---

**Última atualização**: 17/09/2025
**Versão**: 1.0.0