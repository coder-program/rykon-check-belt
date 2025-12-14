-- Seed: Insert default graduation configurations for all existing units (V2 - CORRETO)
-- Description: Creates default config for units that don't have one yet

INSERT INTO teamcruz.configuracoes_graduacao (
    unidade_id,
    config_faixas,
    percentual_frequencia_minima,
    config_adicional
)
SELECT
    u.id as unidade_id,
    '{
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
    }'::jsonb as config_faixas,
    75.00 as percentual_frequencia_minima,
    NULL as config_adicional
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
    'Configurações padrão criadas com sucesso (estrutura correta por faixa)' as mensagem
FROM teamcruz.configuracoes_graduacao;

-- Exibir exemplo de configuração criada
SELECT
    cg.id,
    u.nome as unidade,
    cg.config_faixas,
    cg.percentual_frequencia_minima,
    cg.created_at
FROM teamcruz.configuracoes_graduacao cg
JOIN teamcruz.unidades u ON u.id = cg.unidade_id
LIMIT 3;

-- Exemplo: Ver configuração da faixa BRANCA
SELECT
    u.nome as unidade,
    cg.config_faixas->'BRANCA' as config_branca
FROM teamcruz.configuracoes_graduacao cg
JOIN teamcruz.unidades u ON u.id = cg.unidade_id
LIMIT 3;
