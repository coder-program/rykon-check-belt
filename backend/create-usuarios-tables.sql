-- Script de criação das tabelas de usuários e sistema de permissões
-- Baseado nas entidades do sistema TeamCruz

-- Criar o schema teamcruz se não existir
CREATE SCHEMA IF NOT EXISTS teamcruz;

-- ==============================================
-- 1. TABELA TIPOS_PERMISSAO
-- ==============================================

CREATE TABLE IF NOT EXISTS teamcruz.tipos_permissao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    codigo VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    ordem INTEGER DEFAULT 0 NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Índices para tipos_permissao
CREATE UNIQUE INDEX IF NOT EXISTS idx_tipos_permissao_codigo ON teamcruz.tipos_permissao(codigo);
CREATE INDEX IF NOT EXISTS idx_tipos_permissao_ordem ON teamcruz.tipos_permissao(ordem);

-- ==============================================
-- 2. TABELA NIVEIS_PERMISSAO
-- ==============================================

CREATE TABLE IF NOT EXISTS teamcruz.niveis_permissao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    codigo VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    ordem INTEGER DEFAULT 0 NOT NULL,
    cor VARCHAR(7), -- Cor hexadecimal (#28a745)

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Índices para niveis_permissao
CREATE UNIQUE INDEX IF NOT EXISTS idx_niveis_permissao_codigo ON teamcruz.niveis_permissao(codigo);
CREATE INDEX IF NOT EXISTS idx_niveis_permissao_ordem ON teamcruz.niveis_permissao(ordem);

-- ==============================================
-- 3. TABELA USUARIOS
-- ==============================================

CREATE TABLE IF NOT EXISTS teamcruz.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14),
    telefone VARCHAR(20),
    ativo BOOLEAN DEFAULT TRUE NOT NULL,
    cadastro_completo BOOLEAN DEFAULT FALSE NOT NULL,
    ultimo_login TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Índices para usuarios
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_username ON teamcruz.usuarios(username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email ON teamcruz.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_cpf ON teamcruz.usuarios(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON teamcruz.usuarios(ativo);
CREATE INDEX IF NOT EXISTS idx_usuarios_cadastro_completo ON teamcruz.usuarios(cadastro_completo);

-- ==============================================
-- 4. TABELA PERFIS
-- ==============================================

CREATE TABLE IF NOT EXISTS teamcruz.perfis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nome VARCHAR(100) UNIQUE NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Índices para perfis
CREATE UNIQUE INDEX IF NOT EXISTS idx_perfis_nome ON teamcruz.perfis(nome);
CREATE INDEX IF NOT EXISTS idx_perfis_ativo ON teamcruz.perfis(ativo);

-- ==============================================
-- 5. TABELA PERMISSOES
-- ==============================================

CREATE TABLE IF NOT EXISTS teamcruz.permissoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    codigo VARCHAR(100) UNIQUE NOT NULL,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    tipo_id UUID NOT NULL,
    nivel_id UUID NOT NULL,
    modulo VARCHAR(50),
    ativo BOOLEAN DEFAULT TRUE NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Foreign Keys
    CONSTRAINT fk_permissoes_tipo FOREIGN KEY (tipo_id) REFERENCES teamcruz.tipos_permissao(id) ON DELETE RESTRICT,
    CONSTRAINT fk_permissoes_nivel FOREIGN KEY (nivel_id) REFERENCES teamcruz.niveis_permissao(id) ON DELETE RESTRICT
);

-- Índices para permissoes
CREATE UNIQUE INDEX IF NOT EXISTS idx_permissoes_codigo ON teamcruz.permissoes(codigo);
CREATE INDEX IF NOT EXISTS idx_permissoes_tipo ON teamcruz.permissoes(tipo_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_nivel ON teamcruz.permissoes(nivel_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_modulo ON teamcruz.permissoes(modulo);
CREATE INDEX IF NOT EXISTS idx_permissoes_ativo ON teamcruz.permissoes(ativo);

-- ==============================================
-- 6. TABELA USUARIO_PERFIS (Many-to-Many)
-- ==============================================

CREATE TABLE IF NOT EXISTS teamcruz.usuario_perfis (
    usuario_id UUID NOT NULL,
    perfil_id UUID NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    PRIMARY KEY (usuario_id, perfil_id),

    -- Foreign Keys
    CONSTRAINT fk_usuario_perfis_usuario FOREIGN KEY (usuario_id) REFERENCES teamcruz.usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_usuario_perfis_perfil FOREIGN KEY (perfil_id) REFERENCES teamcruz.perfis(id) ON DELETE CASCADE
);

-- Índices para usuario_perfis
CREATE INDEX IF NOT EXISTS idx_usuario_perfis_usuario ON teamcruz.usuario_perfis(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_perfis_perfil ON teamcruz.usuario_perfis(perfil_id);

-- ==============================================
-- 7. TABELA PERFIL_PERMISSOES (Many-to-Many)
-- ==============================================

CREATE TABLE IF NOT EXISTS teamcruz.perfil_permissoes (
    perfil_id UUID NOT NULL,
    permissao_id UUID NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    PRIMARY KEY (perfil_id, permissao_id),

    -- Foreign Keys
    CONSTRAINT fk_perfil_permissoes_perfil FOREIGN KEY (perfil_id) REFERENCES teamcruz.perfis(id) ON DELETE CASCADE,
    CONSTRAINT fk_perfil_permissoes_permissao FOREIGN KEY (permissao_id) REFERENCES teamcruz.permissoes(id) ON DELETE CASCADE
);

-- Índices para perfil_permissoes
CREATE INDEX IF NOT EXISTS idx_perfil_permissoes_perfil ON teamcruz.perfil_permissoes(perfil_id);
CREATE INDEX IF NOT EXISTS idx_perfil_permissoes_permissao ON teamcruz.perfil_permissoes(permissao_id);

-- ==============================================
-- TRIGGERS PARA UPDATE_AT AUTOMÁTICO
-- ==============================================

CREATE TRIGGER update_tipos_permissao_updated_at
    BEFORE UPDATE ON teamcruz.tipos_permissao
    FOR EACH ROW EXECUTE FUNCTION teamcruz.update_updated_at_column();

CREATE TRIGGER update_niveis_permissao_updated_at
    BEFORE UPDATE ON teamcruz.niveis_permissao
    FOR EACH ROW EXECUTE FUNCTION teamcruz.update_updated_at_column();

CREATE TRIGGER update_usuarios_updated_at
    BEFORE UPDATE ON teamcruz.usuarios
    FOR EACH ROW EXECUTE FUNCTION teamcruz.update_updated_at_column();

CREATE TRIGGER update_perfis_updated_at
    BEFORE UPDATE ON teamcruz.perfis
    FOR EACH ROW EXECUTE FUNCTION teamcruz.update_updated_at_column();

CREATE TRIGGER update_permissoes_updated_at
    BEFORE UPDATE ON teamcruz.permissoes
    FOR EACH ROW EXECUTE FUNCTION teamcruz.update_updated_at_column();

-- ==============================================
-- COMENTÁRIOS NAS TABELAS
-- ==============================================

-- Tipos Permissao
COMMENT ON TABLE teamcruz.tipos_permissao IS 'Tipos de permissões do sistema (CRUD, VISUALIZAR, ADMINISTRAR, etc.)';
COMMENT ON COLUMN teamcruz.tipos_permissao.codigo IS 'Código único do tipo (CREATE, READ, UPDATE, DELETE, ADMIN)';
COMMENT ON COLUMN teamcruz.tipos_permissao.ordem IS 'Ordem para exibição na interface';

-- Niveis Permissao
COMMENT ON TABLE teamcruz.niveis_permissao IS 'Níveis de permissões (LEITURA, ESCRITA, ADMIN)';
COMMENT ON COLUMN teamcruz.niveis_permissao.cor IS 'Cor para exibição na interface (#28a745 para leitura, #dc3545 para admin)';
COMMENT ON COLUMN teamcruz.niveis_permissao.ordem IS 'Ordem hierárquica (0=menor, 100=maior)';

-- Usuarios
COMMENT ON TABLE teamcruz.usuarios IS 'Tabela de usuários do sistema';
COMMENT ON COLUMN teamcruz.usuarios.cadastro_completo IS 'Indica se o usuário completou o cadastro inicial';
COMMENT ON COLUMN teamcruz.usuarios.ultimo_login IS 'Data/hora do último login realizado';

-- Perfis
COMMENT ON TABLE teamcruz.perfis IS 'Perfis de acesso do sistema (ADMIN, FRANQUEADO, INSTRUTOR, ALUNO)';

-- Permissoes
COMMENT ON TABLE teamcruz.permissoes IS 'Permissões específicas do sistema';
COMMENT ON COLUMN teamcruz.permissoes.codigo IS 'Código único da permissão (ex: USUARIOS_CREATE, AULAS_READ)';
COMMENT ON COLUMN teamcruz.permissoes.modulo IS 'Módulo do sistema (USUARIOS, AULAS, GRADUACAO, etc.)';

-- Tabelas de relacionamento
COMMENT ON TABLE teamcruz.usuario_perfis IS 'Relacionamento N:N entre usuários e perfis';
COMMENT ON TABLE teamcruz.perfil_permissoes IS 'Relacionamento N:N entre perfis e permissões';

-- ==============================================
-- DADOS INICIAIS DO SISTEMA
-- ==============================================

-- Inserir tipos de permissão básicos
INSERT INTO teamcruz.tipos_permissao (codigo, nome, descricao, ordem)
SELECT * FROM (VALUES
    ('CREATE', 'Criar', 'Permissão para criar novos registros', 1),
    ('READ', 'Visualizar', 'Permissão para visualizar registros', 2),
    ('UPDATE', 'Editar', 'Permissão para editar registros existentes', 3),
    ('DELETE', 'Excluir', 'Permissão para excluir registros', 4),
    ('ADMIN', 'Administrar', 'Permissão administrativa completa', 5),
    ('APPROVE', 'Aprovar', 'Permissão para aprovar ações', 6),
    ('EXPORT', 'Exportar', 'Permissão para exportar dados', 7)
) AS dados(codigo, nome, descricao, ordem)
WHERE NOT EXISTS (SELECT 1 FROM teamcruz.tipos_permissao WHERE codigo = dados.codigo);

-- Inserir níveis de permissão básicos
INSERT INTO teamcruz.niveis_permissao (codigo, nome, descricao, ordem, cor)
SELECT * FROM (VALUES
    ('LEITURA', 'Leitura', 'Acesso apenas para visualização', 1, '#28a745'),
    ('ESCRITA', 'Escrita', 'Acesso para criar e editar', 2, '#ffc107'),
    ('ADMIN', 'Administrador', 'Acesso administrativo completo', 3, '#dc3545'),
    ('SUPER_ADMIN', 'Super Administrador', 'Acesso total ao sistema', 4, '#6f42c1')
) AS dados(codigo, nome, descricao, ordem, cor)
WHERE NOT EXISTS (SELECT 1 FROM teamcruz.niveis_permissao WHERE codigo = dados.codigo);

-- Inserir perfis básicos do sistema
INSERT INTO teamcruz.perfis (nome, descricao)
SELECT * FROM (VALUES
    ('SUPER_ADMIN', 'Super Administrador - Acesso total ao sistema'),
    ('ADMIN_SISTEMA', 'Administrador do Sistema - Gerencia configurações globais'),
    ('FRANQUEADO', 'Franqueado - Gerencia sua rede de unidades'),
    ('GERENTE_UNIDADE', 'Gerente de Unidade - Administra uma unidade específica'),
    ('INSTRUTOR', 'Instrutor - Gerencia aulas e alunos'),
    ('RECEPCIONISTA', 'Recepcionista - Atendimento e cadastros básicos'),
    ('ALUNO', 'Aluno - Acesso limitado aos próprios dados')
) AS dados(nome, descricao)
WHERE NOT EXISTS (SELECT 1 FROM teamcruz.perfis WHERE nome = dados.nome);

-- ==============================================
-- FUNÇÕES AUXILIARES PARA PERMISSÕES
-- ==============================================

-- Função para verificar se usuário tem permissão
CREATE OR REPLACE FUNCTION teamcruz.usuario_tem_permissao(
    p_usuario_id UUID,
    p_codigo_permissao VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM teamcruz.usuarios u
    INNER JOIN teamcruz.usuario_perfis up ON u.id = up.usuario_id
    INNER JOIN teamcruz.perfis p ON up.perfil_id = p.id
    INNER JOIN teamcruz.perfil_permissoes pp ON p.id = pp.perfil_id
    INNER JOIN teamcruz.permissoes perm ON pp.permissao_id = perm.id
    WHERE u.id = p_usuario_id
    AND u.ativo = TRUE
    AND p.ativo = TRUE
    AND perm.ativo = TRUE
    AND perm.codigo = p_codigo_permissao;

    RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Função para obter todas as permissões de um usuário
CREATE OR REPLACE FUNCTION teamcruz.obter_permissoes_usuario(p_usuario_id UUID)
RETURNS TABLE (
    codigo VARCHAR,
    nome VARCHAR,
    descricao TEXT,
    modulo VARCHAR,
    tipo_codigo VARCHAR,
    nivel_codigo VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        perm.codigo,
        perm.nome,
        perm.descricao,
        perm.modulo,
        tp.codigo as tipo_codigo,
        np.codigo as nivel_codigo
    FROM teamcruz.usuarios u
    INNER JOIN teamcruz.usuario_perfis up ON u.id = up.usuario_id
    INNER JOIN teamcruz.perfis p ON up.perfil_id = p.id
    INNER JOIN teamcruz.perfil_permissoes pp ON p.id = pp.perfil_id
    INNER JOIN teamcruz.permissoes perm ON pp.permissao_id = perm.id
    INNER JOIN teamcruz.tipos_permissao tp ON perm.tipo_id = tp.id
    INNER JOIN teamcruz.niveis_permissao np ON perm.nivel_id = np.id
    WHERE u.id = p_usuario_id
    AND u.ativo = TRUE
    AND p.ativo = TRUE
    AND perm.ativo = TRUE
    ORDER BY perm.modulo, tp.ordem, np.ordem;
END;
$$ LANGUAGE plpgsql;

-- Função para criar permissão completa (CRUD) para um módulo
CREATE OR REPLACE FUNCTION teamcruz.criar_permissoes_modulo(
    p_modulo VARCHAR,
    p_nome_base VARCHAR
) RETURNS VOID AS $$
DECLARE
    v_nivel_leitura UUID;
    v_nivel_escrita UUID;
    v_nivel_admin UUID;
    v_tipo_create UUID;
    v_tipo_read UUID;
    v_tipo_update UUID;
    v_tipo_delete UUID;
BEGIN
    -- Buscar IDs dos níveis e tipos
    SELECT id INTO v_nivel_leitura FROM teamcruz.niveis_permissao WHERE codigo = 'LEITURA';
    SELECT id INTO v_nivel_escrita FROM teamcruz.niveis_permissao WHERE codigo = 'ESCRITA';
    SELECT id INTO v_nivel_admin FROM teamcruz.niveis_permissao WHERE codigo = 'ADMIN';

    SELECT id INTO v_tipo_create FROM teamcruz.tipos_permissao WHERE codigo = 'CREATE';
    SELECT id INTO v_tipo_read FROM teamcruz.tipos_permissao WHERE codigo = 'READ';
    SELECT id INTO v_tipo_update FROM teamcruz.tipos_permissao WHERE codigo = 'UPDATE';
    SELECT id INTO v_tipo_delete FROM teamcruz.tipos_permissao WHERE codigo = 'DELETE';

    -- Criar permissões
    INSERT INTO teamcruz.permissoes (codigo, nome, modulo, tipo_id, nivel_id)
    VALUES
        (p_modulo || '_READ', 'Visualizar ' || p_nome_base, p_modulo, v_tipo_read, v_nivel_leitura),
        (p_modulo || '_CREATE', 'Criar ' || p_nome_base, p_modulo, v_tipo_create, v_nivel_escrita),
        (p_modulo || '_UPDATE', 'Editar ' || p_nome_base, p_modulo, v_tipo_update, v_nivel_escrita),
        (p_modulo || '_DELETE', 'Excluir ' || p_nome_base, p_modulo, v_tipo_delete, v_nivel_admin)
    ON CONFLICT (codigo) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Função para atribuir perfil a usuário
CREATE OR REPLACE FUNCTION teamcruz.atribuir_perfil_usuario(
    p_usuario_id UUID,
    p_nome_perfil VARCHAR
) RETURNS VOID AS $$
DECLARE
    v_perfil_id UUID;
BEGIN
    SELECT id INTO v_perfil_id
    FROM teamcruz.perfis
    WHERE nome = p_nome_perfil AND ativo = TRUE;

    IF v_perfil_id IS NOT NULL THEN
        INSERT INTO teamcruz.usuario_perfis (usuario_id, perfil_id)
        VALUES (p_usuario_id, v_perfil_id)
        ON CONFLICT (usuario_id, perfil_id) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- CRIAR PERMISSÕES BÁSICAS DOS MÓDULOS
-- ==============================================

-- Criar permissões para módulos principais
SELECT teamcruz.criar_permissoes_modulo('USUARIOS', 'Usuários');
SELECT teamcruz.criar_permissoes_modulo('PERFIS', 'Perfis');
SELECT teamcruz.criar_permissoes_modulo('PERMISSOES', 'Permissões');
SELECT teamcruz.criar_permissoes_modulo('FRANQUEADOS', 'Franqueados');
SELECT teamcruz.criar_permissoes_modulo('UNIDADES', 'Unidades');
SELECT teamcruz.criar_permissoes_modulo('PESSOAS', 'Pessoas');
SELECT teamcruz.criar_permissoes_modulo('ALUNOS', 'Alunos');
SELECT teamcruz.criar_permissoes_modulo('AULAS', 'Aulas');
SELECT teamcruz.criar_permissoes_modulo('PRESENCAS', 'Presenças');
SELECT teamcruz.criar_permissoes_modulo('GRADUACAO', 'Graduação');
SELECT teamcruz.criar_permissoes_modulo('DASHBOARD', 'Dashboard');

-- ==============================================
-- VIEWS ÚTEIS PARA ADMINISTRAÇÃO
-- ==============================================

-- View para listar usuários com seus perfis
CREATE OR REPLACE VIEW teamcruz.vw_usuarios_perfis AS
SELECT
    u.id as usuario_id,
    u.username,
    u.email,
    u.nome,
    u.ativo as usuario_ativo,
    u.cadastro_completo,
    p.id as perfil_id,
    p.nome as perfil_nome,
    p.ativo as perfil_ativo
FROM teamcruz.usuarios u
LEFT JOIN teamcruz.usuario_perfis up ON u.id = up.usuario_id
LEFT JOIN teamcruz.perfis p ON up.perfil_id = p.id
ORDER BY u.nome, p.nome;

-- View para listar perfis com suas permissões
CREATE OR REPLACE VIEW teamcruz.vw_perfis_permissoes AS
SELECT
    p.id as perfil_id,
    p.nome as perfil_nome,
    p.ativo as perfil_ativo,
    perm.id as permissao_id,
    perm.codigo as permissao_codigo,
    perm.nome as permissao_nome,
    perm.modulo,
    tp.nome as tipo_permissao,
    np.nome as nivel_permissao,
    np.cor as nivel_cor
FROM teamcruz.perfis p
LEFT JOIN teamcruz.perfil_permissoes pp ON p.id = pp.perfil_id
LEFT JOIN teamcruz.permissoes perm ON pp.permissao_id = perm.id
LEFT JOIN teamcruz.tipos_permissao tp ON perm.tipo_id = tp.id
LEFT JOIN teamcruz.niveis_permissao np ON perm.nivel_id = np.id
ORDER BY p.nome, perm.modulo, tp.ordem, np.ordem;

-- View para estatísticas do sistema de usuários
CREATE OR REPLACE VIEW teamcruz.vw_estatisticas_usuarios AS
SELECT
    COUNT(*) as total_usuarios,
    COUNT(*) FILTER (WHERE ativo = TRUE) as usuarios_ativos,
    COUNT(*) FILTER (WHERE cadastro_completo = TRUE) as cadastros_completos,
    COUNT(*) FILTER (WHERE ultimo_login > CURRENT_DATE - INTERVAL '30 days') as logins_ultimo_mes,
    COUNT(DISTINCT up.perfil_id) as perfis_em_uso
FROM teamcruz.usuarios u
LEFT JOIN teamcruz.usuario_perfis up ON u.id = up.usuario_id;

-- ==============================================
-- VERIFICAÇÕES FINAIS
-- ==============================================

-- Listar todas as tabelas criadas
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'teamcruz'
AND tablename IN (
    'tipos_permissao',
    'niveis_permissao',
    'usuarios',
    'perfis',
    'permissoes',
    'usuario_perfis',
    'perfil_permissoes'
)
ORDER BY tablename;

-- Mostrar dados inseridos
SELECT 'Tipos de Permissão' as tabela, codigo, nome FROM teamcruz.tipos_permissao
UNION ALL
SELECT 'Níveis de Permissão', codigo, nome FROM teamcruz.niveis_permissao
UNION ALL
SELECT 'Perfis', nome, descricao FROM teamcruz.perfis
ORDER BY tabela, codigo;