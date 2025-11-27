-- Remove constraint única de aluno_id + aula_id
-- Agora permitimos múltiplos registros na mesma aula,
-- pois a validação é 1 check-in por dia (independente da aula)

ALTER TABLE teamcruz.presencas
DROP CONSTRAINT IF EXISTS uk_presencas_aluno_aula;

-- Verificar constraints restantes
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'teamcruz.presencas'::regclass;
