-- Adicionar coluna especialidades na tabela teamcruz.professores
-- Esta migração adiciona o campo especialidades para permitir que professores
-- tenham sua especialidade registrada no sistema

ALTER TABLE teamcruz.professores
ADD COLUMN IF NOT EXISTS especialidades VARCHAR(255);

-- Comentário na coluna para documentar seu propósito
COMMENT ON COLUMN teamcruz.professores.especialidades IS 'Especialidade do professor (Jiu-Jitsu, MMA, Muay Thai, Boxe, Wrestling, Judô, Kids)';

-- Verificar se a coluna foi criada com sucesso
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'teamcruz' AND table_name = 'professores' AND column_name = 'especialidades';