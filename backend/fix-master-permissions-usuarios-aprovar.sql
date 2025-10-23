-- Script para adicionar permissão 'usuarios:aprovar' aos perfis MASTER/ADMIN
-- O usuário logado tem perfis: SUPER_ADMIN, MASTER, ADMIN_SISTEMA

-- 1. Verificar se a permissão existe
SELECT 'Permissão usuarios:aprovar' as verificacao,
       CASE WHEN EXISTS(SELECT 1 FROM teamcruz.permissoes WHERE codigo = 'usuarios:aprovar')
       THEN 'EXISTE' ELSE 'NÃO EXISTE' END as status;

-- 2. Associar permissão ao perfil MASTER
INSERT INTO teamcruz.perfil_permissoes (perfil_id, permissao_id)
SELECT
  p.id as perfil_id,
  perm.id as permissao_id
FROM teamcruz.perfis p
CROSS JOIN teamcruz.permissoes perm
WHERE UPPER(p.nome) = 'MASTER'
  AND perm.codigo = 'usuarios:aprovar'
ON CONFLICT (perfil_id, permissao_id) DO NOTHING;

-- 3. Associar permissão ao perfil SUPER_ADMIN
INSERT INTO teamcruz.perfil_permissoes (perfil_id, permissao_id)
SELECT
  p.id as perfil_id,
  perm.id as permissao_id
FROM teamcruz.perfis p
CROSS JOIN teamcruz.permissoes perm
WHERE UPPER(p.nome) = 'SUPER_ADMIN'
  AND perm.codigo = 'usuarios:aprovar'
ON CONFLICT (perfil_id, permissao_id) DO NOTHING;

-- 4. Associar permissão ao perfil ADMIN_SISTEMA
INSERT INTO teamcruz.perfil_permissoes (perfil_id, permissao_id)
SELECT
  p.id as perfil_id,
  perm.id as permissao_id
FROM teamcruz.perfis p
CROSS JOIN teamcruz.permissoes perm
WHERE UPPER(p.nome) = 'ADMIN_SISTEMA'
  AND perm.codigo = 'usuarios:aprovar'
ON CONFLICT (perfil_id, permissao_id) DO NOTHING;

-- 5. Verificar resultado final
SELECT
  p.nome as perfil,
  perm.codigo as codigo_permissao,
  perm.nome as permissao_nome,
  'ADICIONADO' as status
FROM teamcruz.perfis p
INNER JOIN teamcruz.perfil_permissoes pp ON p.id = pp.perfil_id
INNER JOIN teamcruz.permissoes perm ON pp.permissao_id = perm.id
WHERE perm.codigo = 'usuarios:aprovar'
  AND UPPER(p.nome) IN ('MASTER', 'SUPER_ADMIN', 'ADMIN_SISTEMA')
ORDER BY p.nome;