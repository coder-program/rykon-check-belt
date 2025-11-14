-- Migration: Adicionar novos valores ao enum status_cadastro_enum
-- Data: 2025-01-13
-- Descrição: Adicionar SUSPENSO e AFASTADO ao enum de status de cadastro

DO $$
BEGIN
    -- Verificar se o valor SUSPENSO já existe no enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = (
            SELECT oid FROM pg_type
            WHERE typname = 'status_cadastro_enum'
            AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'teamcruz')
        )
        AND enumlabel = 'SUSPENSO'
    ) THEN
        -- Adicionar SUSPENSO ao enum
        ALTER TYPE teamcruz.status_cadastro_enum ADD VALUE 'SUSPENSO';
        RAISE NOTICE 'Valor SUSPENSO adicionado ao enum status_cadastro_enum';
    ELSE
        RAISE NOTICE 'Valor SUSPENSO já existe no enum status_cadastro_enum';
    END IF;

    -- Verificar se o valor AFASTADO já existe no enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = (
            SELECT oid FROM pg_type
            WHERE typname = 'status_cadastro_enum'
            AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'teamcruz')
        )
        AND enumlabel = 'AFASTADO'
    ) THEN
        -- Adicionar AFASTADO ao enum
        ALTER TYPE teamcruz.status_cadastro_enum ADD VALUE 'AFASTADO';
        RAISE NOTICE 'Valor AFASTADO adicionado ao enum status_cadastro_enum';
    ELSE
        RAISE NOTICE 'Valor AFASTADO já existe no enum status_cadastro_enum';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao executar migration de status enum: %', SQLERRM;
        RAISE;
END $$;

-- Verificar os valores disponíveis no enum após a migração
SELECT enumlabel as status_disponivel
FROM pg_enum
WHERE enumtypid = (
    SELECT oid FROM pg_type
    WHERE typname = 'status_cadastro_enum'
    AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'teamcruz')
)
ORDER BY enumsortorder;