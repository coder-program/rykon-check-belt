-- Script para criar ENUMs necessários para unidades
-- Execute este script no banco de dados PostgreSQL

-- 1. Criar ENUM para status de unidades
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_unidade_enum' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'teamcruz')) THEN
        CREATE TYPE teamcruz.status_unidade_enum AS ENUM (
            'ATIVA',
            'INATIVA',
            'HOMOLOGACAO'
        );
        RAISE NOTICE 'ENUM status_unidade_enum criado';
    ELSE
        RAISE NOTICE 'ENUM status_unidade_enum já existe';
    END IF;
END $$;

-- 2. Criar ENUM para papel do responsável
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'papel_responsavel_enum' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'teamcruz')) THEN
        CREATE TYPE teamcruz.papel_responsavel_enum AS ENUM (
            'PROPRIETARIO',
            'GERENTE',
            'INSTRUTOR',
            'ADMINISTRATIVO'
        );
        RAISE NOTICE 'ENUM papel_responsavel_enum criado';
    ELSE
        RAISE NOTICE 'ENUM papel_responsavel_enum já existe';
    END IF;
END $$;

-- 3. Verificar se os ENUMs foram criados corretamente
SELECT
    n.nspname as schema_name,
    t.typname as enum_name,
    e.enumlabel as enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'teamcruz'
AND t.typname IN ('status_unidade_enum', 'papel_responsavel_enum')
ORDER BY t.typname, e.enumsortorder;