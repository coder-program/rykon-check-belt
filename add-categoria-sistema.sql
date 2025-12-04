-- Adicionar categoria SISTEMA nas constraints de despesas e transações
-- Este script atualiza as constraints existentes para incluir a nova categoria

-- 1. Atualizar constraint de DESPESAS
ALTER TABLE teamcruz.despesas
DROP CONSTRAINT IF EXISTS despesas_categoria_check;

ALTER TABLE teamcruz.despesas
ADD CONSTRAINT despesas_categoria_check
CHECK (categoria IN (
  'SISTEMA',
  'ALUGUEL',
  'AGUA',
  'LUZ',
  'INTERNET',
  'TELEFONE',
  'SALARIO',
  'FORNECEDOR',
  'MANUTENCAO',
  'MATERIAL',
  'LIMPEZA',
  'MARKETING',
  'TAXA',
  'OUTRO'
));

-- 2. Atualizar constraint de TRANSAÇÕES
ALTER TABLE teamcruz.transacoes
DROP CONSTRAINT IF EXISTS transacoes_categoria_check;

ALTER TABLE teamcruz.transacoes
ADD CONSTRAINT transacoes_categoria_check
CHECK (categoria IN (
  'SISTEMA',
  'MENSALIDADE',
  'PRODUTO',
  'AULA_AVULSA',
  'COMPETICAO',
  'TAXA',
  'ALUGUEL',
  'SALARIO',
  'FORNECEDOR',
  'UTILIDADE',
  'OUTRO'
));

-- Verificar as constraints
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname IN ('despesas_categoria_check', 'transacoes_categoria_check')
ORDER BY conname;
