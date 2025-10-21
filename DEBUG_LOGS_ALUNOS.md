# 🔍 DEBUG - Filtro de Alunos por Franqueado

## ⚡ COMO TESTAR AGORA

### 1️⃣ Verificar Terminal do Backend

O backend vai mostrar LOGS COMPLETOS assim:

```
═══════════════════════════════════════════════════
🔍 [AlunosService.list] INÍCIO
🔍 [AlunosService.list] USER RECEBIDO: SIM
🔍 [AlunosService.list] User ID: abc-123-def
🔍 [AlunosService.list] User Email: franqueado.rj@teamcruz.com.br
🔍 [AlunosService.list] User Perfis: [
  { "id": "...", "nome": "FRANQUEADO", ... }
]
═══════════════════════════════════════════════════

🔍 [isFranqueado] Perfis originais: [...]
🔍 [isFranqueado] Perfis processados: ["franqueado"]
🔍 [isFranqueado] RESULTADO FINAL: true

🔍 [isMaster] Perfis processados: ["franqueado"]
🔍 [isMaster] RESULTADO: false

🔒 [AlunosService.list] Usuário é FRANQUEADO, aplicando filtro...

🔍 [getFranqueadoIdByUser] User email: franqueado.rj@teamcruz.com.br
🔍 [getFranqueadoIdByUser] Query result: [{id: "..."}]
🔍 [getFranqueadoIdByUser] Franqueado ID: abc-xyz-123

🔒 [AlunosService.list] Franqueado ID encontrado: abc-xyz-123
✅ [AlunosService.list] FILTRO SQL APLICADO para franqueado: abc-xyz-123
```

### 2️⃣ O que Cada Log Significa

| Log                            | Significa              | Ação se não aparecer         |
| ------------------------------ | ---------------------- | ---------------------------- |
| `USER RECEBIDO: SIM`           | Token JWT está OK      | Fazer logout/login           |
| `User Email: franqueado...`    | Email foi extraído     | Verificar token              |
| `User Perfis: [...]`           | Perfis carregados      | Verificar no banco           |
| `isFranqueado RESULTADO: true` | Detectou franqueado    | Verificar perfis no DB       |
| `isMaster RESULTADO: false`    | Não é master           | Se for true, não filtra      |
| `Franqueado ID: abc-xyz...`    | Achou franqueado no DB | Verificar tabela franqueados |
| `FILTRO SQL APLICADO`          | **FILTRO FUNCIONANDO** | 🎯 SUCESSO!                  |

### 3️⃣ Possíveis Problemas e Soluções

#### ❌ Problema 1: "USER RECEBIDO: NÃO"

**Causa:** Token JWT não está sendo enviado

**Solução:**

```bash
# 1. Verificar no navegador (F12 > Network)
# Deve ter: Authorization: Bearer eyJhbGc...

# 2. Se não tiver, verificar localStorage
console.log(localStorage.getItem('token'))

# 3. Fazer logout e login novamente
```

#### ❌ Problema 2: "isFranqueado RESULTADO: false"

**Causa:** Usuário não tem perfil FRANQUEADO no banco

**Solução:**

```sql
-- Verificar perfis do usuário
SELECT u.email, p.nome
FROM teamcruz.usuarios u
JOIN teamcruz.usuario_perfis up ON u.id = up.usuario_id
JOIN teamcruz.perfis p ON up.perfil_id = p.id
WHERE u.email = 'franqueado.rj@teamcruz.com.br';

-- Deve retornar:
-- email: franqueado.rj@teamcruz.com.br
-- nome: FRANQUEADO
```

#### ❌ Problema 3: "Franqueado ID: NÃO ENCONTRADO"

**Causa:** Email do usuário não bate com email na tabela franqueados

**Solução:**

```sql
-- Verificar franqueado
SELECT * FROM teamcruz.franqueados
WHERE lower(email) = lower('franqueado.rj@teamcruz.com.br');

-- Se não existir, criar:
INSERT INTO teamcruz.franqueados (nome, email, usuario_id, created_at, updated_at)
VALUES (
  'Franqueado Rio de Janeiro',
  'franqueado.rj@teamcruz.com.br',
  'ID_DO_USUARIO_AQUI',
  NOW(),
  NOW()
);
```

#### ❌ Problema 4: "isMaster RESULTADO: true"

**Causa:** Usuário tem perfil MASTER também (masters veem tudo)

**Solução:**

```sql
-- Se franqueado NÃO deve ser master, remover perfil master:
DELETE FROM teamcruz.usuario_perfis
WHERE usuario_id = 'ID_DO_USUARIO'
AND perfil_id = (SELECT id FROM teamcruz.perfis WHERE nome = 'MASTER');
```

### 4️⃣ Teste Passo a Passo

1. **Abrir terminal do backend** - deixe visível
2. **F12 no navegador** - aba Console
3. **Fazer LOGOUT**
4. **Limpar cache** - Ctrl+Shift+Delete
5. **Fazer LOGIN** como franqueado
6. **Acessar /alunos**
7. **Olhar logs do backend** - deve aparecer todos os logs acima
8. **Verificar total de alunos** - deve ser ~240 (não 390+)

### 5️⃣ Checklist de Verificação

- [ ] Backend mostra `USER RECEBIDO: SIM`
- [ ] Backend mostra email do usuário
- [ ] Backend mostra `isFranqueado RESULTADO: true`
- [ ] Backend mostra `isMaster RESULTADO: false`
- [ ] Backend mostra `Franqueado ID: abc-xyz...` (não "NÃO ENCONTRADO")
- [ ] Backend mostra `✅ FILTRO SQL APLICADO`
- [ ] Frontend mostra ~240 alunos (não 390+)

### 6️⃣ Query SQL para Debug Manual

```sql
-- Ver quantos alunos o franqueado DEVE ver:
SELECT COUNT(*) as total_alunos
FROM teamcruz.alunos a
WHERE a.unidade_id IN (
  SELECT id
  FROM teamcruz.unidades
  WHERE franqueado_id = (
    SELECT id
    FROM teamcruz.franqueados
    WHERE lower(email) = lower('franqueado.rj@teamcruz.com.br')
  )
);

-- Ver as unidades do franqueado:
SELECT u.id, u.nome
FROM teamcruz.unidades u
WHERE u.franqueado_id = (
  SELECT id
  FROM teamcruz.franqueados
  WHERE lower(email) = lower('franqueado.rj@teamcruz.com.br')
);
```

---

## 🎯 AGORA TESTE!

1. **Reinicie o backend** (se necessário)
2. **Faça logout/login**
3. **Acesse /alunos**
4. **COLE OS LOGS DO BACKEND AQUI** para eu ver o que está acontecendo

**Me mostre exatamente o que aparece no terminal do backend quando você acessa /alunos!**
