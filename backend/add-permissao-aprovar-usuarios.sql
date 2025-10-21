-- Script para adicionar permissão de aprovar usuários aos perfis necessários
-- Perfis: FRANQUEADO, GERENTE_UNIDADE, RECEPCIONISTA
-- Baseado nas entities: Permissao, Perfil, TipoPermissao, NivelPermissao

-- 1. Verificar/Criar tipo de permissão 'USUARIOS' se não existir
INSERT INTO teamcruz.tipos_permissao (id, codigo, nome, descricao, ordem)
VALUES (
  gen_random_uuid(),
  'USUARIOS',
  'Gestão de Usuários',
  'Permissões relacionadas ao gerenciamento de usuários do sistema',
  1
)
ON CONFLICT (codigo) DO NOTHING;

-- 2. Verificar/Criar nível de permissão 'ESCRITA' se não existir
INSERT INTO teamcruz.niveis_permissao (id, codigo, nome, descricao, ordem, cor)
VALUES (
  gen_random_uuid(),
  'ESCRITA',
  'Escrita',
  'Permite criar, editar e aprovar registros',
  2,
  '#ffc107'
)
ON CONFLICT (codigo) DO NOTHING;

-- 3. Criar a permissão 'usuarios:aprovar' se não existir
INSERT INTO teamcruz.permissoes (id, codigo, nome, descricao, tipo_id, nivel_id, modulo, ativo)
SELECT
  gen_random_uuid(),
  'usuarios:aprovar',
  'Aprovar Usuários',
  'Permite aprovar cadastros de usuários pendentes',
  tp.id,
  np.id,
  'usuarios',
  true
FROM teamcruz.tipos_permissao tp
CROSS JOIN teamcruz.niveis_permissao np
WHERE tp.codigo = 'USUARIOS'
  AND np.codigo = 'ESCRITA'
ON CONFLICT (codigo) DO NOTHING;

-- 4. Associar permissão ao perfil FRANQUEADO
INSERT INTO teamcruz.perfil_permissoes (perfil_id, permissao_id)
SELECT
  p.id as perfil_id,
  perm.id as permissao_id
FROM teamcruz.perfis p
CROSS JOIN teamcruz.permissoes perm
WHERE p.nome = 'FRANQUEADO'
  AND perm.codigo = 'usuarios:aprovar'
ON CONFLICT (perfil_id, permissao_id) DO NOTHING;

-- 5. Associar permissão ao perfil GERENTE_UNIDADE
INSERT INTO teamcruz.perfil_permissoes (perfil_id, permissao_id)
SELECT
  p.id as perfil_id,
  perm.id as permissao_id
FROM teamcruz.perfis p
CROSS JOIN teamcruz.permissoes perm
WHERE p.nome = 'GERENTE_UNIDADE'
  AND perm.codigo = 'usuarios:aprovar'
ON CONFLICT (perfil_id, permissao_id) DO NOTHING;

-- 6. Associar permissão ao perfil RECEPCIONISTA
INSERT INTO teamcruz.perfil_permissoes (perfil_id, permissao_id)
SELECT
  p.id as perfil_id,
  perm.id as permissao_id
FROM teamcruz.perfis p
CROSS JOIN teamcruz.permissoes perm
WHERE p.nome = 'RECEPCIONISTA'
  AND perm.codigo = 'usuarios:aprovar'
ON CONFLICT (perfil_id, permissao_id) DO NOTHING;

-- Verificar resultado
SELECT
  p.nome as perfil,
  perm.codigo as codigo_permissao,
  perm.nome as permissao,
  tp.nome as tipo,
  np.nome as nivel,
  perm.descricao
FROM teamcruz.perfis p
INNER JOIN teamcruz.perfil_permissoes pp ON p.id = pp.perfil_id
INNER JOIN teamcruz.permissoes perm ON pp.permissao_id = perm.id
INNER JOIN teamcruz.tipos_permissao tp ON perm.tipo_id = tp.id
INNER JOIN teamcruz.niveis_permissao np ON perm.nivel_id = np.id
WHERE perm.codigo = 'usuarios:aprovar'
ORDER BY p.nome;
