-- Migration: Create configuracao_graduacao_v2 (ESTRUTURA CORRETA)
-- Description: Stores per-unit and per-belt graduation configuration rules

-- ESTRUTURA CORRETA: Cada unidade tem configurações por faixa
-- Exemplo de config_faixas JSONB:
-- {
--   "BRANCA": {
--     "tempo_minimo_meses": 12,
--     "aulas_por_grau": 40,
--     "graus_maximos": 4
--   },
--   "AZUL": {
--     "tempo_minimo_meses": 24,
--     "aulas_por_grau": 40,
--     "graus_maximos": 4
--   },
--   ...
-- }

-- Se a tabela antiga existe, vamos dropar
DROP TABLE IF EXISTS teamcruz.configuracoes_graduacao CASCADE;

CREATE TABLE teamcruz.configuracoes_graduacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unidade_id UUID NOT NULL UNIQUE,

    -- Configurações por faixa (JSONB com estrutura flexível)
    -- Cada chave é o código da faixa (ex: BRANCA, AZUL, BRANCA_INF, etc)
    -- Cada valor contém: tempo_minimo_meses, aulas_por_grau, graus_maximos
    config_faixas JSONB NOT NULL DEFAULT '{
        "BRANCA_INF": {"tempo_minimo_meses": 6, "aulas_por_grau": 30, "graus_maximos": 4},
        "CINZA_BRANCA_INF": {"tempo_minimo_meses": 6, "aulas_por_grau": 30, "graus_maximos": 4},
        "CINZA_INF": {"tempo_minimo_meses": 6, "aulas_por_grau": 30, "graus_maximos": 4},
        "CINZA_PRETA_INF": {"tempo_minimo_meses": 6, "aulas_por_grau": 30, "graus_maximos": 4},
        "AMAR_BRANCA_INF": {"tempo_minimo_meses": 6, "aulas_por_grau": 30, "graus_maximos": 4},
        "AMARELA_INF": {"tempo_minimo_meses": 6, "aulas_por_grau": 30, "graus_maximos": 4},
        "AMAR_PRETA_INF": {"tempo_minimo_meses": 6, "aulas_por_grau": 30, "graus_maximos": 4},
        "LARA_BRANCA_INF": {"tempo_minimo_meses": 6, "aulas_por_grau": 30, "graus_maximos": 4},
        "LARANJA_INF": {"tempo_minimo_meses": 6, "aulas_por_grau": 30, "graus_maximos": 4},
        "LARA_PRETA_INF": {"tempo_minimo_meses": 6, "aulas_por_grau": 30, "graus_maximos": 4},
        "VERDE_BRANCA_INF": {"tempo_minimo_meses": 6, "aulas_por_grau": 30, "graus_maximos": 4},
        "VERDE_INF": {"tempo_minimo_meses": 6, "aulas_por_grau": 30, "graus_maximos": 4},
        "VERDE_PRETA_INF": {"tempo_minimo_meses": 6, "aulas_por_grau": 30, "graus_maximos": 4},
        "BRANCA": {"tempo_minimo_meses": 12, "aulas_por_grau": 40, "graus_maximos": 4},
        "AZUL": {"tempo_minimo_meses": 24, "aulas_por_grau": 40, "graus_maximos": 4},
        "ROXA": {"tempo_minimo_meses": 24, "aulas_por_grau": 40, "graus_maximos": 4},
        "MARROM": {"tempo_minimo_meses": 18, "aulas_por_grau": 40, "graus_maximos": 4},
        "PRETA": {"tempo_minimo_meses": null, "aulas_por_grau": 40, "graus_maximos": 10}
    }'::jsonb,

    -- Percentual mínimo de frequência para graduação (0-100)
    percentual_frequencia_minima DECIMAL(5,2) DEFAULT 75.00,

    -- Configuração adicional (flexível para futuras expansões)
    config_adicional JSONB,

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key
    CONSTRAINT fk_configuracao_graduacao_unidade
        FOREIGN KEY (unidade_id)
        REFERENCES teamcruz.unidades(id)
        ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX idx_configuracoes_graduacao_unidade_id
    ON teamcruz.configuracoes_graduacao(unidade_id);

-- Índice GIN para buscar dentro do JSONB
CREATE INDEX idx_configuracoes_graduacao_config_faixas
    ON teamcruz.configuracoes_graduacao USING GIN (config_faixas);

-- Comentários para documentação
COMMENT ON TABLE teamcruz.configuracoes_graduacao IS
    'Configurações de graduação por unidade - cada faixa pode ter suas próprias regras';

COMMENT ON COLUMN teamcruz.configuracoes_graduacao.config_faixas IS
    'JSONB com configurações específicas por faixa: tempo_minimo_meses, aulas_por_grau, graus_maximos';

COMMENT ON COLUMN teamcruz.configuracoes_graduacao.percentual_frequencia_minima IS
    'Percentual mínimo de frequência necessário para graduação (0-100)';

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION teamcruz.update_configuracao_graduacao_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_configuracao_graduacao_updated_at
    BEFORE UPDATE ON teamcruz.configuracoes_graduacao
    FOR EACH ROW
    EXECUTE FUNCTION teamcruz.update_configuracao_graduacao_updated_at();

-- Exemplos de queries úteis:

-- Buscar config de uma faixa específica:
-- SELECT config_faixas->'BRANCA' FROM teamcruz.configuracoes_graduacao WHERE unidade_id = 'xxx';

-- Buscar tempo mínimo da faixa azul:
-- SELECT config_faixas->'AZUL'->>'tempo_minimo_meses' FROM teamcruz.configuracoes_graduacao WHERE unidade_id = 'xxx';

-- Atualizar config de uma faixa específica:
-- UPDATE teamcruz.configuracoes_graduacao
-- SET config_faixas = jsonb_set(config_faixas, '{BRANCA,tempo_minimo_meses}', '18')
-- WHERE unidade_id = 'xxx';
