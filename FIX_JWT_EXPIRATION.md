# 🔐 Fix: JWT Expiração Muito Rápida

## 📋 Problema Identificado

Os tokens JWT estavam expirando muito rapidamente devido a uma **inconsistência nas configurações**:

### Configurações Conflitantes:

1. **`auth.module.ts`**: JWT configurado para `24h`
2. **`auth.service.ts`**: Access token sendo criado com `ACCESS_TTL_SEC = 30 minutos`
3. **Arquivos .env**: Tinham `JWT_EXPIRES_IN=24h` mas não estava sendo usado corretamente

## ✅ Solução Aplicada

### 1. **Corrigido auth.service.ts**

```typescript
// ANTES:
private ACCESS_TTL_SEC = 60 * 30; // 30 min

access_token: this.jwtService.sign(payload, {
  expiresIn: this.ACCESS_TTL_SEC,
})

// DEPOIS:
private ACCESS_TTL_SEC = 60 * 60 * 8; // 8 horas

access_token: this.jwtService.sign(payload) // Usa configuração do módulo
```

### 2. **Atualizado auth.module.ts**

```typescript
// ANTES:
signOptions: {
  expiresIn: "24h";
}

// DEPOIS:
signOptions: {
  expiresIn: configService.get<string>("JWT_EXPIRES_IN") || "8h";
}
```

### 3. **Arquivos de Configuração Atualizados**

Todos os arquivos foram atualizados para **8 horas**:

- ✅ `backend/.env`
- ✅ `backend/.env.uol` (produção UOL)
- ✅ `backend/.env.example`
- ✅ `deploy-backend-uol.sh`
- ✅ `backend/docker-compose.yml`

## 🎯 Resultado

- **Tempo de Expiração**: Agora os tokens JWT expiram em **8 horas** ao invés de 30 minutos
- **Consistência**: Todas as configurações agora usam a mesma variável `JWT_EXPIRES_IN`
- **Flexibilidade**: Tempo pode ser ajustado via variável de ambiente sem alterar código

## 🚀 Deploy Necessário

Para aplicar as mudanças em produção:

```bash
# 1. No servidor UOL, reiniciar o backend
pm2 restart backend

# 2. Usuários precisarão fazer logout/login para obter novos tokens
```

## ⚠️ Observações

- Usuários com tokens antigos (30min) continuarão recebendo erro até fazer novo login
- Após o deploy, todos os novos logins terão tokens de 8 horas
- Se necessário, o tempo pode ser aumentado ainda mais alterando `JWT_EXPIRES_IN` no `.env`

---

**Data**: 2025-10-22
**Status**: ✅ Corrigido
