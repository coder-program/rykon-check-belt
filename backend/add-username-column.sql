-- =====================================================
-- Script: Adicionar campo username à tabela usuarios
-- Data: 2025-11-09
-- Descrição: Adiciona coluna username UNIQUE (não pode repetir)
-- =====================================================

-- 1. Adicionar coluna username se não existir (NULLABLE mas UNIQUE)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'teamcruz'
        AND table_name = 'usuarios'
        AND column_name = 'username'
    ) THEN
        ALTER TABLE teamcruz.usuarios
        ADD COLUMN username VARCHAR(255) NULL;

        RAISE NOTICE '✅ Coluna username adicionada';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna username já existe';
    END IF;
END $$;

-- 2. Adicionar constraint UNIQUE se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'usuarios_username_key'
        AND conrelid = 'teamcruz.usuarios'::regclass
    ) THEN
        ALTER TABLE teamcruz.usuarios
        ADD CONSTRAINT usuarios_username_key UNIQUE (username);

        RAISE NOTICE '✅ Constraint UNIQUE adicionada ao username (não pode repetir)';
    ELSE
        RAISE NOTICE 'ℹ️ Constraint UNIQUE já existe para username';
    END IF;
END $$;

-- 3. Criar índice para otimizar buscas por username
CREATE INDEX IF NOT EXISTS idx_usuarios_username
ON teamcruz.usuarios(username) WHERE username IS NOT NULL;

RAISE NOTICE '✅ Índice criado para username';
RAISE NOTICE '✅ CONCLUÍDO! Campo username configurado com sucesso!';
RAISE NOTICE 'ℹ️ Username é UNIQUE - não pode repetir no banco (assim como email e CPF)';