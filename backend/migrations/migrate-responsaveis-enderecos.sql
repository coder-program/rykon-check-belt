-- Migration: Migrar endereços de responsáveis dos campos legados para tabela enderecos
-- Data: 2026-02-05
-- Descrição: Move dados de endereço dos campos diretos em responsaveis para a tabela enderecos

BEGIN;

-- 1. Criar endereços para responsáveis que tem dados de endereço mas não tem endereco_id
INSERT INTO teamcruz.enderecos (
    id,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    pais,
    latitude,
    longitude,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid() as id,
    r.cep,
    r.logradouro,
    r.numero,
    r.complemento,
    r.bairro,
    r.cidade,
    r.estado,
    COALESCE(r.pais, 'Brasil') as pais,
    NULL as latitude,
    NULL as longitude,
    NOW() as created_at,
    NOW() as updated_at
FROM teamcruz.responsaveis r
WHERE 
    -- Tem dados de endereço nos campos legados
    (r.cep IS NOT NULL AND r.cep != '' AND r.cidade IS NOT NULL AND r.cidade != '')
    -- Mas ainda não tem endereco_id
    AND r.endereco_id IS NULL
    -- E não foi deletado
    AND r.ativo = true;

-- 2. Atualizar responsaveis.endereco_id com os IDs dos endereços criados
-- Fazemos um match baseado em todos os campos de endereço para garantir o endereço correto
UPDATE teamcruz.responsaveis r
SET 
    endereco_id = e.id,
    updated_at = NOW()
FROM teamcruz.enderecos e
WHERE 
    r.endereco_id IS NULL
    AND r.cep IS NOT NULL 
    AND r.cep != ''
    AND e.cep = r.cep
    AND COALESCE(e.logradouro, '') = COALESCE(r.logradouro, '')
    AND COALESCE(e.numero, '') = COALESCE(r.numero, '')
    AND COALESCE(e.complemento, '') = COALESCE(r.complemento, '')
    AND COALESCE(e.bairro, '') = COALESCE(r.bairro, '')
    AND COALESCE(e.cidade, '') = COALESCE(r.cidade, '')
    AND COALESCE(e.estado, '') = COALESCE(r.estado, '');

-- 3. Relatório: Mostrar quantos responsáveis foram migrados
DO $$
DECLARE
    total_migrados INTEGER;
    total_pendentes INTEGER;
BEGIN
    -- Contar migrados (tem endereco_id)
    SELECT COUNT(*) INTO total_migrados
    FROM teamcruz.responsaveis
    WHERE endereco_id IS NOT NULL;
    
    -- Contar pendentes (tem dados mas não tem endereco_id)
    SELECT COUNT(*) INTO total_pendentes
    FROM teamcruz.responsaveis
    WHERE endereco_id IS NULL 
    AND (cep IS NOT NULL AND cep != '' AND cidade IS NOT NULL AND cidade != '');
    
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Migration: Responsáveis Endereços';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Responsáveis com endereço migrado: %', total_migrados;
    RAISE NOTICE 'Responsáveis pendentes de migração: %', total_pendentes;
    RAISE NOTICE '==============================================';
END $$;

-- 4. Listar responsáveis que ainda precisam de endereço cadastrado
SELECT 
    id,
    nome_completo,
    cpf,
    email,
    CASE 
        WHEN cep IS NULL OR cep = '' THEN 'CEP não cadastrado'
        WHEN cidade IS NULL OR cidade = '' THEN 'Cidade não cadastrada'
        ELSE 'Dados incompletos'
    END as status_endereco
FROM teamcruz.responsaveis
WHERE 
    endereco_id IS NULL 
    AND ativo = true
    AND (
        cep IS NULL OR cep = '' OR 
        cidade IS NULL OR cidade = ''
    )
ORDER BY nome_completo;

COMMIT;

-- Comentário: 
-- Esta migration pode ser executada múltiplas vezes sem problemas (idempotente)
-- Responsáveis sem dados de endereço precisarão ter o endereço cadastrado manualmente
