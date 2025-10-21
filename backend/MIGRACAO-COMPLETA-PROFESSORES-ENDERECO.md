# Migração Completa: Professores com Referência de Endereços

## Contexto

Esta migração realiza três operações principais:

1. Renomear tabela `pessoas` para `professores`
2. Remover campos de endereço da tabela `professores`
3. Adicionar referência para a tabela `enderecos`
4. Implementar colunas de auditoria em todas as tabelas

## Scripts Criados

- `rename-pessoas-to-professores.sql` - Renomeia a tabela
- `remove-endereco-fields-professores.sql` - Remove campos de endereço e adiciona referência
- `add-audit-columns-all-tables.sql` - Adiciona colunas de auditoria

## Ordem de Execução

### 1. Parar o backend

```powershell
# Se estiver rodando, pare o backend primeiro
```

### 2. Fazer backup do banco

```powershell
cd backend
pg_dump -d teamcruz > backup_antes_migracao_completa.sql
```

### 3. Executar as migrações em ordem

```powershell
# 3.1 - Renomear tabela pessoas para professores
psql -d teamcruz -f rename-pessoas-to-professores.sql

# 3.2 - Remover campos de endereço e adicionar referência
psql -d teamcruz -f remove-endereco-fields-professores.sql

# 3.3 - Adicionar colunas de auditoria em todas as tabelas
psql -d teamcruz -f add-audit-columns-all-tables.sql
```

### 4. Verificar as mudanças

```powershell
# Verificar estrutura da tabela professores
psql -d teamcruz -c "\d teamcruz.professores"

# Verificar se endereços foram migrados corretamente
psql -d teamcruz -c "SELECT p.nome_completo, e.cidade, e.estado FROM teamcruz.professores p LEFT JOIN teamcruz.enderecos e ON p.endereco_id = e.id WHERE p.endereco_id IS NOT NULL LIMIT 3;"

# Verificar colunas de auditoria
psql -d teamcruz -c "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'teamcruz' AND column_name IN ('created_at', 'updated_at') ORDER BY table_name;"
```

### 5. Reiniciar o backend

```powershell
npm run start:dev
```

## Mudanças na Estrutura

### Tabela `professores` (antiga `pessoas`)

**Campos removidos:**

- `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `uf`

**Campos adicionados:**

- `endereco_id` UUID (referência para `teamcruz.enderecos`)
- `created_at`, `updated_at` (se não existiam)

### Tabela `enderecos`

**Campos adicionados:**

- `created_at`, `updated_at` (se não existiam)

### Entidade Person (Backend)

**Alterações no código:**

- Removidos campos de endereço individuais
- Adicionada relação `@ManyToOne` com `Endereco`
- Importada entidade `Endereco`

## Funcionalidades Após Migração

### ✅ Mantidas

- Cadastro e listagem de professores/alunos
- Diferenciação por `tipo_cadastro`
- Todos os campos específicos (graduação, responsável, etc.)
- Auditoria automática com triggers

### ✅ Melhoradas

- Endereços normalizados em tabela separada
- Evita duplicação de dados de endereço
- Melhor integridade referencial
- Auditoria completa em todas as tabelas

### 📝 Para Ajustar no Frontend

Será necessário atualizar os formulários para:

1. Buscar endereços através da relação
2. Criar/editar endereços separadamente
3. Associar endereços aos professores/alunos

## Rollback (se necessário)

```sql
-- 1. Recriar campos de endereço na tabela professores
ALTER TABLE teamcruz.professores
ADD COLUMN cep VARCHAR(10),
ADD COLUMN logradouro VARCHAR(255),
-- ... outros campos

-- 2. Migrar dados de volta
UPDATE teamcruz.professores p
SET cep = e.cep, logradouro = e.logradouro, cidade = e.cidade, uf = e.estado
FROM teamcruz.enderecos e
WHERE p.endereco_id = e.id;

-- 3. Remover referência
ALTER TABLE teamcruz.professores DROP COLUMN endereco_id;

-- 4. Renomear de volta (se necessário)
ALTER TABLE teamcruz.professores RENAME TO pessoas;
```

## Verificações Pós-Migração

1. ✅ Tabela `professores` existe e não tem campos de endereço
2. ✅ Relação com `enderecos` funciona
3. ✅ Dados de endereço foram migrados
4. ✅ Colunas de auditoria em todas as tabelas
5. ✅ Triggers funcionando
6. ✅ Backend inicia sem erros
