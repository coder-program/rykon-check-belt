-- Atualizar aula para ficar ativa hoje (sábado = 6)
-- Definir horário de 23:00 até 23:59 para testar agora

UPDATE teamcruz.aulas
SET
  dia_semana = 6,  -- Sábado
  data_hora_inicio = '2025-10-05 23:00:00'::timestamptz,
  data_hora_fim = '2025-10-05 23:59:00'::timestamptz,
  nome = 'Jiu-Jitsu Teste - Sábado Noite',
  ativo = true
WHERE id = '4eb32eb1-41fa-4491-b9d6-3273e9c1e940';

-- Verificar a aula atualizada
SELECT id, nome, dia_semana, data_hora_inicio, data_hora_fim, ativo, tipo
FROM teamcruz.aulas
WHERE id = '4eb32eb1-41fa-4491-b9d6-3273e9c1e940';