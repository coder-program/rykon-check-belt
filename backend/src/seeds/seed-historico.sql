-- Script para popular histórico de graduações com dados de teste

-- Inserir alguns registros de graduação no histórico
-- Usando IDs das faixas e alunos existentes

DO $$
DECLARE
    aluno1_id UUID;
    aluno2_id UUID;
    faixa_branca_id UUID;
    faixa_amarela_id UUID;
    faixa_laranja_id UUID;
BEGIN
    -- Buscar IDs dos alunos
    SELECT id INTO aluno1_id FROM teamcruz.pessoas 
    WHERE tipo_cadastro = 'ALUNO' 
    ORDER BY created_at 
    LIMIT 1;
    
    SELECT id INTO aluno2_id FROM teamcruz.pessoas 
    WHERE tipo_cadastro = 'ALUNO' 
    ORDER BY created_at 
    LIMIT 1 OFFSET 1;
    
    -- Buscar IDs das faixas
    SELECT id INTO faixa_branca_id FROM teamcruz.faixa_def 
    WHERE codigo = 'BRANCA' AND categoria = 'ADULTO';
    
    SELECT id INTO faixa_amarela_id FROM teamcruz.faixa_def 
    WHERE codigo = 'AMARELA' AND categoria = 'ADULTO';
    
    SELECT id INTO faixa_laranja_id FROM teamcruz.faixa_def 
    WHERE codigo = 'LARANJA' AND categoria = 'ADULTO';
    
    -- Inserir graduações apenas se não existirem
    IF aluno1_id IS NOT NULL AND faixa_branca_id IS NOT NULL AND faixa_amarela_id IS NOT NULL THEN
        -- Primeira graduação do aluno 1: Branca -> Amarela
        INSERT INTO teamcruz.aluno_graduacao (
            id,
            aluno_id,
            faixa_origem_id,
            faixa_destino_id,
            dt_graduacao,
            observacao,
            created_at
        ) 
        SELECT 
            gen_random_uuid(),
            aluno1_id,
            faixa_branca_id,
            faixa_amarela_id,
            NOW() - INTERVAL '60 days',
            'Graduação de teste - primeira graduação',
            NOW() - INTERVAL '60 days'
        WHERE NOT EXISTS (
            SELECT 1 FROM teamcruz.aluno_graduacao 
            WHERE aluno_id = aluno1_id 
            AND faixa_origem_id = faixa_branca_id 
            AND faixa_destino_id = faixa_amarela_id
        );
        
        -- Segunda graduação do aluno 1: Amarela -> Laranja
        IF faixa_laranja_id IS NOT NULL THEN
            INSERT INTO teamcruz.aluno_graduacao (
                id,
                aluno_id,
                faixa_origem_id,
                faixa_destino_id,
                dt_graduacao,
                observacao,
                created_at
            ) 
            SELECT 
                gen_random_uuid(),
                aluno1_id,
                faixa_amarela_id,
                faixa_laranja_id,
                NOW() - INTERVAL '30 days',
                'Graduação de teste - segunda graduação',
                NOW() - INTERVAL '30 days'
            WHERE NOT EXISTS (
                SELECT 1 FROM teamcruz.aluno_graduacao 
                WHERE aluno_id = aluno1_id 
                AND faixa_origem_id = faixa_amarela_id 
                AND faixa_destino_id = faixa_laranja_id
            );
        END IF;
    END IF;
    
    -- Graduação do aluno 2: Branca -> Amarela
    IF aluno2_id IS NOT NULL AND faixa_branca_id IS NOT NULL AND faixa_amarela_id IS NOT NULL THEN
        INSERT INTO teamcruz.aluno_graduacao (
            id,
            aluno_id,
            faixa_origem_id,
            faixa_destino_id,
            dt_graduacao,
            observacao,
            created_at
        ) 
        SELECT 
            gen_random_uuid(),
            aluno2_id,
            faixa_branca_id,
            faixa_amarela_id,
            NOW() - INTERVAL '45 days',
            'Graduação de teste - primeira graduação',
            NOW() - INTERVAL '45 days'
        WHERE NOT EXISTS (
            SELECT 1 FROM teamcruz.aluno_graduacao 
            WHERE aluno_id = aluno2_id 
            AND faixa_origem_id = faixa_branca_id 
            AND faixa_destino_id = faixa_amarela_id
        );
    END IF;
    
    RAISE NOTICE 'Histórico de graduações criado com sucesso!';
END $$;

-- Verificar o resultado
SELECT 
    ag.id,
    p.nome_completo as aluno,
    fo.nome_exibicao as faixa_origem,
    fd.nome_exibicao as faixa_destino,
    ag.dt_graduacao,
    ag.observacao
FROM teamcruz.aluno_graduacao ag
JOIN teamcruz.pessoas p ON p.id = ag.aluno_id
JOIN teamcruz.faixa_def fo ON fo.id = ag.faixa_origem_id
JOIN teamcruz.faixa_def fd ON fd.id = ag.faixa_destino_id
ORDER BY ag.dt_graduacao DESC;
