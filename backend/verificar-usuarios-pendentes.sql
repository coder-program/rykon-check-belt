-- =====================================================
-- VERIFICAR USUÁRIOS PENDENTES DE APROVAÇÃO
-- =====================================================
-- Este script ajuda a diagnosticar problemas com usuários pendentes

-- 1. LISTAR TODOS OS USUÁRIOS PENDENTES (ativo = false)
SELECT
    u.id,
    u.nome,
    u.email,
    u.username,
    u.cpf,
    u.telefone,
    u.ativo,
    u.cadastro_completo,
    u.created_at,
    STRING_AGG(p.nome, ', ') as perfis
FROM teamcruz.usuarios u
LEFT JOIN teamcruz.usuario_perfis up ON up.usuario_id = u.id
LEFT JOIN teamcruz.perfis p ON p.id = up.perfil_id
WHERE u.ativo = false
GROUP BY u.id, u.nome, u.email, u.username, u.cpf, u.telefone, u.ativo, u.cadastro_completo, u.created_at
ORDER BY u.created_at DESC;

-- 2. VERIFICAR SE TEM DADOS EM ALUNOS
SELECT
    u.id as usuario_id,
    u.nome as usuario_nome,
    u.email,
    a.id as aluno_id,
    a.nome_completo as aluno_nome,
    a.cpf as aluno_cpf,
    a.status as aluno_status,
    a.unidade_id,
    un.nome as unidade_nome
FROM teamcruz.usuarios u
LEFT JOIN teamcruz.alunos a ON a.usuario_id = u.id
LEFT JOIN teamcruz.unidades un ON un.id = a.unidade_id
WHERE u.ativo = false
ORDER BY u.created_at DESC;

-- 3. VERIFICAR SE TEM DADOS EM PROFESSORES
SELECT
    u.id as usuario_id,
    u.nome as usuario_nome,
    u.email,
    p.id as professor_id,
    p.nome_completo as professor_nome,
    p.cpf as professor_cpf,
    p.faixa_ministrante,
    pu.unidade_id,
    un.nome as unidade_nome
FROM teamcruz.usuarios u
LEFT JOIN teamcruz.professores p ON p.usuario_id = u.id
LEFT JOIN teamcruz.professor_unidades pu ON pu.professor_id = p.id
LEFT JOIN teamcruz.unidades un ON un.id = pu.unidade_id
WHERE u.ativo = false
ORDER BY u.created_at DESC;

-- 4. VERIFICAR TODOS OS PERFIS ATRIBUÍDOS
SELECT
    u.id as usuario_id,
    u.nome,
    u.email,
    u.ativo,
    p.id as perfil_id,
    p.nome as perfil_nome,
    p.descricao as perfil_descricao
FROM teamcruz.usuarios u
INNER JOIN teamcruz.usuario_perfis up ON up.usuario_id = u.id
INNER JOIN teamcruz.perfis p ON p.id = up.perfil_id
WHERE u.ativo = false
ORDER BY u.created_at DESC;

-- 5. ESTATÍSTICAS GERAIS
SELECT
    'Total de Usuários' as tipo,
    COUNT(*) as quantidade
FROM teamcruz.usuarios
UNION ALL
SELECT
    'Usuários Ativos' as tipo,
    COUNT(*) as quantidade
FROM teamcruz.usuarios
WHERE ativo = true
UNION ALL
SELECT
    'Usuários Pendentes' as tipo,
    COUNT(*) as quantidade
FROM teamcruz.usuarios
WHERE ativo = false
UNION ALL
SELECT
    'Usuários com Cadastro Completo' as tipo,
    COUNT(*) as quantidade
FROM teamcruz.usuarios
WHERE cadastro_completo = true;

-- =====================================================
-- APROVAR MANUALMENTE UM USUÁRIO (se necessário)
-- =====================================================
-- Substitua 'email@exemplo.com' pelo email do usuário

/*
UPDATE teamcruz.usuarios
SET ativo = true,
    updated_at = NOW()
WHERE email = 'email@exemplo.com';
*/

-- =====================================================
-- VERIFICAR ÚLTIMO USUÁRIO CRIADO
-- =====================================================
SELECT
    u.id,
    u.nome,
    u.email,
    u.cpf,
    u.ativo,
    u.cadastro_completo,
    u.created_at,
    STRING_AGG(p.nome, ', ') as perfis
FROM teamcruz.usuarios u
LEFT JOIN teamcruz.usuario_perfis up ON up.usuario_id = u.id
LEFT JOIN teamcruz.perfis p ON p.id = up.perfil_id
GROUP BY u.id
ORDER BY u.created_at DESC
LIMIT 5;
