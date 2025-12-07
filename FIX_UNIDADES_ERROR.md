# 🔧 FIX: Erro "column unidade.modalidades does not exist"

## ERRO ENCONTRADO

```
QueryFailedError: error: column unidade.modalidades does not exist
```

## 🔍 CAUSA

A entity `Unidade` tem campos que não existem no banco de dados:

- `modalidades` (JSONB)
- `horarios_funcionamento` (JSONB)
- E possivelmente outros campos

Isso acontece porque a tabela `unidades` foi criada antes da entity ser atualizada, ou a migration não foi executada corretamente.

## ✅ SOLUÇÃO

### Opção 1: Executar Script SQL (Recomendado)

1. **Abra seu cliente PostgreSQL** (pgAdmin, DBeaver, psql, etc.)

2. **Conecte no banco `teamcruz`**

3. **Execute o script:** `backend/fix-unidades-table.sql`

   Ou copie e cole o seguinte SQL:

```sql
-- ===================================================================
-- FIX: Adicionar colunas faltantes na tabela unidades
-- ===================================================================

DO $$
BEGIN
    -- IMPORTANTE: Adicionar modalidades se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'teamcruz'
        AND table_name = 'unidades'
        AND column_name = 'modalidades'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN modalidades JSONB;
        RAISE NOTICE 'Coluna modalidades adicionada ✅';
    ELSE
        RAISE NOTICE 'Coluna modalidades já existe ✅';
    END IF;

    -- Adicionar horarios_funcionamento se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'teamcruz'
        AND table_name = 'unidades'
        AND column_name = 'horarios_funcionamento'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN horarios_funcionamento JSONB;
        RAISE NOTICE 'Coluna horarios_funcionamento adicionada ✅';
    ELSE
        RAISE NOTICE 'Coluna horarios_funcionamento já existe ✅';
    END IF;

    -- Adicionar outras colunas que podem estar faltando
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'teamcruz'
        AND table_name = 'unidades'
        AND column_name = 'razao_social'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN razao_social VARCHAR(200);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'teamcruz'
        AND table_name = 'unidades'
        AND column_name = 'nome_fantasia'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN nome_fantasia VARCHAR(150);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'teamcruz'
        AND table_name = 'unidades'
        AND column_name = 'email'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN email VARCHAR(120);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'teamcruz'
        AND table_name = 'unidades'
        AND column_name = 'telefone_fixo'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN telefone_fixo VARCHAR(20);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'teamcruz'
        AND table_name = 'unidades'
        AND column_name = 'telefone_celular'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN telefone_celular VARCHAR(20);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'teamcruz'
        AND table_name = 'unidades'
        AND column_name = 'website'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN website VARCHAR(200);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'teamcruz'
        AND table_name = 'unidades'
        AND column_name = 'redes_sociais'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN redes_sociais JSONB;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'teamcruz'
        AND table_name = 'unidades'
        AND column_name = 'area_tatame_m2'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN area_tatame_m2 NUMERIC(10,2);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'teamcruz'
        AND table_name = 'unidades'
        AND column_name = 'qtde_instrutores'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN qtde_instrutores INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'teamcruz'
        AND table_name = 'unidades'
        AND column_name = 'instrutor_principal_id'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN instrutor_principal_id UUID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'teamcruz'
        AND table_name = 'unidades'
        AND column_name = 'endereco_id'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN endereco_id UUID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'teamcruz'
        AND table_name = 'unidades'
        AND column_name = 'codigo_interno'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN codigo_interno VARCHAR(50);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'teamcruz'
        AND table_name = 'unidades'
        AND column_name = 'inscricao_estadual'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN inscricao_estadual VARCHAR(20);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'teamcruz'
        AND table_name = 'unidades'
        AND column_name = 'inscricao_municipal'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN inscricao_municipal VARCHAR(20);
    END IF;

END$$;

-- Verificar se as colunas foram criadas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'teamcruz'
  AND table_name = 'unidades'
ORDER BY ordinal_position;
```

4. **Verifique a saída:**

   - Deve mostrar "Coluna modalidades adicionada ✅"
   - Deve mostrar todas as colunas da tabela

5. **Reinicie o backend:**

```bash
# No PowerShell
npm run start:dev
```

6. **Teste novamente acessando /horarios**

---

### Opção 2: Via psql (Command Line)

```bash
# Conectar no banco
psql -U postgres -d teamcruz

# Executar o script
\i C:/Users/Lenovo/Documents/project/rykon-check-belt/backend/fix-unidades-table.sql

# Ou copiar e colar o SQL acima diretamente
```

---

## 🔍 VERIFICAR SE FUNCIONOU

Após executar o script, rode no PostgreSQL:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'teamcruz'
  AND table_name = 'unidades'
  AND column_name IN ('modalidades', 'horarios_funcionamento')
ORDER BY column_name;
```

**Resultado esperado:**

```
column_name             | data_type | is_nullable
-----------------------|-----------|-------------
horarios_funcionamento | jsonb     | YES
modalidades            | jsonb     | YES
```

---

## 📋 COLUNAS QUE SERÃO ADICIONADAS

| Coluna                   | Tipo          | Descrição                                          |
| ------------------------ | ------------- | -------------------------------------------------- |
| `modalidades`            | JSONB         | **🔴 PRINCIPAL** - Lista de modalidades da unidade |
| `horarios_funcionamento` | JSONB         | **🔴 PRINCIPAL** - Horários de funcionamento       |
| `razao_social`           | VARCHAR(200)  | Razão social da empresa                            |
| `nome_fantasia`          | VARCHAR(150)  | Nome fantasia                                      |
| `email`                  | VARCHAR(120)  | Email da unidade                                   |
| `telefone_fixo`          | VARCHAR(20)   | Telefone fixo                                      |
| `telefone_celular`       | VARCHAR(20)   | Telefone celular                                   |
| `website`                | VARCHAR(200)  | Site da unidade                                    |
| `redes_sociais`          | JSONB         | Redes sociais                                      |
| `area_tatame_m2`         | NUMERIC(10,2) | Área do tatame                                     |
| `qtde_instrutores`       | INTEGER       | Quantidade de instrutores                          |
| `instrutor_principal_id` | UUID          | ID do instrutor principal                          |
| `endereco_id`            | UUID          | ID do endereço                                     |
| `codigo_interno`         | VARCHAR(50)   | Código interno                                     |
| `inscricao_estadual`     | VARCHAR(20)   | Inscrição estadual                                 |
| `inscricao_municipal`    | VARCHAR(20)   | Inscrição municipal                                |

---

## 🚀 APÓS CORRIGIR

1. ✅ Reinicie o backend: `npm run start:dev`
2. ✅ Acesse `/horarios` no frontend
3. ✅ Não deve mais dar erro!

---

## 🛟 SE AINDA DER ERRO

Se após executar o script ainda der erro, verifique:

1. **As colunas foram realmente criadas?**

```sql
\d teamcruz.unidades
```

2. **O backend foi reiniciado?**

```bash
npm run start:dev
```

3. **Ainda dá erro?** Me avise e eu ajudo a debugar!

---

**Status:** 🔧 Aguardando você executar o script SQL
