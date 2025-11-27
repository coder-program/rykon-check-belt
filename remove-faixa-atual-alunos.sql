-- REMOVER COLUNA faixa_atual DA TABELA alunos
-- A fonte de verdade para faixa deve ser APENAS aluno_faixas

BEGIN;

-- Remover a coluna faixa_atual
ALTER TABLE teamcruz.alunos
DROP COLUMN IF EXISTS faixa_atual;

-- Remover também a coluna graus (redundante)
ALTER TABLE teamcruz.alunos
DROP COLUMN IF EXISTS graus;

-- Verificar estrutura
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'teamcruz'
  AND table_name = 'alunos'
  AND column_name IN ('faixa_atual', 'graus');

COMMIT;
