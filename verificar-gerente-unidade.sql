-- Verificar dados do gerente e sua unidade
-- Execute este SQL no banco de dados

-- 1. Verificar dados do usuário gerente
SELECT
  id,
  username,
  email,
  nome,
  cpf,
  cadastro_completo
FROM teamcruz.usuarios
WHERE email = 'gerente1@gmail.com';

-- 2. Verificar perfis do usuário
SELECT
  u.email,
  u.nome,
  u.cpf,
  p.nome as perfil
FROM teamcruz.usuarios u
JOIN teamcruz.usuario_perfis up ON up.usuario_id = u.id
JOIN teamcruz.perfis p ON p.id = up.perfil_id
WHERE u.email = 'gerente1@gmail.com';

-- 3. Verificar se existe alguma unidade com este CPF como responsável
SELECT
  id,
  nome,
  status,
  responsavel_nome,
  responsavel_cpf,
  responsavel_papel,
  franqueado_id
FROM teamcruz.unidades
WHERE responsavel_cpf = '75967325000';

-- 4. Verificar qual franqueado criou o gerente
SELECT
  f.id as franqueado_id,
  f.nome as franqueado_nome,
  u_franq.email as franqueado_email
FROM teamcruz.usuarios u
LEFT JOIN teamcruz.franqueados f ON f.id IN (
  SELECT franqueado_id
  FROM teamcruz.unidades
  GROUP BY franqueado_id
)
LEFT JOIN teamcruz.usuarios u_franq ON u_franq.id = f.usuario_id
WHERE u.email = 'gerente1@gmail.com';

-- 5. Listar todas as unidades do franqueado logado
-- IMPORTANTE: Substitua '<SEU_EMAIL_FRANQUEADO>' pelo email que você usou para fazer login
SELECT
  u.id,
  u.nome,
  u.status,
  u.responsavel_nome,
  u.responsavel_cpf,
  u.responsavel_papel,
  u.franqueado_id,
  f.nome as franqueado_nome
FROM teamcruz.unidades u
LEFT JOIN teamcruz.franqueados f ON f.id = u.franqueado_id
LEFT JOIN teamcruz.usuarios u_franq ON u_franq.id = f.usuario_id
WHERE u_franq.email = '<SEU_EMAIL_FRANQUEADO>'  -- SUBSTITUA AQUI
ORDER BY u.nome;

-- 6. Listar todas as unidades ativas para comparação
SELECT
  id,
  nome,
  status,
  responsavel_nome,
  responsavel_cpf,
  responsavel_papel,
  franqueado_id
FROM teamcruz.unidades
WHERE status = 'ATIVA'
ORDER BY nome;
