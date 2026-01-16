-- Desvincular Alícia e Benjamin (não são Lacerda)
UPDATE teamcruz.alunos 
SET responsavel_id = NULL 
WHERE id IN (
  '163eca5f-52f0-4b0d-9795-c861ce22adf5',  -- Alícia Alencar Correa
  'abb5b3cf-269b-47d4-81e3-efae8ea257e6'   -- Benjamin Souza e Silva
);

-- Verificar os dependentes de Weber agora (devem ser só Miguel e Sophia)
SELECT a.id, a.nome_completo, a.responsavel_id
FROM teamcruz.alunos a
WHERE a.responsavel_id = '57918aaa-752b-492b-a707-b6bd8d115510'
ORDER BY a.nome_completo;
