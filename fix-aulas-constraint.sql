-- Corrigir constraint de aulas para permitir aulas recorrentes com horário
-- Aula recorrente: dia_semana + data_hora_inicio + data_hora_fim (ex: toda segunda às 20h-21h)
-- Aula pontual: apenas data_hora_inicio + data_hora_fim com data completa (ex: 17/11/2025 20h-21h)

-- Remover constraint antiga
ALTER TABLE teamcruz.aulas
DROP CONSTRAINT IF EXISTS chk_aulas_horario_completo;

-- Adicionar nova constraint corrigida
-- Permite: dia_semana + horários (aula recorrente) OU apenas horários com data completa (aula pontual)
ALTER TABLE teamcruz.aulas
ADD CONSTRAINT chk_aulas_horario_completo CHECK (
  (
    -- Aula recorrente: dia_semana preenchido + horários
    dia_semana IS NOT NULL
    AND data_hora_inicio IS NOT NULL
    AND data_hora_fim IS NOT NULL
  )
  OR
  (
    -- Aula pontual: apenas horários (sem dia_semana)
    dia_semana IS NULL
    AND data_hora_inicio IS NOT NULL
    AND data_hora_fim IS NOT NULL
  )
);

-- Comentário explicativo
COMMENT ON CONSTRAINT chk_aulas_horario_completo ON teamcruz.aulas IS
'Garante que aulas tenham horários completos. Aula recorrente: dia_semana + data_hora_inicio + data_hora_fim. Aula pontual: apenas data_hora_inicio + data_hora_fim (sem dia_semana)';
