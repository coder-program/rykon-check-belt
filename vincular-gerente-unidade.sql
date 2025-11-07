-- Script para vincular gerente à unidade
-- Execute este SQL para corrigir o vínculo do gerente com a unidade

-- PASSO 1: Ver qual franqueado está logado e suas unidades
-- Substitua '<EMAIL_DO_FRANQUEADO>' pelo seu email de login
SELECT
  u.id as unidade_id,
  u.nome as unidade_nome,
  u.status,
  u.responsavel_nome,
  u.responsavel_cpf,
  u.franqueado_id,
  f.nome as franqueado_nome,
  u_franq.email as franqueado_email
FROM teamcruz.unidades u
LEFT JOIN teamcruz.franqueados f ON f.id = u.franqueado_id
LEFT JOIN teamcruz.usuarios u_franq ON u_franq.id = f.usuario_id
WHERE u_franq.email = 'francisco@gmail.com'  -- SUBSTITUA PELO SEU EMAIL
  AND u.status = 'ATIVA'
ORDER BY u.nome;

-- PASSO 2: Vincular o gerente à PRIMEIRA unidade do franqueado
-- Este UPDATE vai pegar automaticamente a primeira unidade ativa do franqueado
-- e vincular o gerente a ela
UPDATE teamcruz.unidades
SET
  responsavel_cpf = '75967325000',
  responsavel_papel = 'GERENTE',
  responsavel_nome = 'gerenteunidade um',  -- Nome do gerente
  updated_at = NOW()
WHERE id = (
  SELECT u.id
  FROM teamcruz.unidades u
  LEFT JOIN teamcruz.franqueados f ON f.id = u.franqueado_id
  LEFT JOIN teamcruz.usuarios u_franq ON u_franq.id = f.usuario_id
  WHERE u_franq.email = 'francisco@gmail.com'  -- SUBSTITUA PELO SEU EMAIL
    AND u.status = 'ATIVA'
  ORDER BY u.nome
  LIMIT 1
);

-- PASSO 3: Verificar se o vínculo foi criado
SELECT
  u.id,
  u.nome,
  u.status,
  u.responsavel_nome,
  u.responsavel_cpf,
  u.responsavel_papel,
  f.nome as franqueado_nome
FROM teamcruz.unidades u
LEFT JOIN teamcruz.franqueados f ON f.id = u.franqueado_id
WHERE u.responsavel_cpf = '75967325000';

-- PASSO 4 (OPCIONAL): Se quiser vincular a uma unidade ESPECÍFICA
-- Descomente e execute o UPDATE abaixo, substituindo '<NOME_DA_UNIDADE>'
/*
UPDATE teamcruz.unidades
SET
  responsavel_cpf = '75967325000',
  responsavel_papel = 'GERENTE',
  responsavel_nome = 'gerenteunidade um',
  updated_at = NOW()
WHERE nome ILIKE '%<NOME_DA_UNIDADE>%'
  AND status = 'ATIVA';
*/
