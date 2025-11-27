-- TODAS AS FAIXAS DA HELOISA (ATIVAS E INATIVAS)
SELECT
  af.id,
  af.aluno_id,
  af.faixa_def_id,
  af.ativa,
  af.graus_atual,
  af.presencas_no_ciclo,
  af.presencas_total_fx,
  af.dt_inicio,
  af.dt_fim,
  fd.codigo as faixa_codigo,
  fd.nome_exibicao as faixa_nome,
  fd.ordem,
  fd.graus_max
FROM teamcruz.aluno_faixas af
JOIN teamcruz.faixas_definicao fd ON fd.id = af.faixa_def_id
WHERE af.aluno_id = 'a63118aa-d0ff-4322-8143-1c40b83c8fa3'
ORDER BY af.dt_inicio DESC;