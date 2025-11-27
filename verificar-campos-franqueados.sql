-- Verificar estrutura da tabela franqueados
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_schema = 'teamcruz'
  AND table_name = 'franqueados'
ORDER BY ordinal_position;

-- Ver dados de um franqueado específico
SELECT *
FROM teamcruz.franqueados
LIMIT 1;
