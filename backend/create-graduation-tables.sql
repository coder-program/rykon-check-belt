-- Script de criação das tabelas de graduação e endereços
-- Baseado nas entidades do sistema TeamCruz

-- Criar o schema teamcruz se não existir
CREATE SCHEMA IF NOT EXISTS teamcruz;

-- ==============================================
-- 1. TABELA ENDERECOS
-- ==============================================

CREATE TABLE IF NOT EXISTS teamcruz.enderecos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cep VARCHAR(8) NOT NULL,
    logradouro VARCHAR(200) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    complemento VARCHAR(100),
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    pais VARCHAR(50) DEFAULT 'Brasil' NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Índices para enderecos
CREATE INDEX IF NOT EXISTS idx_enderecos_cep ON teamcruz.enderecos(cep);
CREATE INDEX IF NOT EXISTS idx_enderecos_cidade_estado ON teamcruz.enderecos(cidade, estado);

-- ==============================================
-- 2. ENUMS PARA GRADUAÇÃO
-- ==============================================

-- Enum para categoria de faixa
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'categoria_faixa_enum') THEN
        CREATE TYPE teamcruz.categoria_faixa_enum AS ENUM (
            'ADULTO',
            'INFANTIL',
            'MESTRE'
        );
    END IF;
END $$;

-- Enum para origem do grau
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'origem_grau_enum') THEN
        CREATE TYPE teamcruz.origem_grau_enum AS ENUM (
            'MANUAL',
            'AUTOMATICO',
            'IMPORTACAO',
            'EVENTO'
        );
    END IF;
END $$;

-- ==============================================
-- 3. TABELA FAIXA_DEF (Definições de Faixas)
-- ==============================================

CREATE TABLE IF NOT EXISTS teamcruz.faixa_def (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nome_exibicao VARCHAR(40) NOT NULL,
    cor_hex VARCHAR(7) NOT NULL,
    ordem INTEGER NOT NULL,
    graus_max INTEGER DEFAULT 4 NOT NULL,
    aulas_por_grau INTEGER DEFAULT 40 NOT NULL,
    categoria teamcruz.categoria_faixa_enum DEFAULT 'ADULTO' NOT NULL,
    ativo BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Índices para faixa_def
CREATE UNIQUE INDEX IF NOT EXISTS idx_faixa_def_codigo ON teamcruz.faixa_def(codigo);
CREATE INDEX IF NOT EXISTS idx_faixa_def_ordem ON teamcruz.faixa_def(ordem);
CREATE INDEX IF NOT EXISTS idx_faixa_def_categoria ON teamcruz.faixa_def(categoria);

-- ==============================================
-- 4. TABELA ALUNO_FAIXA
-- ==============================================

CREATE TABLE IF NOT EXISTS teamcruz.aluno_faixa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID NOT NULL,
    faixa_def_id UUID NOT NULL,
    ativa BOOLEAN DEFAULT TRUE NOT NULL,
    dt_inicio DATE NOT NULL,
    dt_fim DATE,
    graus_atual INTEGER DEFAULT 0 NOT NULL,
    presencas_no_ciclo INTEGER DEFAULT 0 NOT NULL,
    presencas_total_fx INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Foreign Keys (descomente se as tabelas existirem)
    -- CONSTRAINT fk_aluno_faixa_aluno FOREIGN KEY (aluno_id) REFERENCES teamcruz.alunos(id) ON DELETE CASCADE,
    CONSTRAINT fk_aluno_faixa_faixa_def FOREIGN KEY (faixa_def_id) REFERENCES teamcruz.faixa_def(id) ON DELETE RESTRICT
);

-- Índices para aluno_faixa
CREATE INDEX IF NOT EXISTS idx_aluno_faixa_aluno_ativa ON teamcruz.aluno_faixa(aluno_id, ativa);
CREATE INDEX IF NOT EXISTS idx_aluno_faixa_faixa_def ON teamcruz.aluno_faixa(faixa_def_id);

-- ==============================================
-- 5. TABELA ALUNO_FAIXA_GRAU
-- ==============================================

CREATE TABLE IF NOT EXISTS teamcruz.aluno_faixa_grau (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_faixa_id UUID NOT NULL,
    grau_num INTEGER NOT NULL,
    dt_concessao TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    concedido_por UUID,
    observacao TEXT,
    origem teamcruz.origem_grau_enum DEFAULT 'MANUAL' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Foreign Keys
    CONSTRAINT fk_aluno_faixa_grau_aluno_faixa FOREIGN KEY (aluno_faixa_id) REFERENCES teamcruz.aluno_faixa(id) ON DELETE CASCADE
    -- CONSTRAINT fk_aluno_faixa_grau_usuario FOREIGN KEY (concedido_por) REFERENCES teamcruz.usuarios(id) -- Descomente se existir
);

-- Índices para aluno_faixa_grau
CREATE INDEX IF NOT EXISTS idx_aluno_faixa_grau_aluno_faixa ON teamcruz.aluno_faixa_grau(aluno_faixa_id);
CREATE INDEX IF NOT EXISTS idx_aluno_faixa_grau_concedido_por ON teamcruz.aluno_faixa_grau(concedido_por);

