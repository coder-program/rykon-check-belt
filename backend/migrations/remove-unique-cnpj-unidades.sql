-- Migration: Remover constraint UNIQUE do CNPJ de unidades
-- Motivo: Permitir múltiplas unidades sem CNPJ (projetos sociais, igrejas, etc)
-- Data: 2025-11-06

-- Remover TODAS as constraints e índices únicos do CNPJ
DROP INDEX IF EXISTS teamcruz.idx_unidades_cnpj CASCADE;
ALTER TABLE teamcruz.unidades DROP CONSTRAINT IF EXISTS unidades_cnpj_key CASCADE;
ALTER TABLE teamcruz.unidades DROP CONSTRAINT IF EXISTS idx_unidades_cnpj CASCADE;

-- Criar índice parcial: unique apenas para CNPJs não-nulos
-- Isso permite múltiplos registros com CNPJ NULL ou vazio, mas garante que CNPJs preenchidos sejam únicos
CREATE UNIQUE INDEX IF NOT EXISTS idx_unidades_cnpj_not_null
ON teamcruz.unidades(cnpj)
WHERE cnpj IS NOT NULL AND cnpj != '';

-- Comentário explicativo
COMMENT ON INDEX teamcruz.idx_unidades_cnpj_not_null IS
'Índice único parcial: garante unicidade de CNPJ apenas quando informado (não-nulo e não-vazio)';
