-- Script para criar a tabela professor_unidades
-- Execute este script no banco de dados PostgreSQL

-- Criar a tabela professor_unidades
CREATE TABLE IF NOT EXISTS teamcruz.professor_unidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professor_id UUID NOT NULL,
    unidade_id UUID NOT NULL,
    is_principal BOOLEAN DEFAULT false NOT NULL,
    data_vinculo DATE DEFAULT CURRENT_DATE NOT NULL,
    data_desvinculo DATE,
    ativo BOOLEAN DEFAULT true NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- Foreign Keys
    CONSTRAINT fk_professor_unidades_professor
        FOREIGN KEY (professor_id) REFERENCES teamcruz.professores(id) ON DELETE CASCADE,
    CONSTRAINT fk_professor_unidades_unidade
        FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id) ON DELETE CASCADE,

    -- Constraint para evitar vínculos duplicados
    CONSTRAINT uk_professor_unidade UNIQUE (professor_id, unidade_id)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_professor_unidades_professor_id ON teamcruz.professor_unidades(professor_id);
CREATE INDEX IF NOT EXISTS idx_professor_unidades_unidade_id ON teamcruz.professor_unidades(unidade_id);
CREATE INDEX IF NOT EXISTS idx_professor_unidades_ativo ON teamcruz.professor_unidades(ativo);
CREATE INDEX IF NOT EXISTS idx_professor_unidades_principal ON teamcruz.professor_unidades(is_principal);

-- Criar trigger para updated_at
CREATE TRIGGER update_professor_unidades_updated_at
    BEFORE UPDATE ON teamcruz.professor_unidades
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE teamcruz.professor_unidades IS 'Tabela de relacionamento entre professores e unidades';
COMMENT ON COLUMN teamcruz.professor_unidades.is_principal IS 'Indica se esta é a unidade principal do professor';
COMMENT ON COLUMN teamcruz.professor_unidades.data_vinculo IS 'Data de início do vínculo com a unidade';
COMMENT ON COLUMN teamcruz.professor_unidades.data_desvinculo IS 'Data de fim do vínculo (se houver)';
COMMENT ON COLUMN teamcruz.professor_unidades.ativo IS 'Status do vínculo (ativo/inativo)';

-- Verificar se a tabela foi criada
SELECT 'Tabela professor_unidades criada com sucesso!' as status;

-- Verificar a estrutura
\d teamcruz.professor_unidades;