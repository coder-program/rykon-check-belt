-- =====================================================
-- VINCULAR USUÁRIO COMO RECEPCIONISTA DE UNIDADE
-- =====================================================
-- Este script vincula um usuário existente como recepcionista de uma unidade específica

-- PASSO 1: Atribuir perfil recepcionista ao usuário (se ainda não tiver)
-- Substitua 'EMAIL_DO_USUARIO' pelo email do usuário
INSERT INTO teamcruz.usuario_perfis (usuario_id, perfil_id)
SELECT
    u.id,
    p.id
FROM teamcruz.usuarios u
CROSS JOIN teamcruz.perfis p
WHERE u.email = 'EMAIL_DO_USUARIO'
  AND p.nome = 'recepcionista'
  AND NOT EXISTS (
    SELECT 1 FROM teamcruz.usuario_perfis up
    WHERE up.usuario_id = u.id AND up.perfil_id = p.id
  );

-- PASSO 2: Atualizar unidade para vincular o recepcionista como responsável
-- Substitua 'CNPJ_DA_UNIDADE' pelo CNPJ da unidade
-- Substitua 'EMAIL_DO_USUARIO' pelo email do usuário recepcionista
UPDATE teamcruz.unidades
SET
    responsavel_cpf = (SELECT cpf FROM teamcruz.usuarios WHERE email = 'EMAIL_DO_USUARIO'),
    responsavel_nome = (SELECT nome FROM teamcruz.usuarios WHERE email = 'EMAIL_DO_USUARIO'),
    responsavel_papel = 'ADMINISTRATIVO', -- Recepcionista usa papel ADMINISTRATIVO
    responsavel_contato = (SELECT telefone FROM teamcruz.usuarios WHERE email = 'EMAIL_DO_USUARIO'),
    updated_at = NOW()
WHERE cnpj = 'CNPJ_DA_UNIDADE';

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar se o usuário tem o perfil recepcionista
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
  AND p.nome = 'recepcionista';

-- Verificar a unidade vinculada ao recepcionista
SELECT
    un.id,
    un.nome as unidade,
    un.cnpj,
    un.responsavel_nome,
    un.responsavel_cpf,
    un.responsavel_papel,
    un.status,
    un.capacidade_max_alunos,
    u.email as recepcionista_email,
    u.nome as recepcionista_nome
FROM teamcruz.unidades un
INNER JOIN teamcruz.usuarios u ON u.cpf = un.responsavel_cpf
WHERE u.email = 'EMAIL_DO_USUARIO';

-- Verificar alunos que o recepcionista pode acessar
SELECT
    a.id,
    a.nome_completo,
    a.numero_matricula,
    a.cpf,
    a.status,
    a.faixa_atual,
    un.nome as unidade
FROM teamcruz.alunos a
INNER JOIN teamcruz.unidades un ON un.id = a.unidade_id
INNER JOIN teamcruz.usuarios u ON u.cpf = un.responsavel_cpf
WHERE u.email = 'EMAIL_DO_USUARIO'
ORDER BY a.nome_completo;

-- =====================================================
-- EXEMPLO DE USO COMPLETO
-- =====================================================

/*
-- Exemplo: Vincular recepcionista@example.com à unidade TeamCruz Matriz

-- 1. Atribuir perfil
INSERT INTO teamcruz.usuario_perfis (usuario_id, perfil_id)
SELECT
    u.id,
    p.id
FROM teamcruz.usuarios u
CROSS JOIN teamcruz.perfis p
WHERE u.email = 'recepcionista@example.com'
  AND p.nome = 'recepcionista'
  AND NOT EXISTS (
    SELECT 1 FROM teamcruz.usuario_perfis up
    WHERE up.usuario_id = u.id AND up.perfil_id = p.id
  );

-- 2. Vincular à unidade
UPDATE teamcruz.unidades
SET
    responsavel_cpf = (SELECT cpf FROM teamcruz.usuarios WHERE email = 'recepcionista@example.com'),
    responsavel_nome = (SELECT nome FROM teamcruz.usuarios WHERE email = 'recepcionista@example.com'),
    responsavel_papel = 'ADMINISTRATIVO',
    responsavel_contato = (SELECT telefone FROM teamcruz.usuarios WHERE email = 'recepcionista@example.com'),
    updated_at = NOW()
WHERE cnpj = '12.345.678/0001-90';

-- 3. Verificar
SELECT
    u.email,
    u.nome as recepcionista,
    un.nome as unidade,
    un.cnpj,
    COUNT(a.id) as total_alunos_ativos
FROM teamcruz.usuarios u
INNER JOIN teamcruz.unidades un ON un.responsavel_cpf = u.cpf
LEFT JOIN teamcruz.alunos a ON a.unidade_id = un.id AND a.status = 'ATIVO'
WHERE u.email = 'recepcionista@example.com'
GROUP BY u.email, u.nome, un.nome, un.cnpj;
*/

-- =====================================================
-- DESVINCULAR RECEPCIONISTA (se necessário)
-- =====================================================

-- Remove perfil recepcionista do usuário
/*
DELETE FROM teamcruz.usuario_perfis
WHERE usuario_id = (SELECT id FROM teamcruz.usuarios WHERE email = 'EMAIL_DO_USUARIO')
  AND perfil_id = (SELECT id FROM teamcruz.perfis WHERE nome = 'recepcionista');
*/

-- Atualizar unidade para remover recepcionista
/*
UPDATE teamcruz.unidades
SET
    responsavel_cpf = NULL,
    responsavel_nome = NULL,
    responsavel_papel = 'PROPRIETARIO',
    responsavel_contato = NULL,
    updated_at = NOW()
WHERE responsavel_cpf = (SELECT cpf FROM teamcruz.usuarios WHERE email = 'EMAIL_DO_USUARIO');
*/
