-- ===================================================================
-- FIX: Adicionar colunas faltantes na tabela unidades
-- ===================================================================

-- Verificar e adicionar colunas que podem estar faltando
DO $$
BEGIN
    -- Adicionar razao_social se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'teamcruz' 
        AND table_name = 'unidades' 
        AND column_name = 'razao_social'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN razao_social VARCHAR(200);
        RAISE NOTICE 'Coluna razao_social adicionada';
    END IF;

    -- Adicionar nome_fantasia se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'teamcruz' 
        AND table_name = 'unidades' 
        AND column_name = 'nome_fantasia'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN nome_fantasia VARCHAR(150);
        RAISE NOTICE 'Coluna nome_fantasia adicionada';
    END IF;

    -- Adicionar inscricao_estadual se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'teamcruz' 
        AND table_name = 'unidades' 
        AND column_name = 'inscricao_estadual'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN inscricao_estadual VARCHAR(20);
        RAISE NOTICE 'Coluna inscricao_estadual adicionada';
    END IF;

    -- Adicionar inscricao_municipal se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'teamcruz' 
        AND table_name = 'unidades' 
        AND column_name = 'inscricao_municipal'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN inscricao_municipal VARCHAR(20);
        RAISE NOTICE 'Coluna inscricao_municipal adicionada';
    END IF;

    -- Adicionar codigo_interno se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'teamcruz' 
        AND table_name = 'unidades' 
        AND column_name = 'codigo_interno'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN codigo_interno VARCHAR(50);
        RAISE NOTICE 'Coluna codigo_interno adicionada';
    END IF;

    -- Adicionar telefone_fixo se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'teamcruz' 
        AND table_name = 'unidades' 
        AND column_name = 'telefone_fixo'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN telefone_fixo VARCHAR(20);
        RAISE NOTICE 'Coluna telefone_fixo adicionada';
    END IF;

    -- Adicionar telefone_celular se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'teamcruz' 
        AND table_name = 'unidades' 
        AND column_name = 'telefone_celular'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN telefone_celular VARCHAR(20);
        RAISE NOTICE 'Coluna telefone_celular adicionada';
    END IF;

    -- Adicionar email se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'teamcruz' 
        AND table_name = 'unidades' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN email VARCHAR(120);
        RAISE NOTICE 'Coluna email adicionada';
    END IF;

    -- Adicionar website se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'teamcruz' 
        AND table_name = 'unidades' 
        AND column_name = 'website'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN website VARCHAR(200);
        RAISE NOTICE 'Coluna website adicionada';
    END IF;

    -- Adicionar redes_sociais se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'teamcruz' 
        AND table_name = 'unidades' 
        AND column_name = 'redes_sociais'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN redes_sociais JSONB;
        RAISE NOTICE 'Coluna redes_sociais adicionada';
    END IF;

    -- Adicionar area_tatame_m2 se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'teamcruz' 
        AND table_name = 'unidades' 
        AND column_name = 'area_tatame_m2'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN area_tatame_m2 NUMERIC(10,2);
        RAISE NOTICE 'Coluna area_tatame_m2 adicionada';
    END IF;

    -- Adicionar qtde_instrutores se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'teamcruz' 
        AND table_name = 'unidades' 
        AND column_name = 'qtde_instrutores'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN qtde_instrutores INTEGER DEFAULT 0;
        RAISE NOTICE 'Coluna qtde_instrutores adicionada';
    END IF;

    -- Adicionar instrutor_principal_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'teamcruz' 
        AND table_name = 'unidades' 
        AND column_name = 'instrutor_principal_id'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN instrutor_principal_id UUID;
        RAISE NOTICE 'Coluna instrutor_principal_id adicionada';
    END IF;

    -- Adicionar endereco_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'teamcruz' 
        AND table_name = 'unidades' 
        AND column_name = 'endereco_id'
    ) THEN
        ALTER TABLE teamcruz.unidades ADD COLUMN endereco_id UUID;
        RAISE NOTICE 'Coluna endereco_id adicionada';
    END IF;

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

END$$;

-- Verificar colunas da tabela unidades
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'teamcruz' 
  AND table_name = 'unidades'
ORDER BY ordinal_position;
