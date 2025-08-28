-- Script de Integração: Sistema de Usuários + TeamCruz
-- Este script conecta o sistema existente de usuários/perfis/permissões com o novo sistema TeamCruz

-- ========================================
-- 1. AJUSTAR TABELAS PARA INTEGRAÇÃO
-- ========================================

-- Alterar coluna usuario_id em alunos para UUID (compatível com tabela usuarios)
ALTER TABLE teamcruz.alunos 
DROP COLUMN IF EXISTS usuario_id;

ALTER TABLE teamcruz.alunos 
ADD COLUMN usuario_id UUID REFERENCES public.usuarios(id);

-- Alterar coluna usuario_id em instrutores para UUID
ALTER TABLE teamcruz.instrutores 
DROP COLUMN IF EXISTS usuario_id;

ALTER TABLE teamcruz.instrutores 
ADD COLUMN usuario_id UUID REFERENCES public.usuarios(id);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_alunos_usuario ON teamcruz.alunos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_instrutores_usuario ON teamcruz.instrutores(usuario_id);

-- ========================================
-- 2. CRIAR PERFIS ESPECÍFICOS DO JIUJITSU
-- ========================================

-- Inserir perfis específicos do TeamCruz
INSERT INTO public.perfis (nome, descricao, ativo) VALUES 
('ALUNO_JJ', 'Aluno de Jiu-Jitsu', true),
('INSTRUTOR_JJ', 'Instrutor de Jiu-Jitsu', true),
('RECEPCAO_JJ', 'Recepção Academia', true),
('ADMIN_TEAMCRUZ', 'Administrador TeamCruz', true)
ON CONFLICT (nome) DO NOTHING;

-- ========================================
-- 3. CRIAR PERMISSÕES ESPECÍFICAS
-- ========================================

-- Inserir permissões do sistema TeamCruz
INSERT INTO public.permissoes (nome, descricao, recurso, acao) VALUES
-- Permissões de Check-in
('CHECKIN_REALIZAR', 'Realizar check-in próprio', 'checkin', 'create'),
('CHECKIN_GERENCIAR', 'Gerenciar check-ins de alunos', 'checkin', 'manage'),
('CHECKIN_VISUALIZAR', 'Visualizar check-ins', 'checkin', 'read'),

-- Permissões de Graduação
('GRADUACAO_VISUALIZAR', 'Visualizar própria graduação', 'graduacao', 'read'),
('GRADUACAO_GERENCIAR', 'Gerenciar graduações de alunos', 'graduacao', 'manage'),
('GRADUACAO_PROMOVER', 'Promover alunos de faixa', 'graduacao', 'promote'),

-- Permissões de Turmas
('TURMA_VISUALIZAR', 'Visualizar turmas', 'turma', 'read'),
('TURMA_GERENCIAR', 'Gerenciar turmas', 'turma', 'manage'),
('TURMA_MINISTRAR', 'Ministrar aulas', 'turma', 'teach'),

-- Permissões de Relatórios
('RELATORIO_PROPRIO', 'Visualizar relatórios próprios', 'relatorio', 'read_own'),
('RELATORIO_TURMA', 'Visualizar relatórios da turma', 'relatorio', 'read_class'),
('RELATORIO_COMPLETO', 'Visualizar todos relatórios', 'relatorio', 'read_all'),

-- Permissões Administrativas
('ALUNO_CADASTRAR', 'Cadastrar novos alunos', 'aluno', 'create'),
('ALUNO_EDITAR', 'Editar dados de alunos', 'aluno', 'update'),
('ALUNO_VISUALIZAR', 'Visualizar dados de alunos', 'aluno', 'read'),
('CONFIGURACAO_GERENCIAR', 'Gerenciar configurações do sistema', 'config', 'manage')
ON CONFLICT (nome) DO NOTHING;

-- ========================================
-- 4. ASSOCIAR PERMISSÕES AOS PERFIS
-- ========================================

-- Permissões para ALUNO_JJ
INSERT INTO public.perfil_permissoes (perfil_id, permissao_id)
SELECT p.id, perm.id FROM public.perfis p, public.permissoes perm
WHERE p.nome = 'ALUNO_JJ' 
AND perm.nome IN (
    'CHECKIN_REALIZAR',
    'GRADUACAO_VISUALIZAR',
    'TURMA_VISUALIZAR',
    'RELATORIO_PROPRIO'
)
ON CONFLICT DO NOTHING;