-- ==============================================
-- 6. TABELA ALUNO_GRADUACAO
-- ==============================================

CREATE TABLE IF NOT EXISTS teamcruz.aluno_graduacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID NOT NULL,
    faixa_origem_id UUID NOT NULL,
    faixa_destino_id UUID NOT NULL,
    dt_graduacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    concedido_por UUID,
    observacao TEXT,
    aprovado BOOLEAN DEFAULT FALSE NOT NULL,
    aprovado_por UUID,
    dt_aprovacao TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Foreign Keys
    -- CONSTRAINT fk_aluno_graduacao_aluno FOREIGN KEY (aluno_id) REFERENCES teamcruz.alunos(id) ON DELETE CASCADE,
    CONSTRAINT fk_aluno_graduacao_faixa_origem FOREIGN KEY (faixa_origem_id) REFERENCES teamcruz.faixa_def(id) ON DELETE RESTRICT,
    CONSTRAINT fk_aluno_graduacao_faixa_destino FOREIGN KEY (faixa_destino_id) REFERENCES teamcruz.faixa_def(id) ON DELETE RESTRICT
    -- CONSTRAINT fk_aluno_graduacao_concedido_por FOREIGN KEY (concedido_por) REFERENCES teamcruz.usuarios(id),
    -- CONSTRAINT fk_aluno_graduacao_aprovado_por FOREIGN KEY (aprovado_por) REFERENCES teamcruz.usuarios(id)
);

-- Índices para aluno_graduacao
CREATE INDEX IF NOT EXISTS idx_aluno_graduacao_aluno ON teamcruz.aluno_graduacao(aluno_id);
CREATE INDEX IF NOT EXISTS idx_aluno_graduacao_aprovado ON teamcruz.aluno_graduacao(aprovado);
CREATE INDEX IF NOT EXISTS idx_aluno_graduacao_dt_graduacao ON teamcruz.aluno_graduacao(dt_graduacao);

-- ==============================================
-- 7. TABELA HISTORICO_FAIXAS
-- ==============================================

CREATE TABLE IF NOT EXISTS teamcruz.historico_faixas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID NOT NULL,
    faixa_origem_id UUID,
    faixa_destino_id UUID NOT NULL,
    data_promocao DATE DEFAULT CURRENT_DATE NOT NULL,
    evento VARCHAR(200),
    certificado_url TEXT,
    observacoes TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Foreign Keys
    -- CONSTRAINT fk_historico_faixas_aluno FOREIGN KEY (aluno_id) REFERENCES teamcruz.alunos(id) ON DELETE CASCADE,
    CONSTRAINT fk_historico_faixas_origem FOREIGN KEY (faixa_origem_id) REFERENCES teamcruz.faixa_def(id) ON DELETE RESTRICT,
    CONSTRAINT fk_historico_faixas_destino FOREIGN KEY (faixa_destino_id) REFERENCES teamcruz.faixa_def(id) ON DELETE RESTRICT
    -- CONSTRAINT fk_historico_faixas_created_by FOREIGN KEY (created_by) REFERENCES teamcruz.usuarios(id) ON DELETE SET NULL
);

-- Índices para historico_faixas
CREATE INDEX IF NOT EXISTS idx_historico_faixas_aluno ON teamcruz.historico_faixas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_historico_faixas_data_promocao ON teamcruz.historico_faixas(data_promocao);

-- ==============================================
-- 8. TABELA HISTORICO_GRAUS
-- ==============================================

CREATE TABLE IF NOT EXISTS teamcruz.historico_graus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID NOT NULL,
    faixa_id UUID NOT NULL,
    grau_numero INTEGER NOT NULL,
    data_concessao DATE DEFAULT CURRENT_DATE NOT NULL,
    origem_grau teamcruz.origem_grau_enum DEFAULT 'AUTOMATICO' NOT NULL,
    aulas_acumuladas INTEGER,
    justificativa TEXT,
    certificado_url TEXT,
    evento_id UUID,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Foreign Keys
    -- CONSTRAINT fk_historico_graus_aluno FOREIGN KEY (aluno_id) REFERENCES teamcruz.alunos(id) ON DELETE CASCADE,
    CONSTRAINT fk_historico_graus_faixa FOREIGN KEY (faixa_id) REFERENCES teamcruz.faixa_def(id) ON DELETE RESTRICT
    -- CONSTRAINT fk_historico_graus_created_by FOREIGN KEY (created_by) REFERENCES teamcruz.usuarios(id) ON DELETE SET NULL
);

-- Índices para historico_graus
CREATE INDEX IF NOT EXISTS idx_historico_graus_aluno ON teamcruz.historico_graus(aluno_id);
CREATE INDEX IF NOT EXISTS idx_historico_graus_faixa ON teamcruz.historico_graus(faixa_id);
CREATE INDEX IF NOT EXISTS idx_historico_graus_data_concessao ON teamcruz.historico_graus(data_concessao);

