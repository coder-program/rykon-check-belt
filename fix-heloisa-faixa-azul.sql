-- CORRIGIR FAIXA DA HELOISA DE MARROM PARA AZUL
-- A fonte de verdade é APENAS aluno_faixas → faixas_definicao

BEGIN;

-- 1. Desativar a faixa MARROM incorreta
UPDATE teamcruz.aluno_faixas
SET ativa = false,
    dt_fim = NOW()
WHERE id = '95663aa1-a47a-4187-a39d-d4b63efc02d3';

-- 2. Criar faixa AZUL ativa com 4 graus
INSERT INTO teamcruz.aluno_faixas (
  aluno_id,
  faixa_def_id,
  ativa,
  graus_atual,
  presencas_no_ciclo,
  presencas_total_fx,
  dt_inicio,
  created_at,
  updated_at
) VALUES (
  'a63118aa-d0ff-4322-8143-1c40b83c8fa3',  -- Heloisa
  '57658874-cdb5-4981-bf6b-585710b70484',  -- AZUL (id da faixa AZUL)
  true,
  4,  -- 4 graus
  1,  -- 1 presença no ciclo atual
  1,  -- 1 presença total na faixa
  '2023-12-08',  -- data_ultima_graduacao
  NOW(),
  NOW()
);

-- 3. Confirmar os dados
SELECT
  a.nome_completo,
  fd.nome_exibicao as faixa_ativa,
  af.graus_atual as graus_faixa_ativa,
  af.presencas_no_ciclo,
  af.presencas_total_fx,
  af.dt_inicio,
  af.ativa
FROM teamcruz.alunos a
LEFT JOIN teamcruz.aluno_faixas af ON af.aluno_id = a.id AND af.ativa = true
LEFT JOIN teamcruz.faixas_definicao fd ON fd.id = af.faixa_def_id
WHERE a.id = 'a63118aa-d0ff-4322-8143-1c40b83c8fa3';

COMMIT;