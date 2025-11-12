-- Verificar status dos usuários RESPONSAVEL
SELECT
    u.id,
    u.username,
    u.email,
    u.nome,
    u.ativo as usuario_ativo,
    u.cadastro_completo,
    u.created_at,
    STRING_AGG(p.nome, ', ') as perfis
FROM teamcruz.usuarios u
INNER JOIN teamcruz.usuario_perfis up ON u.id = up.usuario_id
INNER JOIN teamcruz.perfis p ON up.perfil_id = p.id
WHERE LOWER(p.nome) = 'responsavel'
GROUP BY u.id, u.username, u.email, u.nome, u.ativo, u.cadastro_completo, u.created_at
ORDER BY u.created_at DESC;

-- Verificar registros na tabela responsaveis
SELECT
    r.id,
    r.usuario_id,
    r.nome_completo,
    r.ativo as responsavel_ativo,
    r.created_at,
    u.ativo as usuario_ativo,
    u.cadastro_completo
FROM teamcruz.responsaveis r
INNER JOIN teamcruz.usuarios u ON r.usuario_id = u.id
ORDER BY r.created_at DESC;
