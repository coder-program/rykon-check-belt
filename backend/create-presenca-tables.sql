-- Script de criação das tabelas de presença e aulas
-- Baseado nas entidades do sistema TeamCruz

-- Criar o schema teamcruz se não existir
CREATE SCHEMA IF NOT EXISTS teamcruz;

-- ==============================================
-- 1. ENUMS PARA PRESENÇA E AULAS
-- ==============================================

-- Enum para dia da semana
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dia_semana_enum') THEN
        CREATE TYPE teamcruz.dia_semana_enum AS ENUM (
            '0', '1', '2', '3', '4', '5', '6'
        );
    END IF;
END $$;

-- Enum para tipo de aula
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_aula_enum') THEN
        CREATE TYPE teamcruz.tipo_aula_enum AS ENUM (
            'GI',
            'NO_GI',
            'INFANTIL',
            'FEMININO',
            'COMPETICAO',
            'LIVRE'
        );
    END IF;
END $$;

-- Enum para método de presença
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'presenca_metodo_enum') THEN
        CREATE TYPE teamcruz.presenca_metodo_enum AS ENUM (
            'qr_code',
            'cpf',
            'facial',
            'nome',
            'manual',
            'responsavel'
        );
    END IF;
END $$;

-- Enum para status de presença
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'presenca_status_enum') THEN
        CREATE TYPE teamcruz.presenca_status_enum AS ENUM (
            'presente',
            'falta',
            'justificada',
            'cancelada'
        );
    END IF;
END $$;

-- ==============================================
-- 2. TABELA TURMAS
-- ==============================================

CREATE TABLE IF NOT EXISTS teamcruz.turmas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nome VARCHAR(100) NOT NULL,
    tipo_turma VARCHAR(20) NOT NULL,
    professor_id UUID,
    unidade_id UUID,
    capacidade INTEGER DEFAULT 30 NOT NULL,
    descricao TEXT,
    nivel VARCHAR(50),
    ativo BOOLEAN DEFAULT TRUE NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Foreign Keys
    CONSTRAINT fk_turmas_unidade FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id),
    CONSTRAINT fk_turmas_professor FOREIGN KEY (professor_id) REFERENCES teamcruz.pessoas(id)
);

-- Índices para turmas
CREATE INDEX IF NOT EXISTS idx_turmas_unidade ON teamcruz.turmas(unidade_id);
CREATE INDEX IF NOT EXISTS idx_turmas_professor ON teamcruz.turmas(professor_id);
CREATE INDEX IF NOT EXISTS idx_turmas_ativo ON teamcruz.turmas(ativo);

-- ==============================================
-- 3. TABELA HORARIOS_TURMA
-- ==============================================

CREATE TABLE IF NOT EXISTS teamcruz.horarios_turma (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    turma_id UUID NOT NULL,
    dia_semana INTEGER NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    ativo BOOLEAN DEFAULT TRUE NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Foreign Keys
    CONSTRAINT fk_horarios_turma_turma FOREIGN KEY (turma_id) REFERENCES teamcruz.turmas(id) ON DELETE CASCADE
);

-- Índices para horarios_turma
CREATE INDEX IF NOT EXISTS idx_horarios_turma_turma ON teamcruz.horarios_turma(turma_id);
CREATE INDEX IF NOT EXISTS idx_horarios_turma_dia ON teamcruz.horarios_turma(dia_semana);
CREATE INDEX IF NOT EXISTS idx_horarios_turma_ativo ON teamcruz.horarios_turma(ativo);

-- ==============================================
-- 4. TABELA AULAS
-- ==============================================

CREATE TABLE IF NOT EXISTS teamcruz.aulas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    unidade_id UUID NOT NULL,
    turma_id UUID,
    professor_id UUID,
    tipo teamcruz.tipo_aula_enum DEFAULT 'GI' NOT NULL,

    -- Campos de horário
    dia_semana INTEGER CHECK (dia_semana IS NULL OR (dia_semana >= 0 AND dia_semana <= 6)),
    data_hora_inicio TIMESTAMPTZ,
    data_hora_fim TIMESTAMPTZ,

    capacidade_maxima INTEGER DEFAULT 30 NOT NULL,
    ativo BOOLEAN DEFAULT TRUE NOT NULL,

    -- QR Code
    qr_code VARCHAR(500),
    qr_code_gerado_em TIMESTAMPTZ,

    -- Configurações (JSONB)
    configuracoes JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Foreign Keys
    CONSTRAINT fk_aulas_unidade FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id),
    CONSTRAINT fk_aulas_turma FOREIGN KEY (turma_id) REFERENCES teamcruz.turmas(id),
    CONSTRAINT fk_aulas_professor FOREIGN KEY (professor_id) REFERENCES teamcruz.pessoas(id),

    -- Constraints de validação
    CONSTRAINT chk_aulas_horario_completo CHECK (
        (data_hora_inicio IS NULL AND data_hora_fim IS NULL) OR
        (data_hora_inicio IS NOT NULL AND data_hora_fim IS NOT NULL AND data_hora_inicio < data_hora_fim)
    )
);

