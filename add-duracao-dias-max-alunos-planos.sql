-- Adicionar colunas duracao_dias e max_alunos à tabela planos
-- Execute este SQL no banco de dados

-- 1. Adicionar coluna duracao_dias (em dias, calculado de duracao_meses)
ALTER TABLE teamcruz.planos
ADD COLUMN IF NOT EXISTS duracao_dias INT;

-- 2. Preencher duracao_dias baseado em duracao_meses existente
UPDATE teamcruz.planos
SET duracao_dias = duracao_meses * 30
WHERE duracao_dias IS NULL;

-- 3. Adicionar coluna max_alunos (opcional)
ALTER TABLE teamcruz.planos
ADD COLUMN IF NOT EXISTS max_alunos INT;

-- 4. Verificar as colunas adicionadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'teamcruz'
AND table_name = 'planos'
AND column_name IN ('duracao_dias', 'max_alunos')
ORDER BY column_name;

-- 5. Ver dados de exemplo
SELECT id, nome, tipo, duracao_meses, duracao_dias, max_alunos
FROM teamcruz.planos
LIMIT 5;
