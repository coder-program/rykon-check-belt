-- Script rápido para vincular o gerente à primeira unidade
-- Execute este SQL completo de uma vez

-- Opção 1: Vincular à unidade "Levi e Clara Telecom Ltda"
UPDATE teamcruz.unidades
SET
  responsavel_cpf = '75967325000',
  responsavel_papel = 'GERENTE',
  responsavel_nome = 'gerenteunidade um',
  updated_at = NOW()
WHERE id = '6f186fea-1d7f-463c-ae39-9432c8727d44';

-- OU Opção 2: Vincular à unidade "tem cruz projeto 2"
/*
UPDATE teamcruz.unidades
SET
  responsavel_cpf = '75967325000',
  responsavel_papel = 'GERENTE',
  responsavel_nome = 'gerenteunidade um',
  updated_at = NOW()
WHERE id = 'fe29372e-7899-41f8-afa4-cdf0e4fea8f5';
*/

-- OU Opção 3: Vincular à unidade "UNIDADE OSASCO 1"
/*
UPDATE teamcruz.unidades
SET
  responsavel_cpf = '75967325000',
  responsavel_papel = 'GERENTE',
  responsavel_nome = 'gerenteunidade um',
  updated_at = NOW()
WHERE id = 'b85fb12e-e1e1-450c-874b-0c8f10bd05c3';
*/

-- Verificar se funcionou
SELECT
  id,
  nome,
  status,
  responsavel_nome,
  responsavel_cpf,
  responsavel_papel
FROM teamcruz.unidades
WHERE responsavel_cpf = '75967325000';

-- Verificar também se essas unidades pertencem ao mesmo franqueado
SELECT
  u.id,
  u.nome,
  u.status,
  u.responsavel_cpf,
  f.nome as franqueado_nome,
  u_franq.email as franqueado_email
FROM teamcruz.unidades u
LEFT JOIN teamcruz.franqueados f ON f.id = u.franqueado_id
LEFT JOIN teamcruz.usuarios u_franq ON u_franq.id = f.usuario_id
WHERE u.id IN (
  '6f186fea-1d7f-463c-ae39-9432c8727d44',
  'fe29372e-7899-41f8-afa4-cdf0e4fea8f5',
  'b85fb12e-e1e1-450c-874b-0c8f10bd05c3'
)
ORDER BY u.nome;