-- Índices para aulas
CREATE INDEX IF NOT EXISTS idx_aulas_unidade_dia_inicio ON teamcruz.aulas(unidade_id, dia_semana, data_hora_inicio);
CREATE INDEX IF NOT EXISTS idx_aulas_professor ON teamcruz.aulas(professor_id);
CREATE INDEX IF NOT EXISTS idx_aulas_ativo ON teamcruz.aulas(ativo);
CREATE INDEX IF NOT EXISTS idx_aulas_qr_code ON teamcruz.aulas(qr_code) WHERE qr_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aulas_data_hora ON teamcruz.aulas(data_hora_inicio, data_hora_fim);

-- ==============================================
-- 5. TABELA PRESENCAS
-- ==============================================

CREATE TABLE IF NOT EXISTS teamcruz.presencas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    aluno_id UUID NOT NULL,
    aula_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'presente' NOT NULL
        CHECK (status IN ('presente', 'falta', 'justificada', 'cancelada')),
    modo_registro VARCHAR(20) DEFAULT 'manual' NOT NULL,
    hora_checkin TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    observacoes TEXT,
    peso_presenca DECIMAL(2,1) DEFAULT 1.0 NOT NULL,
    created_by UUID,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Foreign Keys
    CONSTRAINT fk_presencas_aluno FOREIGN KEY (aluno_id) REFERENCES teamcruz.pessoas(id),
    CONSTRAINT fk_presencas_aula FOREIGN KEY (aula_id) REFERENCES teamcruz.aulas(id),
    CONSTRAINT fk_presencas_created_by FOREIGN KEY (created_by) REFERENCES teamcruz.usuarios(id),

    -- Constraint única para evitar duplicatas
    CONSTRAINT uk_presencas_aluno_aula UNIQUE (aluno_id, aula_id)
);

-- Índices para presencas
CREATE UNIQUE INDEX IF NOT EXISTS idx_presencas_aluno_aula ON teamcruz.presencas(aluno_id, aula_id);
CREATE INDEX IF NOT EXISTS idx_presencas_aula ON teamcruz.presencas(aula_id);
CREATE INDEX IF NOT EXISTS idx_presencas_aluno ON teamcruz.presencas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_presencas_status ON teamcruz.presencas(status);
CREATE INDEX IF NOT EXISTS idx_presencas_hora_checkin ON teamcruz.presencas(hora_checkin);

-- ==============================================
-- TRIGGERS PARA UPDATE_AT AUTOMÁTICO
-- ==============================================

-- Aplicar trigger nas tabelas que têm updated_at
CREATE TRIGGER update_turmas_updated_at
    BEFORE UPDATE ON teamcruz.turmas
    FOR EACH ROW EXECUTE FUNCTION teamcruz.update_updated_at_column();

CREATE TRIGGER update_horarios_turma_updated_at
    BEFORE UPDATE ON teamcruz.horarios_turma
    FOR EACH ROW EXECUTE FUNCTION teamcruz.update_updated_at_column();

CREATE TRIGGER update_aulas_updated_at
    BEFORE UPDATE ON teamcruz.aulas
    FOR EACH ROW EXECUTE FUNCTION teamcruz.update_updated_at_column();

CREATE TRIGGER update_presencas_updated_at
    BEFORE UPDATE ON teamcruz.presencas
    FOR EACH ROW EXECUTE FUNCTION teamcruz.update_updated_at_column();

-- ==============================================
-- COMENTÁRIOS NAS TABELAS
-- ==============================================

-- Turmas
COMMENT ON TABLE teamcruz.turmas IS 'Tabela de turmas/classes do sistema';
COMMENT ON COLUMN teamcruz.turmas.tipo_turma IS 'Tipo da turma: GI, NO_GI, INFANTIL, etc.';
COMMENT ON COLUMN teamcruz.turmas.nivel IS 'Nível da turma: INICIANTE, INTERMEDIARIO, AVANCADO, etc.';

-- Horarios Turma
COMMENT ON TABLE teamcruz.horarios_turma IS 'Horários fixos das turmas (aulas recorrentes)';
COMMENT ON COLUMN teamcruz.horarios_turma.dia_semana IS 'Dia da semana: 0=Domingo, 1=Segunda, ..., 6=Sábado';

