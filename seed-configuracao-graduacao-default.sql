-- Seed: Insert default graduation configurations for all existing units
-- Description: Creates default config for units that don't have one yet

INSERT INTO teamcruz.configuracoes_graduacao (
    unidade_id,
    aulas_minimas_por_grau,
    graus_maximos,
    tempo_minimo_branca_meses,
    tempo_minimo_azul_meses,
    tempo_minimo_roxa_meses,
    tempo_minimo_marrom_meses,
    tempo_minimo_preta_meses,
    percentual_frequencia_minima,
    config_adicional
)
SELECT
    u.id as unidade_id,
    40, -- aulas_minimas_por_grau (padrão)
    4,  -- graus_maximos (padrão)
    12, -- tempo_minimo_branca_meses (1 ano)
    24, -- tempo_minimo_azul_meses (2 anos)
    24, -- tempo_minimo_roxa_meses (2 anos)
    18, -- tempo_minimo_marrom_meses (1.5 anos)
    NULL, -- tempo_minimo_preta_meses (sem limite definido)
    75.00, -- percentual_frequencia_minima (75%)
    NULL -- config_adicional
FROM teamcruz.unidades u
WHERE NOT EXISTS (
    SELECT 1
    FROM teamcruz.configuracoes_graduacao cg
    WHERE cg.unidade_id = u.id
)
AND u.status = 'ATIVA';

-- Verificar quantas configurações foram criadas
SELECT
    COUNT(*) as total_configs,
    'Configurações padrão criadas com sucesso' as mensagem
FROM teamcruz.configuracoes_graduacao;

-- Exibir exemplo de configuração criada
SELECT
    cg.id,
    u.nome as unidade,
    cg.aulas_minimas_por_grau,
    cg.graus_maximos,
    cg.tempo_minimo_branca_meses,
    cg.tempo_minimo_azul_meses,
    cg.tempo_minimo_roxa_meses,
    cg.tempo_minimo_marrom_meses,
    cg.percentual_frequencia_minima,
    cg.created_at
FROM teamcruz.configuracoes_graduacao cg
JOIN teamcruz.unidades u ON u.id = cg.unidade_id
LIMIT 5;
