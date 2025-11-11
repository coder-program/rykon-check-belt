-- ========================================
-- CONSTRAINTS DE UNICIDADE
-- ========================================

-- 1. FRANQUEADOS: CPF e Email devem ser unicos
-- Verificar se ja existem constraints antes de criar

DO $$
BEGIN
    -- CPF unico em franqueados
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'franqueados_cpf_unique'
        AND connamespace = 'teamcruz'::regnamespace
    ) THEN
        ALTER TABLE teamcruz.franqueados
        ADD CONSTRAINT franqueados_cpf_unique UNIQUE (cpf);
        RAISE NOTICE 'OK Constraint franqueados_cpf_unique criada';
    ELSE
        RAISE NOTICE 'AVISO Constraint franqueados_cpf_unique ja existe';
    END IF;

    -- Email unico em franqueados
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'franqueados_email_unique'
        AND connamespace = 'teamcruz'::regnamespace
    ) THEN
        ALTER TABLE teamcruz.franqueados
        ADD CONSTRAINT franqueados_email_unique UNIQUE (email);
        RAISE NOTICE 'OK Constraint franqueados_email_unique criada';
    ELSE
        RAISE NOTICE 'AVISO Constraint franqueados_email_unique ja existe';
    END IF;

    -- Username unico em usuarios
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'usuarios_username_unique'
        AND connamespace = 'teamcruz'::regnamespace
    ) THEN
        ALTER TABLE teamcruz.usuarios
        ADD CONSTRAINT usuarios_username_unique UNIQUE (username);
        RAISE NOTICE 'OK Constraint usuarios_username_unique criada';
    ELSE
        RAISE NOTICE 'AVISO Constraint usuarios_username_unique ja existe';
    END IF;

    -- Email unico em usuarios
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'usuarios_email_unique'
        AND connamespace = 'teamcruz'::regnamespace
    ) THEN
        ALTER TABLE teamcruz.usuarios
        ADD CONSTRAINT usuarios_email_unique UNIQUE (email);
        RAISE NOTICE 'OK Constraint usuarios_email_unique criada';
    ELSE
        RAISE NOTICE 'AVISO Constraint usuarios_email_unique ja existe';
    END IF;

END $$;

-- ========================================
-- VERIFICACAO FINAL
-- ========================================

-- Listar todas as constraints criadas
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE connamespace = 'teamcruz'::regnamespace
  AND conname IN (
    'franqueados_cpf_unique',
    'franqueados_email_unique',
    'usuarios_username_unique',
    'usuarios_email_unique'
  )
ORDER BY conrelid::regclass, conname;
