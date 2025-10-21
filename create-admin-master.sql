-- ========================================================================
-- SCRIPT DE CRIAÇÃO DE USUÁRIO ADMINISTRADOR MASTER
-- Sistema TeamCruz - Servidor UOL
-- ========================================================================

-- Configurações do usuário administrador
-- Email: admin@teamcruz.com
-- Senha: Admin@2025! (será criptografada com bcrypt)
-- ========================================================================

BEGIN;

-- 1. CRIAR O USUÁRIO ADMINISTRADOR
-- ========================================================================
-- Nota: A senha 'Admin@2025!' em bcrypt hash
-- Para gerar um novo hash, use: https://bcrypt-generator.com/
-- ou no Node.js: bcrypt.hashSync('Admin@2025!', 10)

INSERT INTO teamcruz.usuarios (
    id,
    username,
    email,
    password,
    nome,
    cpf,
    telefone,
    ativo,
    cadastro_completo,
    created_at,
    updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111111'::UUID,
    'admin',
    'admin@teamcruz.com',
    '$2b$10$YKvJZ0Z9Z8HxQXZLKXqoH.zqZBqYvNjJbYKjGz1TK.BEWh5L3nTRy', -- Admin@2025!
    'Administrador Master',
    '000.000.000-00',
    '(11) 99999-9999',
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    nome = EXCLUDED.nome,
    ativo = true,
    cadastro_completo = true,
    updated_at = CURRENT_TIMESTAMP;

-- 2. GARANTIR QUE O PERFIL SUPER_ADMIN EXISTE
-- ========================================================================
INSERT INTO teamcruz.perfis (nome, descricao, ativo)
VALUES (
    'SUPER_ADMIN',
    'Super Administrador - Acesso total ao sistema',
    true
) ON CONFLICT (nome) DO UPDATE SET
    ativo = true,
    updated_at = CURRENT_TIMESTAMP;

-- Também criar perfil MASTER se não existir
INSERT INTO teamcruz.perfis (nome, descricao, ativo)
VALUES (
    'MASTER',
    'Master - Acesso completo a todas as funcionalidades',
    true
) ON CONFLICT (nome) DO NOTHING;

-- 3. OBTER IDS DOS PERFIS E NÍVEIS
-- ========================================================================
DO $$
DECLARE
    v_usuario_id UUID;
    v_perfil_super_admin UUID;
    v_perfil_master UUID;
    v_nivel_super_admin UUID;
    v_tipo_admin UUID;
    v_permissao RECORD;
BEGIN
    -- Obter ID do usuário
    SELECT id INTO v_usuario_id 
    FROM teamcruz.usuarios 
    WHERE email = 'admin@teamcruz.com';
    
    -- Obter IDs dos perfis
    SELECT id INTO v_perfil_super_admin 
    FROM teamcruz.perfis 
    WHERE nome = 'SUPER_ADMIN';
    
    SELECT id INTO v_perfil_master 
    FROM teamcruz.perfis 
    WHERE nome = 'MASTER';
    
    -- Obter ID do nível SUPER_ADMIN
    SELECT id INTO v_nivel_super_admin 
    FROM teamcruz.niveis_permissao 
    WHERE codigo = 'SUPER_ADMIN';
    
    -- Se não existir, criar nível SUPER_ADMIN
    IF v_nivel_super_admin IS NULL THEN
        INSERT INTO teamcruz.niveis_permissao (codigo, nome, descricao, ordem, cor)
        VALUES ('SUPER_ADMIN', 'Super Administrador', 'Acesso total ao sistema', 100, '#ff0000')
        RETURNING id INTO v_nivel_super_admin;
    END IF;
    
    -- Obter ID do tipo ADMIN
    SELECT id INTO v_tipo_admin 
    FROM teamcruz.tipos_permissao 
    WHERE codigo = 'ADMIN';
    
    -- 4. ATRIBUIR PERFIS AO USUÁRIO
    -- ====================================================================
    -- Atribuir perfil SUPER_ADMIN
    INSERT INTO teamcruz.usuario_perfis (usuario_id, perfil_id)
    VALUES (v_usuario_id, v_perfil_super_admin)
    ON CONFLICT (usuario_id, perfil_id) DO NOTHING;
    
    -- Atribuir perfil MASTER se existir
    IF v_perfil_master IS NOT NULL THEN
        INSERT INTO teamcruz.usuario_perfis (usuario_id, perfil_id)
        VALUES (v_usuario_id, v_perfil_master)
        ON CONFLICT (usuario_id, perfil_id) DO NOTHING;
    END IF;
    
    -- 5. CRIAR E ATRIBUIR TODAS AS PERMISSÕES AO PERFIL SUPER_ADMIN
    -- ====================================================================
    -- Criar permissões administrativas para todos os módulos
    FOR v_permissao IN 
        SELECT DISTINCT modulo 
        FROM (
            VALUES 
                ('USUARIOS'),
                ('PERFIS'),
                ('PERMISSOES'),
                ('FRANQUEADOS'),
                ('UNIDADES'),
                ('PESSOAS'),
                ('ALUNOS'),
                ('PROFESSORES'),
                ('AULAS'),
                ('PRESENCAS'),
                ('GRADUACAO'),
                ('DASHBOARD'),
                ('RELATORIOS'),
                ('CONFIGURACOES'),
                ('AUDITORIA'),
                ('FINANCEIRO')
        ) AS modulos(modulo)
    LOOP
        -- Criar permissão ADMIN para cada módulo se não existir
        INSERT INTO teamcruz.permissoes (
            codigo, 
            nome, 
            descricao,
            modulo, 
            tipo_id, 
            nivel_id,
            ativo
        ) VALUES (
            v_permissao.modulo || '_ADMIN',
            'Administrar ' || v_permissao.modulo,
            'Acesso administrativo completo ao módulo ' || v_permissao.modulo,
            v_permissao.modulo,
            v_tipo_admin,
            v_nivel_super_admin,
            true
        ) ON CONFLICT (codigo) DO UPDATE SET
            ativo = true,
            nivel_id = v_nivel_super_admin;
    END LOOP;
    
    -- 6. ATRIBUIR TODAS AS PERMISSÕES EXISTENTES AO PERFIL SUPER_ADMIN
    -- ====================================================================
    -- Atribuir todas as permissões ativas ao perfil SUPER_ADMIN
    INSERT INTO teamcruz.perfil_permissoes (perfil_id, permissao_id)
    SELECT v_perfil_super_admin, id 
    FROM teamcruz.permissoes 
    WHERE ativo = true
    ON CONFLICT (perfil_id, permissao_id) DO NOTHING;
    
    -- Também atribuir ao perfil MASTER se existir
    IF v_perfil_master IS NOT NULL THEN
        INSERT INTO teamcruz.perfil_permissoes (perfil_id, permissao_id)
        SELECT v_perfil_master, id 
        FROM teamcruz.permissoes 
        WHERE ativo = true
        ON CONFLICT (perfil_id, permissao_id) DO NOTHING;
    END IF;
    
    RAISE NOTICE 'Usuário administrador criado/atualizado com sucesso!';
    RAISE NOTICE 'Email: admin@teamcruz.com';
    RAISE NOTICE 'Senha: Admin@2025!';
    RAISE NOTICE 'Perfis atribuídos: SUPER_ADMIN, MASTER';
END $$;

-- 7. CRIAR USUÁRIOS ADICIONAIS PARA TESTE (OPCIONAL)
-- ========================================================================
-- Criar usuário de teste para desenvolvimento
INSERT INTO teamcruz.usuarios (
    username,
    email,
    password,
    nome,
    cpf,
    telefone,
    ativo,
    cadastro_completo
) VALUES (
    'teste',
    'teste@teamcruz.com',
    '$2b$10$tX3Qh5pJYKwQyM.O1Y7MBOxH3jGjJHz.H7dZVcJJ4kR0jx9KU.5WC', -- Teste@123
    'Usuário Teste',
    '111.111.111-11',
    '(11) 11111-1111',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Criar usuário franqueado de exemplo
INSERT INTO teamcruz.usuarios (
    username,
    email,
    password,
    nome,
    cpf,
    telefone,
    ativo,
    cadastro_completo
) VALUES (
    'franqueado',
    'franqueado@teamcruz.com',
    '$2b$10$tX3Qh5pJYKwQyM.O1Y7MBOxH3jGjJHz.H7dZVcJJ4kR0jx9KU.5WC', -- Teste@123
    'Franqueado Exemplo',
    '222.222.222-22',
    '(22) 22222-2222',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- 8. ATRIBUIR PERFIS AOS USUÁRIOS DE TESTE
-- ========================================================================
DO $$
DECLARE
    v_usuario_teste UUID;
    v_usuario_franqueado UUID;
    v_perfil_aluno UUID;
    v_perfil_franqueado UUID;
BEGIN
    -- Obter IDs
    SELECT id INTO v_usuario_teste FROM teamcruz.usuarios WHERE email = 'teste@teamcruz.com';
    SELECT id INTO v_usuario_franqueado FROM teamcruz.usuarios WHERE email = 'franqueado@teamcruz.com';
    SELECT id INTO v_perfil_aluno FROM teamcruz.perfis WHERE nome = 'ALUNO';
    SELECT id INTO v_perfil_franqueado FROM teamcruz.perfis WHERE nome = 'FRANQUEADO';
    
    -- Atribuir perfis
    IF v_usuario_teste IS NOT NULL AND v_perfil_aluno IS NOT NULL THEN
        INSERT INTO teamcruz.usuario_perfis (usuario_id, perfil_id)
        VALUES (v_usuario_teste, v_perfil_aluno)
        ON CONFLICT DO NOTHING;
    END IF;
    
    IF v_usuario_franqueado IS NOT NULL AND v_perfil_franqueado IS NOT NULL THEN
        INSERT INTO teamcruz.usuario_perfis (usuario_id, perfil_id)
        VALUES (v_usuario_franqueado, v_perfil_franqueado)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 9. VERIFICAR O RESULTADO
-- ========================================================================
-- Listar o usuário admin criado
SELECT 
    u.id,
    u.username,
    u.email,
    u.nome,
    u.ativo,
    u.cadastro_completo,
    STRING_AGG(p.nome, ', ' ORDER BY p.nome) as perfis
FROM teamcruz.usuarios u
LEFT JOIN teamcruz.usuario_perfis up ON u.id = up.usuario_id
LEFT JOIN teamcruz.perfis p ON up.perfil_id = p.id
WHERE u.email IN ('admin@teamcruz.com', 'teste@teamcruz.com', 'franqueado@teamcruz.com')
GROUP BY u.id, u.username, u.email, u.nome, u.ativo, u.cadastro_completo;

-- Contar permissões do admin
SELECT 
    'Total de permissões do SUPER_ADMIN' as info,
    COUNT(DISTINCT pp.permissao_id) as quantidade
FROM teamcruz.perfis p
INNER JOIN teamcruz.perfil_permissoes pp ON p.id = pp.perfil_id
WHERE p.nome = 'SUPER_ADMIN';

-- Listar algumas permissões do perfil SUPER_ADMIN
SELECT 
    perm.codigo,
    perm.nome,
    perm.modulo,
    tp.nome as tipo,
    np.nome as nivel
FROM teamcruz.perfis p
INNER JOIN teamcruz.perfil_permissoes pp ON p.id = pp.perfil_id
INNER JOIN teamcruz.permissoes perm ON pp.permissao_id = perm.id
INNER JOIN teamcruz.tipos_permissao tp ON perm.tipo_id = tp.id
INNER JOIN teamcruz.niveis_permissao np ON perm.nivel_id = np.id
WHERE p.nome = 'SUPER_ADMIN'
ORDER BY perm.modulo, tp.ordem
LIMIT 20;

COMMIT;

-- ========================================================================
-- INFORMAÇÕES DE ACESSO
-- ========================================================================
-- 
-- USUÁRIO ADMINISTRADOR MASTER:
-- Email: admin@teamcruz.com
-- Senha: Admin@2025!
-- Perfis: SUPER_ADMIN, MASTER
-- 
-- USUÁRIO TESTE:
-- Email: teste@teamcruz.com
-- Senha: Teste@123
-- Perfil: ALUNO
-- 
-- USUÁRIO FRANQUEADO:
-- Email: franqueado@teamcruz.com
-- Senha: Teste@123
-- Perfil: FRANQUEADO
-- 
-- ========================================================================

-- IMPORTANTE: Após executar este script, você pode fazer login com:
-- Email: admin@teamcruz.com
-- Senha: Admin@2025!
-- Este usuário terá acesso completo a todas as funcionalidades do sistema