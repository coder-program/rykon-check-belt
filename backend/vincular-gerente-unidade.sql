-- =====================================================
-- VINCULAR USUÁRIO COMO GERENTE DE UNIDADE
-- =====================================================
-- Este script vincula um usuário existente como gerente de uma unidade específica
-- Execute após criar o usuário e atribuir o perfil gerente_unidade

-- PASSO 1: Atribuir perfil gerente_unidade ao usuário (se ainda não tiver)
-- Substitua 'EMAIL_DO_USUARIO' pelo email do usuário
INSERT INTO teamcruz.usuario_perfis (usuario_id, perfil_id)
SELECT
    u.id,
    p.id
FROM teamcruz.usuarios u
CROSS JOIN teamcruz.perfis p
WHERE u.email = 'EMAIL_DO_USUARIO'
  AND p.nome = 'gerente_unidade'
  AND NOT EXISTS (
    SELECT 1 FROM teamcruz.usuario_perfis up
    WHERE up.usuario_id = u.id AND up.perfil_id = p.id
  );

-- PASSO 2: Atualizar unidade para vincular o gerente
-- Substitua 'CNPJ_DA_UNIDADE' pelo CNPJ da unidade (ex: '12.345.678/0001-90')
-- Substitua 'EMAIL_DO_USUARIO' pelo email do usuário gerente
UPDATE teamcruz.unidades
SET
    responsavel_cpf = (SELECT cpf FROM teamcruz.usuarios WHERE email = 'EMAIL_DO_USUARIO'),
    responsavel_nome = (SELECT nome FROM teamcruz.usuarios WHERE email = 'EMAIL_DO_USUARIO'),
    responsavel_papel = 'GERENTE',
    responsavel_contato = (SELECT telefone FROM teamcruz.usuarios WHERE email = 'EMAIL_DO_USUARIO'),
    updated_at = NOW()
WHERE cnpj = 'CNPJ_DA_UNIDADE';

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar se o usuário tem o perfil gerente_unidade
SELECT
    u.id,
    u.nome,
    u.email,
    u.cpf,
    p.nome as perfil,
    p.descricao
FROM teamcruz.usuarios u
INNER JOIN teamcruz.usuario_perfis up ON up.usuario_id = u.id
INNER JOIN teamcruz.perfis p ON p.id = up.perfil_id
WHERE u.email = 'EMAIL_DO_USUARIO'
  AND p.nome = 'gerente_unidade';

-- Verificar a unidade vinculada ao gerente
SELECT
    un.id,
    un.nome as unidade,
    un.cnpj,
    un.responsavel_nome,
    un.responsavel_cpf,
    un.responsavel_papel,
    un.status,
    un.capacidade_max_alunos,
    u.email as gerente_email,
    u.nome as gerente_nome
FROM teamcruz.unidades un
INNER JOIN teamcruz.usuarios u ON u.cpf = un.responsavel_cpf
WHERE u.email = 'EMAIL_DO_USUARIO'
  AND un.responsavel_papel = 'GERENTE';

-- Verificar alunos que o gerente pode acessar
SELECT
    a.id,
    a.nome_completo,
    a.cpf,
    a.status,
    a.faixa_atual,
    un.nome as unidade
FROM teamcruz.alunos a
INNER JOIN teamcruz.unidades un ON un.id = a.unidade_id
INNER JOIN teamcruz.usuarios u ON u.cpf = un.responsavel_cpf
WHERE u.email = 'EMAIL_DO_USUARIO'
  AND un.responsavel_papel = 'GERENTE'
ORDER BY a.nome_completo;

-- =====================================================
-- EXEMPLO DE USO COMPLETO
-- =====================================================

/*
-- Exemplo: Vincular gerente@example.com à unidade TeamCruz Matriz

-- 1. Atribuir perfil
INSERT INTO teamcruz.usuario_perfis (usuario_id, perfil_id)
SELECT
    u.id,
    p.id
FROM teamcruz.usuarios u
CROSS JOIN teamcruz.perfis p
WHERE u.email = 'gerente@example.com'
  AND p.nome = 'gerente_unidade'
  AND NOT EXISTS (
    SELECT 1 FROM teamcruz.usuario_perfis up
    WHERE up.usuario_id = u.id AND up.perfil_id = p.id
  );

-- 2. Vincular à unidade
UPDATE teamcruz.unidades
SET
    responsavel_cpf = (SELECT cpf FROM teamcruz.usuarios WHERE email = 'gerente@example.com'),
    responsavel_nome = (SELECT nome FROM teamcruz.usuarios WHERE email = 'gerente@example.com'),
    responsavel_papel = 'GERENTE',
    responsavel_contato = (SELECT telefone FROM teamcruz.usuarios WHERE email = 'gerente@example.com'),
    updated_at = NOW()
WHERE cnpj = '12.345.678/0001-90';

-- 3. Verificar
SELECT
    u.email,
    u.nome as gerente,
    un.nome as unidade,
    un.cnpj,
    COUNT(a.id) as total_alunos
FROM teamcruz.usuarios u
INNER JOIN teamcruz.unidades un ON un.responsavel_cpf = u.cpf
LEFT JOIN teamcruz.alunos a ON a.unidade_id = un.id
WHERE u.email = 'gerente@example.com'
  AND un.responsavel_papel = 'GERENTE'
GROUP BY u.email, u.nome, un.nome, un.cnpj;
*/

-- =====================================================
-- DESVINCULAR GERENTE (se necessário)
-- =====================================================

-- Remove perfil gerente_unidade do usuário
/*
DELETE FROM teamcruz.usuario_perfis
WHERE usuario_id = (SELECT id FROM teamcruz.usuarios WHERE email = 'EMAIL_DO_USUARIO')
  AND perfil_id = (SELECT id FROM teamcruz.perfis WHERE nome = 'gerente_unidade');
*/

-- Atualizar unidade para remover gerente
/*
UPDATE teamcruz.unidades
SET
    responsavel_cpf = NULL,
    responsavel_nome = NULL,
    responsavel_papel = 'ADMINISTRATIVO',
    responsavel_contato = NULL,
    updated_at = NOW()
WHERE responsavel_cpf = (SELECT cpf FROM teamcruz.usuarios WHERE email = 'EMAIL_DO_USUARIO')
  AND responsavel_papel = 'GERENTE';
*/
