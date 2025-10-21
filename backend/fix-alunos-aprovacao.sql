-- ============================================================================
-- ADICIONAR COLUNAS DE APROVAÇÃO NA TABELA ALUNOS
-- ============================================================================

-- 1. Criar ENUM para status de aprovação (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_aprovacao_enum') THEN
        CREATE TYPE teamcruz.status_aprovacao_enum AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');
    END IF;
END $$;

-- 2. Adicionar colunas de aprovação
ALTER TABLE teamcruz.alunos
ADD COLUMN IF NOT EXISTS status_aprovacao teamcruz.status_aprovacao_enum DEFAULT 'PENDENTE';

ALTER TABLE teamcruz.alunos
ADD COLUMN IF NOT EXISTS aprovado_por_id uuid;

ALTER TABLE teamcruz.alunos
ADD COLUMN IF NOT EXISTS aprovado_em timestamptz;

ALTER TABLE teamcruz.alunos
ADD COLUMN IF NOT EXISTS observacao_aprovacao text;

-- 3. Adicionar chave estrangeira
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_alunos_aprovador'
    ) THEN
        ALTER TABLE teamcruz.alunos
        ADD CONSTRAINT fk_alunos_aprovador
        FOREIGN KEY (aprovado_por_id)
        REFERENCES teamcruz.usuarios(id);
    END IF;
END $$;

-- 4. Criar índice para consultas de alunos pendentes por unidade
CREATE INDEX IF NOT EXISTS idx_alunos_status_aprovacao_unidade
ON teamcruz.alunos(unidade_id, status_aprovacao)
WHERE status_aprovacao = 'PENDENTE';

-- 5. Comentários
COMMENT ON COLUMN teamcruz.alunos.status_aprovacao IS 'Status da aprovação do cadastro: PENDENTE, APROVADO, REJEITADO';
COMMENT ON COLUMN teamcruz.alunos.aprovado_por_id IS 'ID do usuário (gerente/franqueado/recepcionista) que aprovou';
COMMENT ON COLUMN teamcruz.alunos.aprovado_em IS 'Data e hora da aprovação';
COMMENT ON COLUMN teamcruz.alunos.observacao_aprovacao IS 'Observação do aprovador (motivo da rejeição, etc)';

-- 6. Verificar colunas adicionadas
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'teamcruz'
    AND table_name = 'alunos'
    AND column_name IN ('status_aprovacao', 'aprovado_por_id', 'aprovado_em', 'observacao_aprovacao')
ORDER BY column_name;

SELECT '✅ Colunas de aprovação adicionadas com sucesso!' AS resultado;