-- Aulas
COMMENT ON TABLE teamcruz.aulas IS 'Tabela de aulas (instâncias específicas de turmas)';
COMMENT ON COLUMN teamcruz.aulas.dia_semana IS 'Dia da semana para aulas recorrentes (0=Dom, 1=Seg, ..., 6=Sab)';
COMMENT ON COLUMN teamcruz.aulas.data_hora_inicio IS 'Data e hora específica de início (para aulas pontuais)';
COMMENT ON COLUMN teamcruz.aulas.data_hora_fim IS 'Data e hora específica de fim (para aulas pontuais)';
COMMENT ON COLUMN teamcruz.aulas.qr_code IS 'Código QR para check-in na aula';
COMMENT ON COLUMN teamcruz.aulas.configuracoes IS 'JSON com configurações: permite_checkin_antecipado_minutos, permite_checkin_atrasado_minutos, requer_aprovacao_professor';

-- Presenças
COMMENT ON TABLE teamcruz.presencas IS 'Tabela de presenças dos alunos nas aulas';
COMMENT ON COLUMN teamcruz.presencas.status IS 'Status da presença: presente, falta, justificada, cancelada';
COMMENT ON COLUMN teamcruz.presencas.modo_registro IS 'Como foi registrada: qr_code, cpf, facial, nome, manual, responsavel';
COMMENT ON COLUMN teamcruz.presencas.peso_presenca IS 'Peso da presença (1.0 = presença completa, 0.5 = meia presença, etc.)';

-- ==============================================
-- FUNÇÕES AUXILIARES
-- ==============================================

-- Função para verificar se aula está ativa
CREATE OR REPLACE FUNCTION teamcruz.aula_esta_ativa(
    p_aula_id UUID,
    p_data_hora TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
) RETURNS BOOLEAN AS $$
DECLARE
    v_aula RECORD;
    v_margem_antes INTEGER := 15; -- minutos
    v_margem_depois INTEGER := 30; -- minutos
    v_inicio_com_margem TIMESTAMPTZ;
    v_fim_com_margem TIMESTAMPTZ;
    v_dia_hoje INTEGER;
    v_hora_agora INTEGER;
