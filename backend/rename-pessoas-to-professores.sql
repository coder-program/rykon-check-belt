-- Script para renomear tabela pessoas para professores
-- Execute este script no banco de dados PostgreSQL

-- 1. Verificar se a tabela pessoas existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'teamcruz' AND table_name = 'pessoas') THEN
        RAISE NOTICE 'Tabela pessoas existe, procedendo com a renomeação...';
    ELSE
        RAISE EXCEPTION 'Tabela pessoas não encontrada no schema teamcruz';
    END IF;
END $$;

-- 2. Renomear a tabela pessoas para professores
ALTER TABLE teamcruz.pessoas RENAME TO professores;

-- 3. Renomear os índices existentes
-- Primeiro, verificar quais índices existem
DO $$
DECLARE
    index_record RECORD;
BEGIN
    -- Listar e renomear índices relacionados à tabela pessoas
    FOR index_record IN
        SELECT indexname FROM pg_indexes
        WHERE schemaname = 'teamcruz'
        AND tablename = 'professores'
        AND indexname LIKE '%pessoas%'
    LOOP
        EXECUTE format('ALTER INDEX teamcruz.%I RENAME TO %I',
                      index_record.indexname,
                      REPLACE(index_record.indexname, 'pessoas', 'professores'));
        RAISE NOTICE 'Índice renomeado: % -> %',
                     index_record.indexname,
                     REPLACE(index_record.indexname, 'pessoas', 'professores');
    END LOOP;
END $$;

-- 4. Renomear as constraints (foreign keys)
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Listar e renomear constraints relacionadas
    FOR constraint_record IN
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_schema = 'teamcruz'
        AND table_name = 'professores'
        AND constraint_name LIKE '%pessoas%'
    LOOP
        EXECUTE format('ALTER TABLE teamcruz.professores RENAME CONSTRAINT %I TO %I',
                      constraint_record.constraint_name,
                      REPLACE(constraint_record.constraint_name, 'pessoas', 'professores'));
        RAISE NOTICE 'Constraint renomeada: % -> %',
                     constraint_record.constraint_name,
                     REPLACE(constraint_record.constraint_name, 'pessoas', 'professores');
    END LOOP;
END $$;

-- 5. Renomear triggers se existirem
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN
        SELECT trigger_name FROM information_schema.triggers
        WHERE event_object_schema = 'teamcruz'
        AND event_object_table = 'professores'
        AND trigger_name LIKE '%pessoas%'
    LOOP
        EXECUTE format('DROP TRIGGER %I ON teamcruz.professores', trigger_record.trigger_name);
        EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON teamcruz.professores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
                      REPLACE(trigger_record.trigger_name, 'pessoas', 'professores'));
        RAISE NOTICE 'Trigger renomeado: % -> %',
                     trigger_record.trigger_name,
                     REPLACE(trigger_record.trigger_name, 'pessoas', 'professores');
    END LOOP;
END $$;

-- 6. Atualizar referências em outras tabelas (se houver)
-- Nota: Como você tem uma estrutura unificada, pode haver FKs em outras tabelas que referenciam pessoas
-- Vamos verificar e listar essas referências para ajuste manual se necessário

SELECT
    tc.table_name AS referencing_table,
    kcu.column_name AS referencing_column,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'professores'
    AND ccu.table_schema = 'teamcruz';

-- 7. Verificar o resultado final
SELECT 'Tabela renomeada com sucesso!' as status;

-- Verificar a estrutura da nova tabela
\d teamcruz.professores

-- Verificar os índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'teamcruz'
AND tablename = 'professores';

COMMENT ON TABLE teamcruz.professores IS 'Tabela unificada para professores e alunos (renomeada de pessoas)';