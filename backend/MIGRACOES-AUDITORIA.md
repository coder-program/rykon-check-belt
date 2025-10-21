# Migração de Colunas de Auditoria

## 🎯 Objetivo

Adicionar colunas `created_at` e `updated_at` em todas as tabelas principais para manter auditoria completa dos registros.

## 📋 Pré-requisitos

- PostgreSQL rodando
- Acesso ao banco de dados com permissões de ALTER TABLE
- Backup do banco (recomendado)

## 🚀 Como Executar

### Opção 1: Script Específico para Unidades

```sql
-- Execute apenas para corrigir a tabela unidades
\i add-audit-columns-unidades.sql
```

### Opção 2: Script Completo (Recomendado)

```sql
-- Execute para adicionar auditoria em todas as tabelas principais
\i add-audit-columns-all-tables.sql
```

### Opção 3: Via psql

```bash
# Conectar ao banco
psql -h localhost -U seu_usuario -d seu_banco

# Executar o script
\i /caminho/para/add-audit-columns-all-tables.sql
```

## 🔍 Verificação

Após executar, verifique se as colunas foram criadas:

```sql
SELECT
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'teamcruz'
  AND table_name IN ('unidades', 'franqueados', 'alunos', 'professores')
  AND column_name IN ('created_at', 'updated_at')
ORDER BY table_name, column_name;
```

## ✅ O que será criado

### Colunas adicionadas:

- `created_at` - TIMESTAMP WITH TIME ZONE (data de criação)
- `updated_at` - TIMESTAMP WITH TIME ZONE (data de última atualização)

### Triggers automáticos:

- Atualiza `updated_at` automaticamente em qualquer UPDATE
- Funciona para: unidades, franqueados, alunos, professores

### Valores padrão:

- Registros existentes: `created_at` = NOW()
- Novos registros: `created_at` = NOW(), `updated_at` = NOW()

## 🐛 Solução de Problemas

### Erro: "column already exists"

É seguro ignorar - o script usa `ADD COLUMN IF NOT EXISTS`

### Erro de permissões:

```sql
-- Garantir permissões (como superuser)
GRANT ALL PRIVILEGES ON SCHEMA teamcruz TO seu_usuario;
```

### Verificar se funcionou:

```sql
-- Testar um insert
INSERT INTO teamcruz.unidades (nome, cnpj, status)
VALUES ('Teste', '12345678000199', 'HOMOLOGACAO');

-- Verificar se created_at foi preenchido
SELECT nome, created_at, updated_at FROM teamcruz.unidades WHERE nome = 'Teste';
```

## 📝 Notas Importantes

1. **Backup**: Sempre faça backup antes de executar
2. **Ambiente**: Execute primeiro em desenvolvimento/teste
3. **Triggers**: Os triggers são criados automaticamente
4. **Performance**: Impacto mínimo - colunas têm valores padrão eficientes
