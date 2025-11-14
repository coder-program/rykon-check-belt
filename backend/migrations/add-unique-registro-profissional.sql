-- Migration: Adicionar constraint unique para registro_profissional
-- Data: 2025-01-13
-- Descrição: Garantir que não haja registros profissionais duplicados entre professores

DO $$
BEGIN
    -- Primeiro, verificar e remover duplicatas se existirem
    -- Manter apenas o registro mais antigo de cada registro_profissional duplicado
    WITH duplicates AS (
        SELECT
            registro_profissional,
            COUNT(*) as count,
            MIN(created_at) as primeiro_registro
        FROM teamcruz.professores
        WHERE registro_profissional IS NOT NULL
          AND registro_profissional != ''
          AND tipo_cadastro = 'PROFESSOR'
        GROUP BY registro_profissional
        HAVING COUNT(*) > 1
    ),
    to_keep AS (
        SELECT DISTINCT ON (p.registro_profissional)
            p.id
        FROM teamcruz.professores p
        INNER JOIN duplicates d ON p.registro_profissional = d.registro_profissional
        WHERE p.created_at = d.primeiro_registro
        ORDER BY p.registro_profissional, p.created_at ASC
    )
    UPDATE teamcruz.professores
    SET registro_profissional = NULL,
        observacoes = COALESCE(observacoes, '') ||
            CASE
                WHEN observacoes IS NULL OR observacoes = '' THEN
                    'Registro profissional removido por duplicação em ' || NOW()::date
                ELSE
                    E'\n' || 'Registro profissional removido por duplicação em ' || NOW()::date
            END
    WHERE registro_profissional IS NOT NULL
      AND registro_profissional != ''
      AND tipo_cadastro = 'PROFESSOR'
      AND id NOT IN (SELECT id FROM to_keep);

    -- Criar índice único parcial para registro_profissional
    -- Apenas para registros não-nulos e não-vazios
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_professores_registro_profissional_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_professores_registro_profissional_unique
        ON teamcruz.professores (registro_profissional)
        WHERE registro_profissional IS NOT NULL
          AND registro_profissional != ''
          AND tipo_cadastro = 'PROFESSOR';

        RAISE NOTICE 'Índice único criado para registro_profissional';
    ELSE
        RAISE NOTICE 'Índice único para registro_profissional já existe';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao executar migration: %', SQLERRM;
        RAISE;
END $$;

-- Verificar se há ainda duplicatas após a limpeza
SELECT
    registro_profissional,
    COUNT(*) as total_duplicatas
FROM teamcruz.professores
WHERE registro_profissional IS NOT NULL
  AND registro_profissional != ''
  AND tipo_cadastro = 'PROFESSOR'
GROUP BY registro_profissional
HAVING COUNT(*) > 1;

-- Se a query acima retornar resultados, ainda há duplicatas