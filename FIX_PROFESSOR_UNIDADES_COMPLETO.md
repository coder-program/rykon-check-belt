# Fix Professor Unidades - Solução Completa

## Problema

Quando gerente criava usuário com perfil PROFESSOR, o usuário era criado na tabela `usuarios` mas não aparecia na listagem de usuários do gerente.

## Causa Raiz

- A query de listagem (`findAllWithHierarchy`) filtrava usuários através da tabela `professor_unidades`
- Mas a tabela `professor_unidades` só era populada quando o professor completava o cadastro
- Logo, professores recém-criados não apareciam até completarem o perfil

## Solução Implementada

### 1. SQL Migration: `fix-professor-unidades-usuario-id.sql`

**EXECUTAR PRIMEIRO!**

Adiciona suporte para rastrear professores antes de completarem o cadastro:

- Adiciona coluna `usuario_id` em `professor_unidades`
- Permite `professor_id` ser NULL (será preenchido no complete-profile)
- Cria constraints únicas por `usuario_id` ou `professor_id`

```sql
-- Executar este script antes de testar o sistema
psql -U seu_usuario -d seu_banco -f fix-professor-unidades-usuario-id.sql
```

### 2. Backend - Criação de Usuário Professor

**Arquivo:** `backend/src/usuarios/services/usuarios.service.ts` (linhas 238-258)

Quando gerente cria professor:

1. Cria registro na tabela `usuarios`
2. **NOVO**: Cria registro em `professor_unidades` com:
   - `usuario_id` = ID do usuário criado
   - `unidade_id` = Unidade do gerente
   - `professor_id` = NULL (será preenchido depois)
   - `ativo` = true

```typescript
await this.dataSource.query(
  `INSERT INTO teamcruz.professor_unidades
   (professor_id, unidade_id, usuario_id, ativo)
   VALUES (NULL, $1, $2, true)`,
  [createUsuarioDto.unidade_id, usuarioSalvo.id]
);
```

### 3. Backend - Complete Profile

**Arquivo:** `backend/src/people/services/professores.service.ts` (linhas 237-268)

Quando professor completa cadastro:

1. Cria registro na tabela `professores`
2. **NOVO**: Procura registro em `professor_unidades` com `usuario_id`
3. Se encontrar, **atualiza** `professor_id` (ao invés de criar novo)
4. Se não encontrar, cria novo registro normalmente

```typescript
const existingVinculo = await queryRunner.manager.findOne(ProfessorUnidade, {
  where: { usuario_id: dto.usuario_id, unidade_id: dto.unidade_id },
});

if (existingVinculo) {
  existingVinculo.professor_id = savedProfessor.id;
  await queryRunner.manager.save(ProfessorUnidade, existingVinculo);
}
```

### 4. Backend - Entity Update

**Arquivo:** `backend/src/people/entities/professor-unidade.entity.ts`

Adicionadas propriedades:

- `usuario_id: string` (nullable)
- `professor_id` agora é nullable
- Relação ManyToOne com `Usuario`
- Índice em `usuario_id`

### 5. Backend - Query de Listagem

**Arquivo:** `backend/src/usuarios/services/usuarios.service.ts` (linhas 410-427)

Query atualizada para incluir professores pendentes:

```sql
LEFT JOIN professor_unidades pu ON (
  pu.professor_id = p.id OR
  pu.usuario_id = u.id  -- NOVO: busca por usuario_id também
)
```

## Fluxo Completo

### Criação do Professor pelo Gerente

1. Gerente acessa "Gerenciar Usuários"
2. Clica "Novo Usuário"
3. Preenche dados básicos + seleciona perfil PROFESSOR
4. Backend executa:
   ```
   INSERT INTO usuarios (...)
   INSERT INTO professor_unidades (usuario_id, unidade_id, professor_id=NULL)
   ```
5. **Professor aparece imediatamente na listagem** ✅

### Complete Profile pelo Professor

1. Professor faz login pela primeira vez
2. Sistema redireciona para `/complete-profile`
3. Professor preenche dados completos
4. Backend executa:
   ```
   INSERT INTO professores (...)
   UPDATE professor_unidades SET professor_id = X WHERE usuario_id = Y
   ```
5. Professor continua aparecendo na listagem ✅

### Listagem do Gerente

Query retorna:

- Alunos da unidade
- Professores completos (via `professor_id`)
- **Professores pendentes (via `usuario_id`)** ✅
- Recepcionistas da unidade
- Gerentes da unidade

## Arquivos Modificados

1. ✅ `backend/fix-professor-unidades-usuario-id.sql` (CRIADO - executar!)
2. ✅ `backend/src/usuarios/services/usuarios.service.ts`
   - createUsuario: Adiciona INSERT em professor_unidades
   - findAllWithHierarchy: Query atualizada
3. ✅ `backend/src/people/services/professores.service.ts`
   - create: Atualiza registro existente ao invés de criar novo
4. ✅ `backend/src/people/entities/professor-unidade.entity.ts`
   - Adiciona usuario_id, professor_id nullable

## Próximos Passos

1. **EXECUTAR SQL MIGRATION**:

   ```bash
   psql -U postgres -d teamcruz -f backend/fix-professor-unidades-usuario-id.sql
   ```

2. **Reiniciar Backend**:

   ```bash
   cd backend
   npm run start:dev
   ```

3. **Testar Fluxo**:
   - Login como gerente
   - Criar usuário professor
   - Verificar se aparece na lista
   - Logout
   - Login como professor criado
   - Completar cadastro
   - Verificar se ainda aparece na lista do gerente

## Status

- ✅ Código Backend atualizado
- ✅ Entity atualizada
- ✅ SQL Migration criada
- ⏳ **PENDENTE**: Executar SQL migration
- ⏳ **PENDENTE**: Testar fluxo completo

---

**Data:** 2025-11-10
**Fix:** Professor Unidades com usuario_id para rastreamento antes do complete-profile
