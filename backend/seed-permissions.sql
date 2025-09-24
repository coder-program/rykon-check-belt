-- Inserir permissões básicas do sistema
INSERT INTO teamcruz.permissoes (codigo, nome, descricao, tipo_id, nivel_id, modulo, ativo) VALUES
-- Módulo Usuários
('usuarios.create', 'Criar Usuários', 'Criar novos usuários no sistema', 
 (SELECT id FROM teamcruz.tipos_permissao WHERE codigo = 'CREATE'), 
 (SELECT id FROM teamcruz.niveis_permissao WHERE codigo = 'HIGH'), 
 'usuarios', true),
('usuarios.read', 'Visualizar Usuários', 'Visualizar lista de usuários', 
 (SELECT id FROM teamcruz.tipos_permissao WHERE codigo = 'READ'), 
 (SELECT id FROM teamcruz.niveis_permissao WHERE codigo = 'LOW'), 
 'usuarios', true),
('usuarios.update', 'Editar Usuários', 'Editar dados de usuários', 
 (SELECT id FROM teamcruz.tipos_permissao WHERE codigo = 'UPDATE'), 
 (SELECT id FROM teamcruz.niveis_permissao WHERE codigo = 'MEDIUM'), 
 'usuarios', true),
('usuarios.delete', 'Excluir Usuários', 'Excluir usuários do sistema', 
 (SELECT id FROM teamcruz.tipos_permissao WHERE codigo = 'DELETE'), 
 (SELECT id FROM teamcruz.niveis_permissao WHERE codigo = 'CRITICAL'), 
 'usuarios', true),

-- Módulo TeamCruz
('alunos.create', 'Cadastrar Alunos', 'Cadastrar novos alunos', 
 (SELECT id FROM teamcruz.tipos_permissao WHERE codigo = 'CREATE'), 
 (SELECT id FROM teamcruz.niveis_permissao WHERE codigo = 'MEDIUM'), 
 'teamcruz', true),
('alunos.read', 'Visualizar Alunos', 'Visualizar lista de alunos', 
 (SELECT id FROM teamcruz.tipos_permissao WHERE codigo = 'READ'), 
 (SELECT id FROM teamcruz.niveis_permissao WHERE codigo = 'LOW'), 
 'teamcruz', true),
('alunos.update', 'Editar Alunos', 'Editar dados de alunos', 
 (SELECT id FROM teamcruz.tipos_permissao WHERE codigo = 'UPDATE'), 
 (SELECT id FROM teamcruz.niveis_permissao WHERE codigo = 'MEDIUM'), 
 'teamcruz', true),
('instrutores.read', 'Visualizar Instrutores', 'Visualizar lista de instrutores', 
 (SELECT id FROM teamcruz.tipos_permissao WHERE codigo = 'READ'), 
 (SELECT id FROM teamcruz.niveis_permissao WHERE codigo = 'LOW'), 
 'teamcruz', true),
('unidades.read', 'Visualizar Unidades', 'Visualizar lista de unidades', 
 (SELECT id FROM teamcruz.tipos_permissao WHERE codigo = 'READ'), 
 (SELECT id FROM teamcruz.niveis_permissao WHERE codigo = 'LOW'), 
 'teamcruz', true),
('presencas.create', 'Registrar Presença', 'Registrar presença de alunos', 
 (SELECT id FROM teamcruz.tipos_permissao WHERE codigo = 'CREATE'), 
 (SELECT id FROM teamcruz.niveis_permissao WHERE codigo = 'LOW'), 
 'teamcruz', true),

-- Permissões administrativas
('system.admin', 'Administrador do Sistema', 'Acesso completo ao sistema', 
 (SELECT id FROM teamcruz.tipos_permissao WHERE codigo = 'ADMIN'), 
 (SELECT id FROM teamcruz.niveis_permissao WHERE codigo = 'SYSTEM'), 
 'sistema', true)
ON CONFLICT (codigo) DO NOTHING;

-- Criar perfis básicos
INSERT INTO teamcruz.perfis (nome, descricao, ativo) VALUES
('Administrador', 'Perfil com acesso completo ao sistema', true),
('Professor', 'Perfil para professores e instrutores', true),
('Recepcionista', 'Perfil para recepcionistas e atendimento', true),
('Aluno', 'Perfil básico para alunos', true)
ON CONFLICT (nome) DO NOTHING;

-- Associar permissões aos perfis
-- Administrador - todas as permissões
INSERT INTO teamcruz.perfil_permissoes (perfil_id, permissao_id)
SELECT 
    (SELECT id FROM teamcruz.perfis WHERE nome = 'Administrador'),
    p.id
FROM teamcruz.permissoes p
ON CONFLICT (perfil_id, permissao_id) DO NOTHING;

-- Professor - permissões de visualização e presença
INSERT INTO teamcruz.perfil_permissoes (perfil_id, permissao_id)
SELECT 
    (SELECT id FROM teamcruz.perfis WHERE nome = 'Professor'),
    p.id
FROM teamcruz.permissoes p
WHERE p.codigo IN ('alunos.read', 'alunos.update', 'instrutores.read', 'unidades.read', 'presencas.create')
ON CONFLICT (perfil_id, permissao_id) DO NOTHING;

-- Recepcionista - permissões básicas de cadastro
INSERT INTO teamcruz.perfil_permissoes (perfil_id, permissao_id)
SELECT 
    (SELECT id FROM teamcruz.perfis WHERE nome = 'Recepcionista'),
    p.id
FROM teamcruz.permissoes p
WHERE p.codigo IN ('alunos.create', 'alunos.read', 'alunos.update', 'unidades.read', 'presencas.create')
ON CONFLICT (perfil_id, permissao_id) DO NOTHING;

-- Criar usuário administrador se não existir
INSERT INTO teamcruz.usuarios (username, email, password, nome, ativo)
SELECT 'admin', 'admin@teamcruz.com.br', '$2b$10$9Ow.VZl5EwjX8gPQjh8NbOqGv.KzH/0CqM3yV7RNYYpPl4YZx3k3i', 'Administrador Sistema', true
WHERE NOT EXISTS (SELECT 1 FROM teamcruz.usuarios WHERE email = 'admin@teamcruz.com.br');

-- Associar perfil de administrador ao usuário
INSERT INTO teamcruz.usuario_perfis (usuario_id, perfil_id)
SELECT 
    (SELECT id FROM teamcruz.usuarios WHERE email = 'admin@teamcruz.com.br'),
    (SELECT id FROM teamcruz.perfis WHERE nome = 'Administrador')
WHERE NOT EXISTS (
    SELECT 1 FROM teamcruz.usuario_perfis up 
    JOIN teamcruz.usuarios u ON up.usuario_id = u.id 
    JOIN teamcruz.perfis p ON up.perfil_id = p.id 
    WHERE u.email = 'admin@teamcruz.com.br' AND p.nome = 'Administrador'
);

COMMIT;