-- ==============================================
-- COMENTÁRIOS NAS TABELAS
-- ==============================================

-- Endereços
COMMENT ON TABLE teamcruz.enderecos IS 'Tabela de endereços do sistema';
COMMENT ON COLUMN teamcruz.enderecos.cep IS 'CEP sem hífen (8 dígitos)';
COMMENT ON COLUMN teamcruz.enderecos.latitude IS 'Coordenada de latitude para geolocalização';
COMMENT ON COLUMN teamcruz.enderecos.longitude IS 'Coordenada de longitude para geolocalização';

-- Faixa Def
COMMENT ON TABLE teamcruz.faixa_def IS 'Definições das faixas do Jiu-Jitsu';
COMMENT ON COLUMN teamcruz.faixa_def.codigo IS 'Código único da faixa (ex: BRANCA, AZUL, ROXA)';
COMMENT ON COLUMN teamcruz.faixa_def.cor_hex IS 'Cor da faixa em hexadecimal (#FFFFFF)';
COMMENT ON COLUMN teamcruz.faixa_def.ordem IS 'Ordem hierárquica da faixa';
COMMENT ON COLUMN teamcruz.faixa_def.graus_max IS 'Número máximo de graus na faixa (geralmente 4)';
COMMENT ON COLUMN teamcruz.faixa_def.aulas_por_grau IS 'Número de aulas necessárias por grau';

-- Aluno Faixa
COMMENT ON TABLE teamcruz.aluno_faixa IS 'Relacionamento entre aluno e suas faixas';
COMMENT ON COLUMN teamcruz.aluno_faixa.ativa IS 'Indica se é a faixa atual do aluno';
COMMENT ON COLUMN teamcruz.aluno_faixa.graus_atual IS 'Número atual de graus na faixa';
COMMENT ON COLUMN teamcruz.aluno_faixa.presencas_no_ciclo IS 'Presenças no ciclo atual para próximo grau';
COMMENT ON COLUMN teamcruz.aluno_faixa.presencas_total_fx IS 'Total de presenças na faixa';

-- ==============================================
-- TRIGGER PARA UPDATE_AT AUTOMÁTICO
-- ==============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION teamcruz.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger nas tabelas que têm updated_at
CREATE TRIGGER update_enderecos_updated_at
    BEFORE UPDATE ON teamcruz.enderecos
    FOR EACH ROW EXECUTE FUNCTION teamcruz.update_updated_at_column();

CREATE TRIGGER update_faixa_def_updated_at
    BEFORE UPDATE ON teamcruz.faixa_def
    FOR EACH ROW EXECUTE FUNCTION teamcruz.update_updated_at_column();

CREATE TRIGGER update_aluno_faixa_updated_at
    BEFORE UPDATE ON teamcruz.aluno_faixa
    FOR EACH ROW EXECUTE FUNCTION teamcruz.update_updated_at_column();

-- ==============================================
-- DADOS INICIAIS PARA FAIXA_DEF
-- ==============================================

-- Inserir faixas padrão se não existirem
INSERT INTO teamcruz.faixa_def (codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria)
SELECT * FROM (VALUES
    ('BRANCA', 'Faixa Branca', '#FFFFFF', 1, 4, 40, 'ADULTO'::teamcruz.categoria_faixa_enum),
    ('AZUL', 'Faixa Azul', '#0066CC', 2, 4, 40, 'ADULTO'::teamcruz.categoria_faixa_enum),
    ('ROXA', 'Faixa Roxa', '#6600CC', 3, 4, 40, 'ADULTO'::teamcruz.categoria_faixa_enum),
    ('MARROM', 'Faixa Marrom', '#8B4513', 4, 4, 40, 'ADULTO'::teamcruz.categoria_faixa_enum),
    ('PRETA', 'Faixa Preta', '#000000', 5, 10, 50, 'ADULTO'::teamcruz.categoria_faixa_enum),
    ('CORAL', 'Faixa Coral', '#FF7F50', 6, 1, 0, 'MESTRE'::teamcruz.categoria_faixa_enum),
    ('VERMELHA', 'Faixa Vermelha', '#FF0000', 7, 1, 0, 'MESTRE'::teamcruz.categoria_faixa_enum)
) AS dados(codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria)
WHERE NOT EXISTS (SELECT 1 FROM teamcruz.faixa_def WHERE codigo = dados.codigo);

-- ==============================================
-- VERIFICAÇÕES FINAIS
-- ==============================================

-- Listar todas as tabelas criadas
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'teamcruz'
AND tablename IN (
    'enderecos',
    'faixa_def',
    'aluno_faixa',
    'aluno_faixa_grau',
    'aluno_graduacao',
    'historico_faixas',
    'historico_graus'
)
ORDER BY tablename;

-- Mostrar as faixas inseridas
SELECT codigo, nome_exibicao, ordem, categoria FROM teamcruz.faixa_def ORDER BY ordem;