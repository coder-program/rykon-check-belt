-- Verificar faixas cadastradas
SELECT * FROM teamcruz.faixas_definicao ORDER BY ordem;

-- Verificar se a tabela existe
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'teamcruz'
  AND table_name LIKE '%faixa%';
