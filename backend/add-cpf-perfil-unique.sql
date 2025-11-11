-- ========================================
-- CONSTRAINT: CPF + PERFIL unico em usuarios
-- ========================================
-- Um usuario nao pode ter o mesmo CPF para o mesmo perfil
-- Mas pode ter o mesmo CPF para perfis diferentes

DO $$
BEGIN
    -- CPF + perfil unico em usuarios
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'usuarios_cpf_tipo_unique'
        AND connamespace = 'teamcruz'::regnamespace
    ) THEN
        -- Primeiro, vamos verificar se ha duplicatas
        RAISE NOTICE 'Verificando duplicatas antes de criar constraint...';

        -- Se houver duplicatas, o ALTER TABLE vai falhar
        -- Vamos listar as duplicatas primeiro
        PERFORM 1 FROM (
            SELECT cpf, tipo_cadastro, COUNT(*) as qtd
            FROM teamcruz.usuarios
            WHERE cpf IS NOT NULL
            GROUP BY cpf, tipo_cadastro
            HAVING COUNT(*) > 1
        ) duplicatas;

        IF FOUND THEN
            RAISE EXCEPTION 'ERRO: Existem CPFs duplicados para o mesmo perfil. Execute a query abaixo para ver:
            SELECT cpf, tipo_cadastro, COUNT(*) FROM teamcruz.usuarios
            WHERE cpf IS NOT NULL
            GROUP BY cpf, tipo_cadastro
            HAVING COUNT(*) > 1;';
        END IF;

        -- Criar constraint composta (CPF + tipo_cadastro)
        ALTER TABLE teamcruz.usuarios
        ADD CONSTRAINT usuarios_cpf_tipo_unique UNIQUE (cpf, tipo_cadastro);

        RAISE NOTICE 'OK Constraint usuarios_cpf_tipo_unique criada com sucesso!';
    ELSE
        RAISE NOTICE 'AVISO Constraint usuarios_cpf_tipo_unique ja existe';
    END IF;
END $$;

-- Verificar constraint criada
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE connamespace = 'teamcruz'::regnamespace
  AND conname = 'usuarios_cpf_tipo_unique';

-- ========================================
-- RESUMO FINAL DAS VALIDACOES
-- ========================================

/*
FRANQUEADOS:
  - CPF unico (nao pode cadastrar 2 franqueados com mesmo CPF)
  - Email unico (nao pode cadastrar 2 franqueados com mesmo email)

USUARIOS:
  - Email unico (nao pode cadastrar 2 usuarios com mesmo email)
  - Username unico (nao pode cadastrar 2 usuarios com mesmo username)
  - CPF + PERFIL unico (nao pode cadastrar 2 usuarios com mesmo CPF E mesmo perfil)

EXEMPLOS:
  - CPF 123 ALUNO + CPF 123 ALUNO = ERRO (duplicado)
  - CPF 123 ALUNO + CPF 123 PROFESSOR = OK (perfis diferentes)
  - CPF 123 PROFESSOR + CPF 123 PROFESSOR = ERRO (duplicado)
*/
