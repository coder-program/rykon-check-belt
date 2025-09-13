-- Script para popular as tabelas de graduação com os alunos existentes
-- Execute este script no PostgreSQL para criar os dados necessários

-- 1. Primeiro, vamos verificar os alunos existentes
SELECT id, nome_completo, faixa_atual, grau_atual, tipo_cadastro 
FROM pessoas 
WHERE tipo_cadastro = 'ALUNO';

-- 2. Inserir definições de faixas se ainda não existirem
INSERT INTO teamcruz.faixa_def (id, codigo, nome_exibicao, cor_hex, ordem, categoria, graus_max, aulas_por_grau, ativo)
VALUES 
    -- Faixas Adulto
    ('f1111111-1111-1111-1111-111111111111', 'BRANCA', 'Branca', '#FFFFFF', 1, 'ADULTO', 4, 20, true),
    ('f2222222-2222-2222-2222-222222222222', 'AZUL', 'Azul', '#0066CC', 2, 'ADULTO', 4, 25, true),
    ('f3333333-3333-3333-3333-333333333333', 'ROXA', 'Roxa', '#663399', 3, 'ADULTO', 4, 30, true),
    ('f4444444-4444-4444-4444-444444444444', 'MARROM', 'Marrom', '#8B4513', 4, 'ADULTO', 4, 35, true),
    ('f5555555-5555-5555-5555-555555555555', 'PRETA', 'Preta', '#000000', 5, 'ADULTO', 6, 40, true),
    
    -- Faixas Kids
    ('f6666666-6666-6666-6666-666666666666', 'CINZA', 'Cinza', '#808080', 1, 'INFANTIL', 4, 15, true),
    ('f7777777-7777-7777-7777-777777777777', 'CINZA_BRANCO', 'Cinza e Branco', '#808080', 2, 'INFANTIL', 4, 15, true),
    ('f8888888-8888-8888-8888-888888888888', 'CINZA_PRETO', 'Cinza e Preto', '#808080', 3, 'INFANTIL', 4, 15, true),
    ('f9999999-9999-9999-9999-999999999999', 'AMARELA', 'Amarela', '#FFD700', 4, 'INFANTIL', 4, 15, true),
    ('faaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'AMARELA_BRANCA', 'Amarela e Branca', '#FFD700', 5, 'INFANTIL', 4, 15, true),
    ('fbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'AMARELA_PRETA', 'Amarela e Preta', '#FFD700', 6, 'INFANTIL', 4, 15, true),
    ('fcccccc-cccc-cccc-cccc-cccccccccccc', 'LARANJA', 'Laranja', '#FF8C00', 7, 'INFANTIL', 4, 15, true),
    ('fdddddd-dddd-dddd-dddd-dddddddddddd', 'VERDE', 'Verde', '#008000', 10, 'INFANTIL', 4, 15, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Criar registros em aluno_faixa para cada aluno existente
-- Este query cria uma faixa ativa para cada aluno baseado em sua faixa_atual
INSERT INTO teamcruz.aluno_faixa (
    id,
    aluno_id, 
    faixa_def_id, 
    ativa, 
    dt_inicio, 
    graus_atual, 
    presencas_no_ciclo, 
    presencas_total_fx
)
SELECT 
    gen_random_uuid() as id,
    p.id as aluno_id,
    CASE 
        WHEN UPPER(p.faixa_atual) = 'BRANCA' THEN 'f1111111-1111-1111-1111-111111111111'
        WHEN UPPER(p.faixa_atual) = 'AZUL' THEN 'f2222222-2222-2222-2222-222222222222'
        WHEN UPPER(p.faixa_atual) = 'ROXA' THEN 'f3333333-3333-3333-3333-333333333333'
        WHEN UPPER(p.faixa_atual) = 'MARROM' THEN 'f4444444-4444-4444-4444-444444444444'
        WHEN UPPER(p.faixa_atual) = 'PRETA' THEN 'f5555555-5555-5555-5555-555555555555'
        WHEN UPPER(p.faixa_atual) LIKE '%CINZA%' AND UPPER(p.faixa_atual) LIKE '%BRANCO%' THEN 'f7777777-7777-7777-7777-777777777777'
        WHEN UPPER(p.faixa_atual) LIKE '%CINZA%' AND UPPER(p.faixa_atual) LIKE '%PRETO%' THEN 'f8888888-8888-8888-8888-888888888888'
        WHEN UPPER(p.faixa_atual) LIKE '%CINZA%' THEN 'f6666666-6666-6666-6666-666666666666'
        WHEN UPPER(p.faixa_atual) LIKE '%AMARELA%' AND UPPER(p.faixa_atual) LIKE '%BRANCA%' THEN 'faaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
        WHEN UPPER(p.faixa_atual) LIKE '%AMARELA%' AND UPPER(p.faixa_atual) LIKE '%PRETA%' THEN 'fbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
        WHEN UPPER(p.faixa_atual) LIKE '%AMARELA%' THEN 'f9999999-9999-9999-9999-999999999999'
        WHEN UPPER(p.faixa_atual) LIKE '%LARANJA%' THEN 'fcccccc-cccc-cccc-cccc-cccccccccccc'
        WHEN UPPER(p.faixa_atual) LIKE '%VERDE%' THEN 'fdddddd-dddd-dddd-dddd-dddddddddddd'
        ELSE 'f1111111-1111-1111-1111-111111111111' -- Default: Branca
    END as faixa_def_id,
    true as ativa,
    CURRENT_DATE - INTERVAL '6 months' as dt_inicio,
    COALESCE(p.grau_atual, 0) as graus_atual,
    FLOOR(RANDOM() * 20) as presencas_no_ciclo, -- Simula presenças aleatórias
    FLOOR(RANDOM() * 100) as presencas_total_fx -- Simula total de presenças
FROM pessoas p
WHERE p.tipo_cadastro = 'ALUNO'
  AND p.status = 'ATIVO'
  AND NOT EXISTS (
    SELECT 1 FROM teamcruz.aluno_faixa af 
    WHERE af.aluno_id = p.id AND af.ativa = true
  );

-- 4. Verificar os dados criados
SELECT 
    p.nome_completo,
    p.faixa_atual,
    p.grau_atual,
    fd.nome_exibicao as faixa_sistema,
    af.graus_atual,
    af.presencas_no_ciclo,
    fd.aulas_por_grau - af.presencas_no_ciclo as faltam_aulas
FROM teamcruz.aluno_faixa af
JOIN pessoas p ON p.id = af.aluno_id
JOIN teamcruz.faixa_def fd ON fd.id = af.faixa_def_id
WHERE af.ativa = true
ORDER BY faltam_aulas ASC;

-- 5. (Opcional) Adicionar alguns graus históricos para teste
-- Isso criará histórico de graduação para visualização
INSERT INTO teamcruz.aluno_faixa_grau (
    id,
    aluno_faixa_id,
    grau_num,
    dt_concessao,
    observacao,
    origem
)
SELECT 
    gen_random_uuid(),
    af.id,
    1,
    CURRENT_DATE - INTERVAL '3 months',
    'Grau inicial - migração do sistema',
    'MANUAL'
FROM teamcruz.aluno_faixa af
WHERE af.graus_atual >= 1
  AND NOT EXISTS (
    SELECT 1 FROM teamcruz.aluno_faixa_grau afg 
    WHERE afg.aluno_faixa_id = af.id AND afg.grau_num = 1
  )
LIMIT 5; -- Adiciona para até 5 alunos como exemplo
