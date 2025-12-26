-- Corrigir valores NULL ou não definidos para requer_aprovacao_checkin
-- Define como false (não requer aprovação) por padrão para todas as unidades existentes

-- 1. Verificar estado atual
SELECT
    id,
    nome,
    requer_aprovacao_checkin,
    CASE
        WHEN requer_aprovacao_checkin IS NULL THEN 'NULL (será corrigido)'
        WHEN requer_aprovacao_checkin = true THEN 'TRUE (requer aprovação)'
        WHEN requer_aprovacao_checkin = false THEN 'FALSE (não requer aprovação)'
    END as status
FROM unidades
ORDER BY nome;

-- 2. Atualizar valores NULL para false
UPDATE unidades
SET requer_aprovacao_checkin = false
WHERE requer_aprovacao_checkin IS NULL;

-- 3. Verificar resultado
SELECT
    COUNT(*) as total,
    SUM(CASE WHEN requer_aprovacao_checkin = true THEN 1 ELSE 0 END) as requer_aprovacao,
    SUM(CASE WHEN requer_aprovacao_checkin = false THEN 1 ELSE 0 END) as nao_requer_aprovacao,
    SUM(CASE WHEN requer_aprovacao_checkin IS NULL THEN 1 ELSE 0 END) as nulos
FROM unidades;

-- 4. Listar unidades que REQUEREM aprovação (se houver alguma configurada assim)
SELECT id, nome, requer_aprovacao_checkin
FROM unidades
WHERE requer_aprovacao_checkin = true
ORDER BY nome;