-- Permissões para INSTRUTOR_JJ
INSERT INTO public.perfil_permissoes (perfil_id, permissao_id)
SELECT p.id, perm.id FROM public.perfis p, public.permissoes perm
WHERE p.nome = 'INSTRUTOR_JJ'
AND perm.nome IN (
    'CHECKIN_GERENCIAR',
    'CHECKIN_VISUALIZAR',
    'GRADUACAO_VISUALIZAR',
    'GRADUACAO_GERENCIAR',
    'TURMA_VISUALIZAR',
    'TURMA_MINISTRAR',
    'RELATORIO_TURMA',
    'ALUNO_VISUALIZAR'
)
ON CONFLICT DO NOTHING;

-- Permissões para RECEPCAO_JJ
INSERT INTO public.perfil_permissoes (perfil_id, permissao_id)
SELECT p.id, perm.id FROM public.perfis p, public.permissoes perm
WHERE p.nome = 'RECEPCAO_JJ'
AND perm.nome IN (
    'CHECKIN_GERENCIAR',
    'CHECKIN_VISUALIZAR',
    'ALUNO_CADASTRAR',
    'ALUNO_EDITAR',
    'ALUNO_VISUALIZAR',
    'TURMA_VISUALIZAR'
)
ON CONFLICT DO NOTHING;

-- Permissões para ADMIN_TEAMCRUZ (todas)
INSERT INTO public.perfil_permissoes (perfil_id, permissao_id)
SELECT p.id, perm.id FROM public.perfis p, public.permissoes perm
WHERE p.nome = 'ADMIN_TEAMCRUZ'
AND perm.nome LIKE '%JJ%' OR perm.nome LIKE '%GRADUACAO%' OR perm.nome LIKE '%TURMA%' OR perm.nome LIKE '%CHECKIN%'
ON CONFLICT DO NOTHING;

-- ========================================
-- 5. CRIAR USUÁRIOS DE EXEMPLO
-- ========================================

-- Criar usuário para Professor Carlos Cruz (admin)
INSERT INTO public.usuarios (id, username, email, password, nome, cpf, telefone, ativo)
VALUES (
    gen_random_uuid(),
    'carlos.cruz',
    'carlos@teamcruz.com.br',
    '$2b$10$YourHashedPasswordHere', -- Senha: teamcruz123
    'Carlos Cruz',
    '111.111.111-11',
    '(11) 98765-4321',
    true
) ON CONFLICT (username) DO NOTHING;

-- Associar perfil de ADMIN_TEAMCRUZ ao Carlos
INSERT INTO public.usuario_perfis (usuario_id, perfil_id)
SELECT u.id, p.id FROM public.usuarios u, public.perfis p
WHERE u.username = 'carlos.cruz' AND p.nome = 'ADMIN_TEAMCRUZ'
ON CONFLICT DO NOTHING;

-- Vincular o usuário Carlos ao instrutor Carlos no TeamCruz
UPDATE teamcruz.instrutores 
SET usuario_id = (SELECT id FROM public.usuarios WHERE username = 'carlos.cruz')
WHERE email = 'carlos@teamcruz.com.br';

-- ========================================
-- 6. CRIAR VIEW INTEGRADA
-- ========================================

-- View que une dados de usuário com dados de aluno
CREATE OR REPLACE VIEW teamcruz.v_alunos_usuarios AS
SELECT 
    a.*,
    u.username,
    u.email as usuario_email,
    u.ultimo_login,
    u.ativo as usuario_ativo,
    array_agg(DISTINCT p.nome) as perfis,
    array_agg(DISTINCT perm.nome) as permissoes
FROM teamcruz.alunos a
LEFT JOIN public.usuarios u ON a.usuario_id = u.id
LEFT JOIN public.usuario_perfis up ON u.id = up.usuario_id
LEFT JOIN public.perfis p ON up.perfil_id = p.id
LEFT JOIN public.perfil_permissoes pp ON p.id = pp.perfil_id
LEFT JOIN public.permissoes perm ON pp.permissao_id = perm.id
GROUP BY a.id, u.id;

-- View para instrutores com usuários
CREATE OR REPLACE VIEW teamcruz.v_instrutores_usuarios AS
SELECT 
    i.*,
    u.username,
    u.ultimo_login,
    u.ativo as usuario_ativo,
    array_agg(DISTINCT p.nome) as perfis,
    array_agg(DISTINCT perm.nome) as permissoes
FROM teamcruz.instrutores i
LEFT JOIN public.usuarios u ON i.usuario_id = u.id
LEFT JOIN public.usuario_perfis up ON u.id = up.usuario_id
LEFT JOIN public.perfis p ON up.perfil_id = p.id
LEFT JOIN public.perfil_permissoes pp ON p.id = pp.perfil_id
LEFT JOIN public.permissoes perm ON pp.permissao_id = perm.id
GROUP BY i.id, u.id;

