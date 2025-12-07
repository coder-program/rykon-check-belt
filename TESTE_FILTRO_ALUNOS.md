# Teste do Filtro de Alunos - Franqueado

## ⚠️ IMPORTANTE: PASSOS OBRIGATÓRIOS

### 1. Limpar Cache e Token

```bash
# No navegador:
1. Abra DevTools (F12)
2. Application tab > Storage > Clear site data
3. OU simplesmente: Ctrl+Shift+Delete e limpe tudo
```

### 2. Fazer Logout e Login Novamente

```
1. Clique em Logout
2. Login com franqueado (ex: franqueado.rj@teamcruz.com.br)
3. AGUARDE o login completar
```

### 3. Verificar no Console do Navegador (F12)

Ao acessar `/alunos`, você deve ver logs assim:

```
API Call - Path: /alunos?page=1&pageSize=20
Authorization: Bearer eyJhbGc... (deve aparecer o token)
```

### 4. Verificar no Console do Backend

No terminal do backend, deve aparecer logs assim:

```
🔍 [AlunosService.list] USER RECEBIDO: {
  "id": "uuid-do-usuario",
  "email": "franqueado.rj@teamcruz.com.br",
  "perfis": [
    { "id": "uuid", "nome": "FRANQUEADO", ... }
  ]
}

🔍 [isFranqueado] Verificando perfis: [...]
🔍 [isFranqueado] Perfil: FRANQUEADO -> É franqueado? true
🔍 [isFranqueado] RESULTADO FINAL: true

🔒 [AlunosService.list] Usuário é FRANQUEADO, aplicando filtro...
🔒 [AlunosService.list] Franqueado ID: uuid-do-franqueado
✅ [AlunosService.list] FILTRO APLICADO para franqueado: uuid-do-franqueado
```

## 🎯 Resultados Esperados

### Login como Franqueado RJ

| Item                   | Valor Esperado           |
| ---------------------- | ------------------------ |
| **Total de Alunos**    | ~240 (NÃO 390+)          |
| **Unidades no Filtro** | Apenas 3 unidades do RJ  |
| **Alunos Visíveis**    | Apenas das 3 unidades RJ |

### Login como Master

| Item                   | Valor Esperado    |
| ---------------------- | ----------------- |
| **Total de Alunos**    | 390+ (TODOS)      |
| **Unidades no Filtro** | TODAS as unidades |
| **Alunos Visíveis**    | TODOS os alunos   |

## 🔍 Debug

### Se ainda mostrar TODOS os alunos:

1. **Verifique se o token está sendo enviado:**

   ```
   DevTools > Network > Headers
   Deve ter: Authorization: Bearer ...
   ```

2. **Verifique os logs do backend:**

   ```bash
   # Deve aparecer:
   🔍 [AlunosService.list] USER RECEBIDO: {...}
   🔍 [isFranqueado] RESULTADO FINAL: true
   ✅ [AlunosService.list] FILTRO APLICADO
   ```

3. **Se não aparecer "FILTRO APLICADO":**

   - O token não está sendo enviado OU
   - O usuário não tem perfil FRANQUEADO OU
   - O usuário também tem perfil MASTER

4. **Se aparecer "SEM FILTRO":**
   ```
   ⚠️ [AlunosService.list] SEM FILTRO - Usuário não é franqueado ou é master
   ```
   Significa que o `isFranqueado()` retornou `false` ou `isMaster()` retornou `true`.

## 🐛 Troubleshooting

### Erro: "perfis is not iterable"

**Causa:** Token antigo, logout/login resolve

### Erro: "cannot read property 'nome' of undefined"

**Causa:** Perfis vindo como string ao invés de objeto

**Solução:** Já corrigida no código, fazer logout/login

### Alunos ainda mostram todos

**Possíveis causas:**

1.  Não fez logout/login após correção
2.  Cache do navegador não foi limpo
3.  Token JWT expirado ou inválido
4.  Backend não está rodando a versão atualizada
5.  Usuário tem perfil MASTER além de FRANQUEADO

**Soluções:**

```bash
# 1. Reiniciar backend
cd backend
npm run start:dev

# 2. Limpar cache navegador
Ctrl+Shift+Delete > Clear All

# 3. Logout e Login novamente

# 4. Verificar perfis do usuário no banco:
SELECT u.email, p.nome
FROM teamcruz.usuarios u
JOIN teamcruz.usuario_perfis up ON u.id = up.usuario_id
JOIN teamcruz.perfis p ON up.perfil_id = p.id
WHERE u.email = 'franqueado.rj@teamcruz.com.br';

# Deve retornar APENAS:
# email: franqueado.rj@teamcruz.com.br
# nome: FRANQUEADO
```

## ✅ Checklist Final

- [ ] Backend reiniciado com código atualizado
- [ ] Frontend recarregado (Ctrl+F5)
- [ ] Logout executado
- [ ] Cache do navegador limpo
- [ ] Login realizado novamente como franqueado
- [ ] DevTools aberto (F12) para ver logs
- [ ] Terminal do backend visível para ver logs
- [ ] Página /alunos acessada
- [ ] Logs aparecem no console do backend
- [ ] Total de alunos é ~240 (não 390+)

---

**Data:** 16/10/2025
**Correções Aplicadas:**

- ✅ `{ auth: true }` adicionado em todas as chamadas API
- ✅ `getStats()` agora recebe user context
- ✅ `isFranqueado()` e `isMaster()` corrigidos para aceitar objetos
- ✅ Logs de debug adicionados
- ✅ `validateToken()` atualizado com log
