-- ==============================================
-- TABELA DE PARAMETRIZAÇÃO DE GRADUAÇÃO
-- ==============================================

CREATE TABLE IF NOT EXISTS teamcruz.graduacao_parametros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    tipo_periodo VARCHAR(20) NOT NULL CHECK (tipo_periodo IN ('MEIO_ANO', 'FIM_ANO', 'ESPECIAL')),
    graus_minimos INTEGER DEFAULT 4 NOT NULL,
    presencas_minimas INTEGER DEFAULT 160 NOT NULL,
    ativo BOOLEAN DEFAULT TRUE NOT NULL,
    unidade_id UUID, -- NULL = todas unidades
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT fk_graduacao_parametros_unidade FOREIGN KEY (unidade_id)
        REFERENCES teamcruz.unidades(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_graduacao_parametros_ativo ON teamcruz.graduacao_parametros(ativo);
CREATE INDEX IF NOT EXISTS idx_graduacao_parametros_tipo_periodo ON teamcruz.graduacao_parametros(tipo_periodo);
CREATE INDEX IF NOT EXISTS idx_graduacao_parametros_data_inicio ON teamcruz.graduacao_parametros(data_inicio);
CREATE INDEX IF NOT EXISTS idx_graduacao_parametros_unidade ON teamcruz.graduacao_parametros(unidade_id);

-- Comentários
COMMENT ON TABLE teamcruz.graduacao_parametros IS 'Parametrização de períodos de graduação';
COMMENT ON COLUMN teamcruz.graduacao_parametros.tipo_periodo IS 'Tipo: MEIO_ANO (Junho), FIM_ANO (Dezembro), ESPECIAL';
COMMENT ON COLUMN teamcruz.graduacao_parametros.graus_minimos IS 'Mínimo de graus necessários para graduar (padrão 4)';
COMMENT ON COLUMN teamcruz.graduacao_parametros.presencas_minimas IS 'Mínimo de presenças necessárias (4 graus x 40 aulas = 160)';
COMMENT ON COLUMN teamcruz.graduacao_parametros.unidade_id IS 'NULL = válido para todas unidades';

-- Trigger para updated_at
CREATE TRIGGER update_graduacao_parametros_updated_at
    BEFORE UPDATE ON teamcruz.graduacao_parametros
    FOR EACH ROW EXECUTE FUNCTION teamcruz.update_updated_at_column();

-- ==============================================
-- ADICIONAR CAMPOS NA TABELA aluno_graduacao
-- ==============================================

-- Adicionar campo parametro_id para vincular à parametrização
ALTER TABLE teamcruz.aluno_graduacao
ADD COLUMN IF NOT EXISTS parametro_id UUID,
ADD COLUMN IF NOT EXISTS solicitado_em TIMESTAMP,
ADD COLUMN IF NOT EXISTS observacao_aprovacao TEXT;

-- Foreign key
ALTER TABLE teamcruz.aluno_graduacao
ADD CONSTRAINT fk_aluno_graduacao_parametro
    FOREIGN KEY (parametro_id) REFERENCES teamcruz.graduacao_parametros(id) ON DELETE SET NULL;

-- Índice
CREATE INDEX IF NOT EXISTS idx_aluno_graduacao_parametro ON teamcruz.aluno_graduacao(parametro_id);

-- ==============================================
-- VIEW: Alunos Aptos para Graduação
-- ==============================================

CREATE OR REPLACE VIEW teamcruz.v_alunos_aptos_graduacao AS
SELECT
    a.id as aluno_id,
    a.nome as aluno_nome,
    a.cpf as aluno_cpf,
    a.unidade_id,
    u.nome as unidade_nome,

    -- Faixa atual
    af.id as aluno_faixa_id,
    fd.id as faixa_atual_id,
    fd.codigo as faixa_atual_codigo,
    fd.nome_exibicao as faixa_atual_nome,
    fd.cor_hex as faixa_atual_cor,
    af.graus_atual,
    af.presencas_total_fx,
    af.dt_inicio as data_inicio_faixa,

    -- Próxima faixa
    fd_prox.id as proxima_faixa_id,
    fd_prox.codigo as proxima_faixa_codigo,
    fd_prox.nome_exibicao as proxima_faixa_nome,
    fd_prox.cor_hex as proxima_faixa_cor,

    -- Status graduação
    ag.id as graduacao_id,
    ag.aprovado as graduacao_aprovada,
    ag.aprovado_por as graduacao_aprovado_por_id,
    ag.dt_aprovacao as graduacao_data_aprovacao,
    ag.solicitado_em,
    ag.observacao,
    ag.observacao_aprovacao,

    -- Parâmetros
    gp.id as parametro_id,
    gp.nome as parametro_nome,
    gp.tipo_periodo as parametro_tipo,
    gp.data_inicio as parametro_data_inicio,
    gp.data_fim as parametro_data_fim,
    gp.graus_minimos as parametro_graus_minimos,
    gp.presencas_minimas as parametro_presencas_minimas,

    -- Verificações
    CASE
        WHEN af.graus_atual >= COALESCE(gp.graus_minimos, 4) THEN TRUE
        ELSE FALSE
    END as graus_suficientes,

    CASE
        WHEN af.presencas_total_fx >= COALESCE(gp.presencas_minimas, 160) THEN TRUE
        ELSE FALSE
    END as presencas_suficientes,

    CASE
        WHEN af.dt_inicio <= CURRENT_DATE - INTERVAL '6 months' THEN TRUE
        ELSE FALSE
    END as tempo_minimo_cumprido,

    CASE
        WHEN af.graus_atual >= COALESCE(gp.graus_minimos, 4)
         AND af.presencas_total_fx >= COALESCE(gp.presencas_minimas, 160)
         AND af.dt_inicio <= CURRENT_DATE - INTERVAL '6 months'
        THEN TRUE
        ELSE FALSE
    END as apto_graduar,

    -- Audit
    a.created_at as aluno_criado_em,
    a.updated_at as aluno_atualizado_em

FROM teamcruz.alunos a
INNER JOIN teamcruz.unidades u ON u.id = a.unidade_id
INNER JOIN teamcruz.aluno_faixa af ON af.aluno_id = a.id AND af.ativa = TRUE
INNER JOIN teamcruz.faixa_def fd ON fd.id = af.faixa_def_id
LEFT JOIN teamcruz.faixa_def fd_prox ON fd_prox.ordem = fd.ordem + 1 AND fd_prox.categoria = fd.categoria
LEFT JOIN teamcruz.aluno_graduacao ag ON ag.aluno_id = a.id AND ag.faixa_origem_id = fd.id
LEFT JOIN teamcruz.graduacao_parametros gp ON gp.id = ag.parametro_id OR (gp.ativo = TRUE AND gp.unidade_id IS NULL)
WHERE a.ativo = TRUE
  AND fd.codigo != 'PRETA' -- Preta e acima têm regras especiais
ORDER BY u.nome, a.nome;

COMMENT ON VIEW teamcruz.v_alunos_aptos_graduacao IS 'View de alunos aptos para graduação com todas as verificações';

-- ==============================================
-- FUNCTION: Verificar se aluno está apto
-- ==============================================

CREATE OR REPLACE FUNCTION teamcruz.fn_verificar_aluno_apto_graduacao(
    p_aluno_id UUID,
    p_parametro_id UUID DEFAULT NULL
) RETURNS TABLE (
    apto BOOLEAN,
    graus_atual INTEGER,
    graus_necessarios INTEGER,
    presencas_total INTEGER,
    presencas_necessarias INTEGER,
    tempo_faixa_dias INTEGER,
    tempo_minimo_dias INTEGER,
    motivos_reprovacao TEXT[]
) AS $$
DECLARE
    v_graus_min INTEGER;
    v_presencas_min INTEGER;
    v_graus_atual INTEGER;
    v_presencas_total INTEGER;
    v_dt_inicio DATE;
    v_tempo_dias INTEGER;
    v_motivos TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Buscar parâmetros
    IF p_parametro_id IS NOT NULL THEN
        SELECT graus_minimos, presencas_minimas
        INTO v_graus_min, v_presencas_min
        FROM teamcruz.graduacao_parametros
        WHERE id = p_parametro_id AND ativo = TRUE;
    END IF;

    -- Valores padrão se não encontrou parâmetro
    v_graus_min := COALESCE(v_graus_min, 4);
    v_presencas_min := COALESCE(v_presencas_min, 160);

    -- Buscar dados do aluno
    SELECT
        af.graus_atual,
        af.presencas_total_fx,
        af.dt_inicio,
        CURRENT_DATE - af.dt_inicio
    INTO v_graus_atual, v_presencas_total, v_dt_inicio, v_tempo_dias
    FROM teamcruz.aluno_faixa af
    WHERE af.aluno_id = p_aluno_id AND af.ativa = TRUE;

    -- Verificar critérios
    IF v_graus_atual < v_graus_min THEN
        v_motivos := array_append(v_motivos,
            format('Faltam %s graus', v_graus_min - v_graus_atual));
    END IF;

    IF v_presencas_total < v_presencas_min THEN
        v_motivos := array_append(v_motivos,
            format('Faltam %s presenças', v_presencas_min - v_presencas_total));
    END IF;

    IF v_tempo_dias < 180 THEN
        v_motivos := array_append(v_motivos,
            format('Faltam %s dias na faixa', 180 - v_tempo_dias));
    END IF;

    RETURN QUERY SELECT
        (array_length(v_motivos, 1) IS NULL) as apto,
        v_graus_atual,
        v_graus_min,
        v_presencas_total,
        v_presencas_min,
        v_tempo_dias,
        180,
        v_motivos;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- DADOS INICIAIS
-- ==============================================

-- Inserir parâmetros padrão para 2025
INSERT INTO teamcruz.graduacao_parametros (nome, descricao, data_inicio, data_fim, tipo_periodo, graus_minimos, presencas_minimas, ativo)
VALUES
    ('Graduação Meio do Ano 2025', 'Período de graduação de Junho/2025', '2025-06-01', '2025-06-30', 'MEIO_ANO', 4, 160, TRUE),
    ('Graduação Fim do Ano 2025', 'Período de graduação de Dezembro/2025', '2025-12-01', '2025-12-31', 'FIM_ANO', 4, 160, TRUE)
ON CONFLICT DO NOTHING;

-- ==============================================
-- VERIFICAÇÕES
-- ==============================================

SELECT
    'graduacao_parametros' as tabela,
    COUNT(*) as total_registros
FROM teamcruz.graduacao_parametros
UNION ALL
SELECT
    'v_alunos_aptos_graduacao' as tabela,
    COUNT(*) as total_registros
FROM teamcruz.v_alunos_aptos_graduacao;
