-- Adicionar TRIMESTRAL ao tipo de plano
-- Execute este SQL no banco de dados

-- 1. Remover a constraint antiga
ALTER TABLE teamcruz.planos
DROP CONSTRAINT IF EXISTS planos_tipo_check;

-- 2. Adicionar a nova constraint com TRIMESTRAL
ALTER TABLE teamcruz.planos
ADD CONSTRAINT planos_tipo_check
CHECK (tipo IN ('MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL', 'AVULSO'));

-- Verificar
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'teamcruz.planos'::regclass
AND conname = 'planos_tipo_check';
