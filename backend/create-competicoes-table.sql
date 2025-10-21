-- =====================================================
-- SISTEMA DE COMPETIÇÕES/CAMPEONATOS
-- =====================================================

-- Tabela de Competições/Campeonatos
CREATE TABLE IF NOT EXISTS teamcruz.competicoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Informações básicas
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    organizador VARCHAR(255),

    -- Tipo de competição
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('LOCAL', 'REGIONAL', 'ESTADUAL', 'NACIONAL', 'INTERNACIONAL', 'INTERNO')),
    modalidade VARCHAR(50) NOT NULL CHECK (modalidade IN ('GI', 'NO_GI', 'AMBOS')),

    -- Data e Local
    data_inicio DATE NOT NULL,
    data_fim DATE,
    local VARCHAR(255),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    pais VARCHAR(50) DEFAULT 'Brasil',

    -- Informações adicionais
    site_url VARCHAR(500),
    regulamento_url VARCHAR(500),
    valor_inscricao DECIMAL(10, 2),

    -- Status
    status VARCHAR(30) NOT NULL DEFAULT 'AGENDADA' CHECK (status IN ('AGENDADA', 'EM_ANDAMENTO', 'FINALIZADA', 'CANCELADA')),
    ativo BOOLEAN DEFAULT true,

    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,

    -- Índices para busca
    CONSTRAINT competicoes_nome_data_uk UNIQUE (nome, data_inicio)
);

-- Tabela de Participações em Competições
CREATE TABLE IF NOT EXISTS teamcruz.aluno_competicoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relacionamentos
    aluno_id UUID NOT NULL,
    competicao_id UUID NOT NULL REFERENCES teamcruz.competicoes(id) ON DELETE CASCADE,

    -- Categoria competida
    categoria_peso VARCHAR(50),
    categoria_idade VARCHAR(50),
    categoria_faixa VARCHAR(50),

    -- Resultado
    colocacao INTEGER,
    posicao VARCHAR(20) CHECK (posicao IN ('OURO', 'PRATA', 'BRONZE', 'PARTICIPOU', 'DESCLASSIFICADO')),
    total_lutas INTEGER DEFAULT 0,
    vitorias INTEGER DEFAULT 0,
    derrotas INTEGER DEFAULT 0,

    -- Detalhes
    observacoes TEXT,
    peso_pesagem DECIMAL(5, 2),
    tempo_total_lutas VARCHAR(20), -- ex: "15:30"

    -- Premiação
    premiacao_valor DECIMAL(10, 2),
    premiacao_descricao VARCHAR(255),

    -- Documentos/Mídia
    certificado_url VARCHAR(500),
    foto_premiacao_url VARCHAR(500),
    video_url VARCHAR(500),

    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,

    -- Constraints
    CONSTRAINT aluno_competicoes_aluno_competicao_uk UNIQUE (aluno_id, competicao_id, categoria_peso, categoria_faixa),
    CONSTRAINT aluno_competicoes_colocacao_check CHECK (colocacao > 0)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_competicoes_data_inicio ON teamcruz.competicoes(data_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_competicoes_tipo ON teamcruz.competicoes(tipo);
CREATE INDEX IF NOT EXISTS idx_competicoes_status ON teamcruz.competicoes(status);
CREATE INDEX IF NOT EXISTS idx_competicoes_cidade ON teamcruz.competicoes(cidade);

CREATE INDEX IF NOT EXISTS idx_aluno_competicoes_aluno ON teamcruz.aluno_competicoes(aluno_id);
CREATE INDEX IF NOT EXISTS idx_aluno_competicoes_competicao ON teamcruz.aluno_competicoes(competicao_id);
CREATE INDEX IF NOT EXISTS idx_aluno_competicoes_posicao ON teamcruz.aluno_competicoes(posicao);
CREATE INDEX IF NOT EXISTS idx_aluno_competicoes_created_at ON teamcruz.aluno_competicoes(created_at DESC);

-- Comentários
COMMENT ON TABLE teamcruz.competicoes IS 'Tabela de competições/campeonatos de Jiu-Jitsu';
COMMENT ON TABLE teamcruz.aluno_competicoes IS 'Histórico de participações dos alunos em competições';

COMMENT ON COLUMN teamcruz.competicoes.tipo IS 'Tipo de competição: LOCAL, REGIONAL, ESTADUAL, NACIONAL, INTERNACIONAL, INTERNO';
COMMENT ON COLUMN teamcruz.competicoes.modalidade IS 'Modalidade: GI (com kimono), NO_GI (sem kimono), AMBOS';
COMMENT ON COLUMN teamcruz.competicoes.status IS 'Status: AGENDADA, EM_ANDAMENTO, FINALIZADA, CANCELADA';

COMMENT ON COLUMN teamcruz.aluno_competicoes.posicao IS 'Posição obtida: OURO (1º), PRATA (2º), BRONZE (3º), PARTICIPOU, DESCLASSIFICADO';
COMMENT ON COLUMN teamcruz.aluno_competicoes.categoria_peso IS 'Categoria de peso competida (ex: Leve, Médio, Pesado, Absoluto)';
COMMENT ON COLUMN teamcruz.aluno_competicoes.categoria_idade IS 'Categoria de idade (ex: Juvenil, Adulto, Master 1)';

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION teamcruz.update_competicoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER trigger_competicoes_updated_at
    BEFORE UPDATE ON teamcruz.competicoes
    FOR EACH ROW
    EXECUTE FUNCTION teamcruz.update_competicoes_updated_at();

CREATE TRIGGER trigger_aluno_competicoes_updated_at
    BEFORE UPDATE ON teamcruz.aluno_competicoes
    FOR EACH ROW
    EXECUTE FUNCTION teamcruz.update_competicoes_updated_at();

-- Dados de exemplo (opcional - remover em produção)
-- INSERT INTO teamcruz.competicoes (nome, tipo, modalidade, data_inicio, local, cidade, estado, status) VALUES
-- ('Copa TeamCruz 2025', 'INTERNO', 'AMBOS', '2025-11-15', 'Academia TeamCruz', 'São Paulo', 'SP', 'AGENDADA'),
-- ('Campeonato Estadual de Jiu-Jitsu', 'ESTADUAL', 'GI', '2025-12-10', 'Ginásio Municipal', 'São Paulo', 'SP', 'AGENDADA'),
-- ('IBJJF World Championship', 'INTERNACIONAL', 'AMBOS', '2026-05-20', 'Long Beach Convention Center', 'Long Beach', 'CA', 'AGENDADA');

COMMENT ON TABLE teamcruz.competicoes IS 'Registro de competições/campeonatos disponíveis';
COMMENT ON TABLE teamcruz.aluno_competicoes IS 'Histórico de participações e resultados dos alunos em competições';