BEGIN
    -- Buscar dados da aula
    SELECT * INTO v_aula
    FROM teamcruz.aulas
    WHERE id = p_aula_id AND ativo = TRUE;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Extrair margens das configurações se existirem
    IF v_aula.configuracoes IS NOT NULL THEN
        v_margem_antes := COALESCE((v_aula.configuracoes->>'permite_checkin_antecipado_minutos')::INTEGER, 15);
        v_margem_depois := COALESCE((v_aula.configuracoes->>'permite_checkin_atrasado_minutos')::INTEGER, 30);
    END IF;

    -- Se tiver data_hora_inicio e data_hora_fim, usar timestamps completos
    IF v_aula.data_hora_inicio IS NOT NULL AND v_aula.data_hora_fim IS NOT NULL THEN
        v_inicio_com_margem := v_aula.data_hora_inicio - (v_margem_antes || ' minutes')::INTERVAL;
        v_fim_com_margem := v_aula.data_hora_fim + (v_margem_depois || ' minutes')::INTERVAL;

        RETURN p_data_hora >= v_inicio_com_margem AND p_data_hora <= v_fim_com_margem;
    END IF;

    -- Fallback: usar dia_semana se estiver preenchido
    IF v_aula.dia_semana IS NOT NULL THEN
        v_dia_hoje := EXTRACT(DOW FROM p_data_hora);

        IF v_dia_hoje != v_aula.dia_semana THEN
            RETURN FALSE;
        END IF;

        -- Lógica adicional para horários fixos seria implementada aqui
        -- Por simplicidade, retorna TRUE se for o dia correto
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar QR Code
CREATE OR REPLACE FUNCTION teamcruz.gerar_qr_code_aula(p_aula_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_timestamp BIGINT;
    v_random VARCHAR(13);
    v_qr_code VARCHAR(500);
BEGIN
    v_timestamp := EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT;
    v_random := substr(md5(random()::TEXT), 1, 13);
    v_qr_code := 'QR-AULA-' || p_aula_id::TEXT || '-' || v_timestamp::TEXT || '-' || v_random;

    -- Atualizar a aula com o novo QR code
    UPDATE teamcruz.aulas
    SET qr_code = v_qr_code, qr_code_gerado_em = CURRENT_TIMESTAMP
    WHERE id = p_aula_id;

    RETURN v_qr_code;
END;
$$ LANGUAGE plpgsql;

-- Função para registrar presença
CREATE OR REPLACE FUNCTION teamcruz.registrar_presenca(
    p_aluno_id UUID,
    p_aula_id UUID,
    p_modo_registro VARCHAR DEFAULT 'manual',
    p_created_by UUID DEFAULT NULL,
    p_observacoes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_presenca_id UUID;
BEGIN
    -- Inserir ou atualizar presença
    INSERT INTO teamcruz.presencas (
        aluno_id,
        aula_id,
        status,
        modo_registro,
        hora_checkin,
        created_by,
        observacoes
    ) VALUES (
        p_aluno_id,
        p_aula_id,
        'presente',
        p_modo_registro,
        CURRENT_TIMESTAMP,
        p_created_by,
        p_observacoes
    )
    ON CONFLICT (aluno_id, aula_id)
    DO UPDATE SET
        status = 'presente',
        modo_registro = p_modo_registro,
        hora_checkin = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO v_presenca_id;

    RETURN v_presenca_id;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar aulas ativas agora
CREATE OR REPLACE FUNCTION teamcruz.buscar_aulas_ativas(
    p_unidade_id UUID DEFAULT NULL,
    p_data_hora TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
) RETURNS TABLE (
    aula_id UUID,
    nome VARCHAR,
    professor_nome VARCHAR,
    tipo VARCHAR,
    capacidade_maxima INTEGER,
    total_presencas BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.nome,
        COALESCE(p.nome_completo, 'Sem professor') as professor_nome,
        a.tipo::VARCHAR,
        a.capacidade_maxima,
        COUNT(pr.id) as total_presencas
    FROM teamcruz.aulas a
    LEFT JOIN teamcruz.pessoas p ON a.professor_id = p.id
    LEFT JOIN teamcruz.presencas pr ON a.id = pr.aula_id AND pr.status = 'presente'
    WHERE a.ativo = TRUE
    AND (p_unidade_id IS NULL OR a.unidade_id = p_unidade_id)
    AND teamcruz.aula_esta_ativa(a.id, p_data_hora)
    GROUP BY a.id, a.nome, p.nome_completo, a.tipo, a.capacidade_maxima
    ORDER BY a.nome;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- DADOS INICIAIS E EXEMPLOS
-- ==============================================

-- Inserir configurações padrão para aulas
INSERT INTO teamcruz.aulas (nome, unidade_id, tipo, configuracoes)
SELECT
    'Aula Exemplo',
    u.id,
    'GI',
    '{"permite_checkin_antecipado_minutos": 15, "permite_checkin_atrasado_minutos": 30, "requer_aprovacao_professor": false}'::jsonb
FROM teamcruz.unidades u
WHERE NOT EXISTS (SELECT 1 FROM teamcruz.aulas)
LIMIT 1;

-- ==============================================
-- VIEWS ÚTEIS
-- ==============================================

-- View para estatísticas de presença por aluno
CREATE OR REPLACE VIEW teamcruz.vw_estatisticas_presenca_aluno AS
SELECT
    p.id as aluno_id,
    p.nome_completo,
    p.unidade_id,
    COUNT(pr.id) FILTER (WHERE pr.status = 'presente') as total_presencas,
    COUNT(pr.id) FILTER (WHERE pr.status = 'falta') as total_faltas,
    COUNT(pr.id) FILTER (WHERE pr.status = 'justificada') as total_justificadas,
    COUNT(pr.id) as total_aulas_participadas,
    ROUND(
        COUNT(pr.id) FILTER (WHERE pr.status = 'presente')::DECIMAL /
        NULLIF(COUNT(pr.id), 0) * 100,
        2
    ) as percentual_presenca
FROM teamcruz.pessoas p
LEFT JOIN teamcruz.presencas pr ON p.id = pr.aluno_id
WHERE p.tipo_cadastro = 'ALUNO'
GROUP BY p.id, p.nome_completo, p.unidade_id;

-- View para aulas do dia
CREATE OR REPLACE VIEW teamcruz.vw_aulas_hoje AS
SELECT
    a.id,
    a.nome,
    a.tipo,
    u.nome as unidade_nome,
    p.nome_completo as professor_nome,
    a.data_hora_inicio,
    a.data_hora_fim,
    a.capacidade_maxima,
    COUNT(pr.id) as total_presencas_confirmadas
FROM teamcruz.aulas a
LEFT JOIN teamcruz.unidades u ON a.unidade_id = u.id
LEFT JOIN teamcruz.pessoas p ON a.professor_id = p.id
LEFT JOIN teamcruz.presencas pr ON a.id = pr.aula_id AND pr.status = 'presente'
WHERE a.ativo = TRUE
AND (
    a.dia_semana = EXTRACT(DOW FROM CURRENT_DATE) OR
    DATE(a.data_hora_inicio) = CURRENT_DATE
)
GROUP BY a.id, a.nome, a.tipo, u.nome, p.nome_completo, a.data_hora_inicio, a.data_hora_fim, a.capacidade_maxima
ORDER BY a.data_hora_inicio NULLS LAST;

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
    'turmas',
    'horarios_turma',
    'aulas',
    'presencas'
)
ORDER BY tablename;

-- Mostrar as funções criadas
SELECT
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'teamcruz'
AND routine_name LIKE '%aula%' OR routine_name LIKE '%presenca%'
ORDER BY routine_name;