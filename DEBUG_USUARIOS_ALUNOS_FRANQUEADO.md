# Debug: Discrepância entre Gerenciar Usuários e Lista de Alunos

## Problema Identificado

**Franqueado Deleon Leite vê:**

- ✅ **Gerenciar Usuários** - Mostra apenas 1 aluno (Aluno Osasco) + 7 outros usuários
- **Graduação (/teamcruz)** - Mostra vários alunos na lista "Próximos a Receber Grau"

## Hipóteses

### Hipótese 1: Alunos sem Usuário

A tabela `alunos` pode ter registros que **NÃO** têm `usuario_id` preenchido.

- A página "Gerenciar Usuários" lista apenas usuários da tabela `usuarios` (requer `usuario_id`)
- A página de Graduação pode listar direto da tabela `alunos` (não requer `usuario_id`)

### Hipótese 2: Alunos sem Perfil ALUNO

Os alunos podem ter registro na tabela `alunos`, mas o usuário vinculado não tem o perfil "ALUNO" atribuído.

### Hipótese 3: Problema no Join da Query

A query de `findAllWithHierarchy` usa LEFT JOINs complexos que podem estar perdendo alguns registros.

## Passos para Debug

### 1. Execute as Queries SQL

```bash
# Rode o arquivo SQL completo para verificar os dados
psql -h 200.196.219.178 -p 5432 -U postg  -d rykondb -f debug-franqueado-usuarios-alunos.sql
```

Ou execute cada query manualmente no DBeaver/pgAdmin.

### 2. Verifique os Logs do Backend

Adicionei logs extensivos em:

- `backend/src/usuarios/services/usuarios.service.ts` (método `findAllWithHierarchy`)
- `backend/src/people/services/alunos.service.ts` (método `list`)

**Passo a passo:**

1. Faça login como **franqueado Deleon** (`deleon.leite@gmail.com`)
2. Acesse a página **Gerenciar Usuários**
3. Verifique os logs no terminal do backend:

   ```
   🔍 [FIND ALL HIERARCHY] Usuario logado como FRANQUEADO
   🔍 [FIND ALL HIERARCHY] Franqueado ID: <id>
   🔍 [FIND ALL HIERARCHY] Total de usuários encontrados: X
   🔥 [FIND ALL HIERARCHY] Total de ALUNOS retornados: Y
   ```

4. Acesse a página **Graduação** (`/admin/aprovacao-graduacao` ou `/teamcruz`)
5. Verifique os logs:
   ```
   🔥🔥🔥 [ALUNOS LIST] ===== INÍCIO =====
   🔥🔥🔥 [ALUNOS LIST] Params: {...}
   🔥 [ALUNOS LIST] Usuário identificado como FRANQUEADO
   🔥 [ALUNOS LIST] Franqueado ID: <id>
   🔥 [ALUNOS LIST] Unidades do franqueado: [...]
   🔥🔥🔥 [ALUNOS LIST] Total de alunos encontrados: Z
   ```

### 3. Compare os Resultados

**Esperado:**

- Número de alunos em "Gerenciar Usuários" = Número de usuários com perfil ALUNO (Query #4)
- Número de alunos na Graduação = Total de alunos na tabela `alunos` (Query #3)

**Se forem diferentes:**

- A discrepância está em alunos **sem usuario_id** ou **sem perfil ALUNO**

## Queries Importantes

### Ver todos os alunos (independente de usuário)

```sql
SELECT
    a.id, a.nome_completo, a.email, a.usuario_id,
    u.nome as unidade_nome
FROM teamcruz.alunos a
INNER JOIN teamcruz.unidades u ON u.id = a.unidade_id
WHERE u.franqueado_id = '<franqueado_id>'
ORDER BY a.data_matricula DESC;
```

### Ver apenas alunos com perfil ALUNO

```sql
SELECT
    u.id as usuario_id, u.nome, a.nome_completo as aluno_nome
FROM teamcruz.usuarios u
INNER JOIN teamcruz.usuario_perfis up ON up.usuario_id = u.id
INNER JOIN teamcruz.perfis p ON p.id = up.perfil_id
INNER JOIN teamcruz.alunos a ON a.usuario_id = u.id
INNER JOIN teamcruz.unidades un ON un.id = a.unidade_id
WHERE UPPER(p.nome) = 'ALUNO'
  AND un.franqueado_id = '<franqueado_id>'
ORDER BY a.data_matricula DESC;
```

### Comparar: Com usuário x Sem usuário

```sql
SELECT
    CASE
        WHEN a.usuario_id IS NULL THEN 'SEM USUARIO'
        ELSE 'COM USUARIO'
    END as tipo,
    COUNT(*) as total
FROM teamcruz.alunos a
INNER JOIN teamcruz.unidades u ON u.id = a.unidade_id
WHERE u.franqueado_id = '<franqueado_id>'
GROUP BY CASE WHEN a.usuario_id IS NULL THEN 'SEM USUARIO' ELSE 'COM USUARIO' END;
```

## Correção Esperada

Se a hipótese for confirmada:

1. **Alunos sem usuario_id**:

   - Criar usuários para esses alunos OU
   - Ajustar a tela de Graduação para também filtrar por usuario_id

2. **Alunos sem perfil ALUNO**:

   - Atribuir o perfil "ALUNO" aos usuários que estão na tabela alunos

3. **Problema no Join**:
   - Ajustar a query SQL em `findAllWithHierarchy`

## Próximos Passos

1. ✅ Execute as queries SQL (`debug-franqueado-usuarios-alunos.sql`)
2. ✅ Verifique os logs do backend
3. ❓ Informe os resultados aqui
4. 🔧 Implementaremos a correção baseado nos dados reais

---

**Status**: Aguardando execução das queries e análise dos logs 🕒