-- ========================================
-- 7. FUNÇÃO PARA CRIAR ALUNO COM USUÁRIO
-- ========================================

CREATE OR REPLACE FUNCTION teamcruz.criar_aluno_com_usuario(
    p_nome VARCHAR,
    p_email VARCHAR,
    p_cpf VARCHAR,
    p_telefone VARCHAR,
    p_senha VARCHAR,
    p_faixa_id UUID,
    p_unidade_id UUID
) RETURNS UUID AS $$
DECLARE
    v_usuario_id UUID;
    v_aluno_id UUID;
    v_perfil_id UUID;
BEGIN
    -- Criar usuário
    INSERT INTO public.usuarios (username, email, password, nome, cpf, telefone, ativo)
    VALUES (
        LOWER(REPLACE(p_nome, ' ', '.')),
        p_email,
        p_senha, -- Deve ser hash
        p_nome,
        p_cpf,
        p_telefone,
        true
    ) RETURNING id INTO v_usuario_id;
    
    -- Buscar perfil de aluno
    SELECT id INTO v_perfil_id FROM public.perfis WHERE nome = 'ALUNO_JJ';
    
    -- Associar perfil
    INSERT INTO public.usuario_perfis (usuario_id, perfil_id)
    VALUES (v_usuario_id, v_perfil_id);
    
    -- Criar aluno
    INSERT INTO teamcruz.alunos (
        nome, cpf, email, telefone, 
        faixa_atual_id, unidade_id, usuario_id,
        numero_matricula, status
    )
    VALUES (
        p_nome, p_cpf, p_email, p_telefone,
        p_faixa_id, p_unidade_id, v_usuario_id,
        'TC' || LPAD(nextval('teamcruz.seq_matricula')::text, 5, '0'),
        'ativo'
    ) RETURNING id INTO v_aluno_id;
    
    RETURN v_aluno_id;
END;
$$ LANGUAGE plpgsql;

-- Criar sequência para matrícula
CREATE SEQUENCE IF NOT EXISTS teamcruz.seq_matricula START 1;

-- ========================================
-- 8. TRIGGER PARA SINCRONIZAÇÃO
-- ========================================

-- Trigger para atualizar dados do usuário quando aluno é atualizado
CREATE OR REPLACE FUNCTION teamcruz.sync_aluno_usuario()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.usuario_id IS NOT NULL THEN
        UPDATE public.usuarios
        SET 
            nome = NEW.nome,
            email = COALESCE(NEW.email, email),
            telefone = COALESCE(NEW.telefone, telefone),
            cpf = COALESCE(NEW.cpf, cpf)
        WHERE id = NEW.usuario_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_aluno_usuario
AFTER UPDATE ON teamcruz.alunos
FOR EACH ROW
WHEN (OLD.nome IS DISTINCT FROM NEW.nome OR 
      OLD.email IS DISTINCT FROM NEW.email OR 
      OLD.telefone IS DISTINCT FROM NEW.telefone)
EXECUTE FUNCTION teamcruz.sync_aluno_usuario();

-- ========================================
-- 9. DADOS DE TESTE INTEGRADOS
-- ========================================

-- Criar alguns alunos de exemplo com usuários
SELECT teamcruz.criar_aluno_com_usuario(
    'João Silva',
    'joao.silva@email.com',
    '222.222.222-22',
    '(11) 91111-1111',
    '$2b$10$YourHashedPasswordHere',
    (SELECT id FROM teamcruz.faixas WHERE nome = 'Azul'),
    (SELECT id FROM teamcruz.unidades LIMIT 1)
);

SELECT teamcruz.criar_aluno_com_usuario(
    'Maria Santos',
    'maria.santos@email.com',
    '333.333.333-33',
    '(11) 92222-2222',
    '$2b$10$YourHashedPasswordHere',
    (SELECT id FROM teamcruz.faixas WHERE nome = 'Roxa'),
    (SELECT id FROM teamcruz.unidades LIMIT 1)
);

-- ========================================
-- 10. GRANT PERMISSÕES
-- ========================================

-- Garantir que o usuário teamcruz_admin pode acessar o schema public
GRANT USAGE ON SCHEMA public TO teamcruz_admin;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO teamcruz_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO teamcruz_admin;

-- Mensagem de conclusão
DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Integração concluída com sucesso!';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Perfis criados: ALUNO_JJ, INSTRUTOR_JJ, RECEPCAO_JJ, ADMIN_TEAMCRUZ';
    RAISE NOTICE 'Permissões configuradas para cada perfil';
    RAISE NOTICE 'Views integradas criadas';
    RAISE NOTICE 'Função criar_aluno_com_usuario disponível';
    RAISE NOTICE '====================================';
END $$;
