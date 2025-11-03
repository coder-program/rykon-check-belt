-- Criar tabela de relacionamento entre alunos e unidades (many-to-many)
CREATE TABLE IF NOT EXISTS teamcruz.aluno_unidades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    aluno_id UUID NOT NULL,
    unidade_id UUID NOT NULL,
    data_matricula DATE DEFAULT CURRENT_DATE,
    is_principal BOOLEAN DEFAULT FALSE, -- Define se é a unidade principal do aluno
    ativo BOOLEAN DEFAULT TRUE,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    CONSTRAINT fk_aluno_unidades_aluno
        FOREIGN KEY (aluno_id) REFERENCES teamcruz.alunos(id) ON DELETE CASCADE,
    CONSTRAINT fk_aluno_unidades_unidade
        FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id) ON DELETE CASCADE,

    -- Constraint único para evitar duplicatas
    CONSTRAINT uk_aluno_unidade UNIQUE (aluno_id, unidade_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_aluno_unidades_aluno_id ON teamcruz.aluno_unidades(aluno_id);
CREATE INDEX IF NOT EXISTS idx_aluno_unidades_unidade_id ON teamcruz.aluno_unidades(unidade_id);
CREATE INDEX IF NOT EXISTS idx_aluno_unidades_principal ON teamcruz.aluno_unidades(aluno_id, is_principal) WHERE is_principal = true;

-- Comentários
COMMENT ON TABLE teamcruz.aluno_unidades IS 'Relacionamento many-to-many entre alunos e unidades';
COMMENT ON COLUMN teamcruz.aluno_unidades.is_principal IS 'Indica se esta é a unidade principal/primária do aluno';
COMMENT ON COLUMN teamcruz.aluno_unidades.data_matricula IS 'Data de matrícula do aluno nesta unidade específica';

-- Migrar dados existentes (se houver alunos com unidade_id preenchida)
INSERT INTO teamcruz.aluno_unidades (aluno_id, unidade_id, is_principal, data_matricula)
SELECT
    id as aluno_id,
    unidade_id,
    true as is_principal, -- A unidade atual se torna a principal
    COALESCE(data_matricula, CURRENT_DATE) as data_matricula
FROM teamcruz.alunos
WHERE unidade_id IS NOT NULL
ON CONFLICT (aluno_id, unidade_id) DO NOTHING;

-- Verificar se a migração funcionou
DO $$
DECLARE
    count_migrated INTEGER;
    count_original INTEGER;
BEGIN
    SELECT COUNT(*) INTO count_original FROM teamcruz.alunos WHERE unidade_id IS NOT NULL;
    SELECT COUNT(*) INTO count_migrated FROM teamcruz.aluno_unidades;

    RAISE NOTICE 'Alunos com unidade_id: %', count_original;
    RAISE NOTICE 'Registros migrados para aluno_unidades: %', count_migrated;

    IF count_migrated >= count_original THEN
        RAISE NOTICE '✅ Migração concluída com sucesso!';
    ELSE
        RAISE WARNING '⚠️ Possível problema na migração. Verifique os dados.';
    END IF;
END $$;