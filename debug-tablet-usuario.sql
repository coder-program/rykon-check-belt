-- Debug: Verificar usuários com perfil TABLET_CHECKIN

-- 0. Verificar estrutura da tabela tablet_unidades
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'teamcruz' AND table_name = 'tablet_unidades'
ORDER BY ordinal_position;

-- 1. Buscar o perfil TABLET_CHECKIN
SELECT id, nome, descricao FROM teamcruz.perfis WHERE nome = 'TABLET_CHECKIN';

-- 2. Buscar todos os usuários com perfil TABLET_CHECKIN
SELECT
    u.id,
    u.nome,
    u.email,
    u.username,
    u.ativo,
    p.nome as perfil
FROM teamcruz.usuarios u
JOIN teamcruz.usuario_perfis up ON u.id = up.usuario_id
JOIN teamcruz.perfis p ON up.perfil_id = p.id
WHERE p.nome = 'TABLET_CHECKIN';

-- 3. Verificar vínculos na tabela tablet_unidades
SELECT
    tu.*,
    u.nome as usuario_nome,
    un.nome as unidade_nome
FROM teamcruz.tablet_unidades tu
LEFT JOIN teamcruz.usuarios u ON tu.usuario_id = u.id
LEFT JOIN teamcruz.unidades un ON tu.unidade_id = un.id;

-- 4. Se não houver vínculos, mas houver usuários TABLET, criar os vínculos
-- (Execute este bloco apenas se necessário)
/*
INSERT INTO teamcruz.tablet_unidades (usuario_id, unidade_id, ativo, created_at, updated_at)
SELECT
    u.id as usuario_id,
    'ID_DA_UNIDADE_AQUI' as unidade_id,  -- SUBSTITUA pelo ID da unidade
    true as ativo,
    NOW() as created_at,
    NOW() as updated_at
FROM teamcruz.usuarios u
JOIN teamcruz.usuario_perfis up ON u.id = up.usuario_id
JOIN teamcruz.perfis p ON up.perfil_id = p.id
WHERE p.nome = 'TABLET_CHECKIN'
  AND u.id NOT IN (SELECT usuario_id FROM teamcruz.tablet_unidades WHERE usuario_id IS NOT NULL);
*/
