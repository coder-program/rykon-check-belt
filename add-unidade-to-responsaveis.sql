-- Adicionar coluna unidade_id na tabela responsaveis
ALTER TABLE teamcruz.responsaveis
ADD COLUMN IF NOT EXISTS unidade_id UUID;

-- Comentário na coluna
COMMENT ON COLUMN teamcruz.responsaveis.unidade_id IS 'Unidade à qual o responsável está vinculado';

-- Verificar responsáveis sem unidade_id
SELECT
    r.id,
    r.usuario_id,
    r.nome_completo,
    r.unidade_id,
    u.nome as usuario_nome,
    u.email
FROM teamcruz.responsaveis r
INNER JOIN teamcruz.usuarios u ON r.usuario_id = u.id
WHERE r.unidade_id IS NULL;
