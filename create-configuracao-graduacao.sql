-- Migration: Create configuracao_graduacao table
-- Description: Stores per-unit graduation configuration rules

CREATE TABLE IF NOT EXISTS teamcruz.configuracoes_graduacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unidade_id UUID NOT NULL UNIQUE,

    -- Configurações gerais
    aulas_minimas_por_grau INT NOT NULL DEFAULT 40,
    graus_maximos INT NOT NULL DEFAULT 4,

    -- Tempo mínimo por faixa (em meses)
    tempo_minimo_branca_meses INT NOT NULL DEFAULT 12,
    tempo_minimo_azul_meses INT NOT NULL DEFAULT 24,
    tempo_minimo_roxa_meses INT NOT NULL DEFAULT 24,
    tempo_minimo_marrom_meses INT NOT NULL DEFAULT 18,
    tempo_minimo_preta_meses INT,

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

-- Comentários para documentação
COMMENT ON TABLE teamcruz.configuracoes_graduacao IS
    'Configurações de graduação por unidade - cada unidade pode ter suas próprias regras';

COMMENT ON COLUMN teamcruz.configuracoes_graduacao.aulas_minimas_por_grau IS
    'Número mínimo de aulas necessárias para avançar um grau';

COMMENT ON COLUMN teamcruz.configuracoes_graduacao.graus_maximos IS
    'Número máximo de graus em cada faixa (geralmente 4)';

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
