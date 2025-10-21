-- ============================================================================
-- ADICIONAR PERMISSÕES DE APROVAÇÃO DE USUÁRIOS E ALUNOS
-- Data: 20 de Outubro de 2025
-- Descrição: Adiciona permissões para FRANQUEADO, GERENTE e RECEPCIONISTA aprovarem cadastros
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR SE AS PERMISSÕES EXISTEM (caso não existam, criar)
-- ============================================================================

-- Permissão para aprovar usuários
INSERT INTO teamcruz.permissoes (
  codigo,
  descricao,
  tipo_id,
  nivel_id,
  ativo,
  created_at,
  updated_at
)
SELECT
  'usuarios:aprovar',
  'Aprovar cadastro de usuários',
  (SELECT id FROM teamcruz.tipos_permissao WHERE nome = 'WRITE' LIMIT 1),
  (SELECT id FROM teamcruz.niveis_permissao WHERE nome = 'UNIDADE' LIMIT 1),
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM teamcruz.permissoes WHERE codigo = 'usuarios:aprovar'
);

-- Permissão para aprovar alunos
INSERT INTO teamcruz.permissoes (
  codigo,
  descricao,
  tipo_id,
  nivel_id,
  ativo,
  created_at,
  updated_at
)
SELECT
  'alunos:aprovar',
  'Aprovar auto-cadastro de alunos',
  (SELECT id FROM teamcruz.tipos_permissao WHERE nome = 'WRITE' LIMIT 1),
  (SELECT id FROM teamcruz.niveis_permissao WHERE nome = 'UNIDADE' LIMIT 1),
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM teamcruz.permissoes WHERE codigo = 'alunos:aprovar'
);

-- ============================================================================
-- 2. VINCULAR PERMISSÕES AOS PERFIS
-- ============================================================================

-- FRANQUEADO - pode aprovar usuários e alunos
INSERT INTO teamcruz.perfil_permissoes (perfil_id, permissao_id)
SELECT
  (SELECT id FROM teamcruz.perfis WHERE nome = 'franqueado'),
  (SELECT id FROM teamcruz.permissoes WHERE codigo = 'usuarios:aprovar')
WHERE EXISTS (SELECT 1 FROM teamcruz.perfis WHERE nome = 'franqueado')
  AND EXISTS (SELECT 1 FROM teamcruz.permissoes WHERE codigo = 'usuarios:aprovar')
ON CONFLICT DO NOTHING;

INSERT INTO teamcruz.perfil_permissoes (perfil_id, permissao_id)
SELECT
  (SELECT id FROM teamcruz.perfis WHERE nome = 'franqueado'),
  (SELECT id FROM teamcruz.permissoes WHERE codigo = 'alunos:aprovar')
WHERE EXISTS (SELECT 1 FROM teamcruz.perfis WHERE nome = 'franqueado')
  AND EXISTS (SELECT 1 FROM teamcruz.permissoes WHERE codigo = 'alunos:aprovar')
ON CONFLICT DO NOTHING;

-- GERENTE DE UNIDADE - pode aprovar usuários e alunos
INSERT INTO teamcruz.perfil_permissoes (perfil_id, permissao_id)
SELECT
  (SELECT id FROM teamcruz.perfis WHERE nome = 'gerente_unidade'),
  (SELECT id FROM teamcruz.permissoes WHERE codigo = 'usuarios:aprovar')
WHERE EXISTS (SELECT 1 FROM teamcruz.perfis WHERE nome = 'gerente_unidade')
  AND EXISTS (SELECT 1 FROM teamcruz.permissoes WHERE codigo = 'usuarios:aprovar')
ON CONFLICT DO NOTHING;

INSERT INTO teamcruz.perfil_permissoes (perfil_id, permissao_id)
SELECT
  (SELECT id FROM teamcruz.perfis WHERE nome = 'gerente_unidade'),
  (SELECT id FROM teamcruz.permissoes WHERE codigo = 'alunos:aprovar')
WHERE EXISTS (SELECT 1 FROM teamcruz.perfis WHERE nome = 'gerente_unidade')
  AND EXISTS (SELECT 1 FROM teamcruz.permissoes WHERE codigo = 'alunos:aprovar')
ON CONFLICT DO NOTHING;

-- RECEPCIONISTA - pode aprovar usuários e alunos
INSERT INTO teamcruz.perfil_permissoes (perfil_id, permissao_id)
SELECT
  (SELECT id FROM teamcruz.perfis WHERE nome = 'recepcionista'),
  (SELECT id FROM teamcruz.permissoes WHERE codigo = 'usuarios:aprovar')
WHERE EXISTS (SELECT 1 FROM teamcruz.perfis WHERE nome = 'recepcionista')
  AND EXISTS (SELECT 1 FROM teamcruz.permissoes WHERE codigo = 'usuarios:aprovar')
ON CONFLICT DO NOTHING;

INSERT INTO teamcruz.perfil_permissoes (perfil_id, permissao_id)
SELECT
  (SELECT id FROM teamcruz.perfis WHERE nome = 'recepcionista'),
  (SELECT id FROM teamcruz.permissoes WHERE codigo = 'alunos:aprovar')
WHERE EXISTS (SELECT 1 FROM teamcruz.perfis WHERE nome = 'recepcionista')
  AND EXISTS (SELECT 1 FROM teamcruz.permissoes WHERE codigo = 'alunos:aprovar')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. VERIFICAÇÃO
-- ============================================================================

-- Verificar permissões adicionadas
SELECT
  p.nome AS perfil,
  perm.codigo AS permissao,
  perm.descricao
FROM teamcruz.perfis p
INNER JOIN teamcruz.perfil_permissoes pp ON p.id = pp.perfil_id
INNER JOIN teamcruz.permissoes perm ON pp.permissao_id = perm.id
WHERE p.nome IN ('franqueado', 'gerente_unidade', 'recepcionista')
  AND perm.codigo IN ('usuarios:aprovar', 'alunos:aprovar')
ORDER BY p.nome, perm.codigo;

-- ============================================================================
-- SUCESSO!
-- ============================================================================
SELECT 'Permissões de aprovação adicionadas com sucesso!' AS status;
