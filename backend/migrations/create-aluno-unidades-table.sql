-- Criar tabela de relacionamento entre alunos e unidades
-- Similar à tabela professor_unidades, permite que um aluno esteja vinculado a múltiplas unidades

CREATE TABLE IF NOT EXISTS teamcruz.aluno_unidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID NOT NULL,
    unidade_id UUID NOT NULL,
    is_principal BOOLEAN DEFAULT false,
    data_matricula TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_vinculo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_desvinculo TIMESTAMP,
    ativo BOOLEAN DEFAULT true,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    CONSTRAINT fk_aluno_unidades_aluno
        FOREIGN KEY (aluno_id)
        REFERENCES teamcruz.pessoas(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_aluno_unidades_unidade
        FOREIGN KEY (unidade_id)
        REFERENCES teamcruz.unidades(id)
        ON DELETE CASCADE,

    -- Evitar duplicatas de aluno + unidade
    CONSTRAINT uq_aluno_unidade UNIQUE (aluno_id, unidade_id)
);

-- Índices para melhorar performance
CREATE INDEX idx_aluno_unidades_aluno ON teamcruz.aluno_unidades(aluno_id);
CREATE INDEX idx_aluno_unidades_unidade ON teamcruz.aluno_unidades(unidade_id);
CREATE INDEX idx_aluno_unidades_principal ON teamcruz.aluno_unidades(aluno_id, is_principal) WHERE is_principal = true;
CREATE INDEX idx_aluno_unidades_ativo ON teamcruz.aluno_unidades(ativo) WHERE ativo = true;

-- Comentários
COMMENT ON TABLE teamcruz.aluno_unidades IS 'Relacionamento many-to-many entre alunos e unidades - permite aluno frequentar múltiplas unidades';
COMMENT ON COLUMN teamcruz.aluno_unidades.is_principal IS 'Indica se esta é a unidade principal do aluno';
COMMENT ON COLUMN teamcruz.aluno_unidades.ativo IS 'Indica se o vínculo está ativo (aluno matriculado)';
