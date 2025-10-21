# Migração: Renomear tabela pessoas para professores

## Contexto

A tabela `pessoas` é uma tabela unificada que contém tanto alunos quanto professores, diferenciados pelo campo `tipo_cadastro`. Vamos renomeá-la para `professores` para melhor clareza.

## Passos para execução

### 1. Parar o backend

```powershell
# Se o backend estiver rodando, pare-o primeiro
```

### 2. Executar o script de renomeação

```powershell
cd backend
psql -d teamcruz -f rename-pessoas-to-professores.sql
```

### 3. Executar o script de auditoria (atualizado)

```powershell
psql -d teamcruz -f add-audit-columns-all-tables.sql
```

### 4. Verificar as mudanças

```powershell
# Verificar se a tabela foi renomeada
psql -d teamcruz -c "\dt teamcruz.*"

# Verificar a estrutura da nova tabela
psql -d teamcruz -c "\d teamcruz.professores"

# Verificar se as colunas de auditoria foram criadas
psql -d teamcruz -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'teamcruz' AND table_name = 'professores' AND column_name IN ('created_at', 'updated_at');"
```

### 5. Reiniciar o backend

```powershell
npm run start:dev
```

## O que foi alterado

### Arquivos modificados:

1. **`rename-pessoas-to-professores.sql`** - Script para renomear a tabela e suas dependências
2. **`add-audit-columns-all-tables.sql`** - Script de auditoria atualizado para a nova estrutura
3. **`src/people/entities/person.entity.ts`** - Entidade atualizada para referenciar a tabela `professores`

### Estrutura após migração:

- ✅ Tabela `teamcruz.professores` (renomeada de `pessoas`)
- ✅ Colunas de auditoria `created_at` e `updated_at`
- ✅ Triggers automáticos para `updated_at`
- ✅ Índices renomeados adequadamente
- ✅ Constraints renomeadas adequadamente

## Observações importantes

1. **Tabela unificada**: A tabela `professores` continua contendo tanto alunos quanto professores, diferenciados pelo campo `tipo_cadastro`

2. **Compatibilidade**: Todas as funcionalidades existentes continuarão funcionando normalmente

3. **Foreign Keys**: O script verifica e lista todas as referências de chaves estrangeiras para garantir que nada seja quebrado

4. **Backup**: Recomenda-se fazer backup do banco antes da migração:
   ```powershell
   pg_dump -d teamcruz > backup_antes_migracao.sql
   ```

## Verificação pós-migração

Após executar os scripts, teste:

1. Criação de nova unidade (para verificar se as colunas de auditoria funcionam)
2. Listagem de pessoas/professores
3. Atualização de registros (para verificar se `updated_at` é atualizado automaticamente)

## Rollback (se necessário)

Se houver problemas, você pode reverter:

```sql
ALTER TABLE teamcruz.professores RENAME TO pessoas;
-- E ajustar novamente a entidade no código
```
