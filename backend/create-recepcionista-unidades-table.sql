-- =====================================================
-- TABELA: RECEPCIONISTA_UNIDADES
-- Relacionamento N:N entre recepcionistas e unidades
-- Um recepcionista pode trabalhar em várias unidades
-- Uma unidade pode ter vários recepcionistas
-- =====================================================

-- Criar tabela de relacionamento
CREATE TABLE IF NOT EXISTS teamcruz.recepcionista_unidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relacionamentos
    usuario_id UUID NOT NULL REFERENCES teamcruz.usuarios(id) ON DELETE CASCADE,
    unidade_id UUID NOT NULL REFERENCES teamcruz.unidades(id) ON DELETE CASCADE,

    -- Informações do vínculo
    cargo VARCHAR(100), -- Ex: "Recepcionista", "Recepcionista Líder", "Atendente"
    turno VARCHAR(50), -- Ex: "MANHA", "TARDE", "NOITE", "INTEGRAL"
    horario_entrada TIME,
    horario_saida TIME,
    dias_semana VARCHAR[] DEFAULT ARRAY['SEG','TER','QUA','QUI','SEX','SAB'], -- Dias que trabalha

    -- Status do vínculo
    ativo BOOLEAN DEFAULT true,
    data_inicio DATE DEFAULT CURRENT_DATE,
    data_fim DATE, -- NULL = vínculo ativo, data = vínculo encerrado

    -- Observações
    observacoes TEXT,

    -- Auditoria
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES teamcruz.usuarios(id),
    updated_by UUID REFERENCES teamcruz.usuarios(id),

    -- Constraint: Um recepcionista não pode estar vinculado 2x à mesma unidade ativa
    CONSTRAINT uk_recepcionista_unidade UNIQUE(usuario_id, unidade_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_recepcionista_unidades_usuario ON teamcruz.recepcionista_unidades(usuario_id);
CREATE INDEX IF NOT EXISTS idx_recepcionista_unidades_unidade ON teamcruz.recepcionista_unidades(unidade_id);
CREATE INDEX IF NOT EXISTS idx_recepcionista_unidades_ativo ON teamcruz.recepcionista_unidades(ativo) WHERE ativo = true;

-- Comentários
COMMENT ON TABLE teamcruz.recepcionista_unidades IS 'Relacionamento N:N entre recepcionistas e unidades';
COMMENT ON COLUMN teamcruz.recepcionista_unidades.usuario_id IS 'ID do usuário com perfil recepcionista';
COMMENT ON COLUMN teamcruz.recepcionista_unidades.unidade_id IS 'ID da unidade onde o recepcionista trabalha';
COMMENT ON COLUMN teamcruz.recepcionista_unidades.cargo IS 'Cargo específico do recepcionista nesta unidade';
COMMENT ON COLUMN teamcruz.recepcionista_unidades.turno IS 'Turno de trabalho: MANHA, TARDE, NOITE, INTEGRAL';
COMMENT ON COLUMN teamcruz.recepcionista_unidades.dias_semana IS 'Array com dias da semana que trabalha';
COMMENT ON COLUMN teamcruz.recepcionista_unidades.ativo IS 'Se o vínculo está ativo ou inativo';
COMMENT ON COLUMN teamcruz.recepcionista_unidades.data_fim IS 'Data de encerramento do vínculo (NULL = ativo)';

-- =====================================================
-- EXEMPLOS DE INSERT
-- =====================================================

-- Exemplo 1: Recepcionista trabalha em 2 unidades (manhã e tarde)
/*
INSERT INTO teamcruz.recepcionista_unidades
(usuario_id, unidade_id, cargo, turno, horario_entrada, horario_saida, dias_semana, ativo)
VALUES
-- Unidade Matriz - Turno Manhã
(
    (SELECT id FROM teamcruz.usuarios WHERE email = 'recepcionista@teamcruz.com'),
    (SELECT id FROM teamcruz.unidades WHERE cnpj = '12345678000190'),
    'Recepcionista',
    'MANHA',
    '08:00:00',
    '12:00:00',
    ARRAY['SEG','TER','QUA','QUI','SEX'],
    true
),
-- Unidade Filial - Turno Tarde
(
    (SELECT id FROM teamcruz.usuarios WHERE email = 'recepcionista@teamcruz.com'),
    (SELECT id FROM teamcruz.unidades WHERE cnpj = '98765432000190'),
    'Recepcionista',
    'TARDE',
    '14:00:00',
    '18:00:00',
    ARRAY['SEG','TER','QUA','QUI','SEX'],
    true
);
*/

-- Exemplo 2: Recepcionista integral em uma unidade
/*
INSERT INTO teamcruz.recepcionista_unidades
(usuario_id, unidade_id, cargo, turno, horario_entrada, horario_saida, ativo)
VALUES
(
    (SELECT id FROM teamcruz.usuarios WHERE email = 'maria@teamcruz.com'),
    (SELECT id FROM teamcruz.unidades WHERE nome = 'TeamCruz Matriz'),
    'Recepcionista Líder',
    'INTEGRAL',
    '08:00:00',
    '18:00:00',
    true
);
*/

-- =====================================================
-- QUERIES DE VERIFICAÇÃO
-- =====================================================

-- Listar todas as unidades de um recepcionista
SELECT
    u.nome as recepcionista,
    u.email,
    un.nome as unidade,
    un.cnpj,
    ru.cargo,
    ru.turno,
    ru.horario_entrada,
    ru.horario_saida,
    ru.dias_semana,
    ru.ativo,
    ru.data_inicio,
    COUNT(a.id) FILTER (WHERE a.status = 'ATIVO') as total_alunos_ativos
FROM teamcruz.usuarios u
INNER JOIN teamcruz.recepcionista_unidades ru ON ru.usuario_id = u.id
INNER JOIN teamcruz.unidades un ON un.id = ru.unidade_id
LEFT JOIN teamcruz.alunos a ON a.unidade_id = un.id
WHERE u.email = 'recepcionista@exemplo.com'
  AND ru.ativo = true
GROUP BY u.nome, u.email, un.nome, un.cnpj, ru.cargo, ru.turno,
         ru.horario_entrada, ru.horario_saida, ru.dias_semana, ru.ativo, ru.data_inicio
ORDER BY un.nome;

-- Listar todos os recepcionistas de uma unidade
SELECT
    u.nome as recepcionista,
    u.email,
    u.telefone,
    ru.cargo,
    ru.turno,
    ru.horario_entrada || ' - ' || ru.horario_saida as horario,
    array_to_string(ru.dias_semana, ', ') as dias,
    ru.ativo,
    ru.data_inicio
FROM teamcruz.unidades un
INNER JOIN teamcruz.recepcionista_unidades ru ON ru.unidade_id = un.id
INNER JOIN teamcruz.usuarios u ON u.id = ru.usuario_id
WHERE un.nome = 'TeamCruz Matriz'
  AND ru.ativo = true
ORDER BY ru.turno, u.nome;

-- Verificar se usuário tem perfil recepcionista E está vinculado a alguma unidade
SELECT
    u.id,
    u.nome,
    u.email,
    p.nome as perfil,
    COUNT(ru.id) as total_unidades_vinculadas,
    array_agg(un.nome) as unidades
FROM teamcruz.usuarios u
INNER JOIN teamcruz.usuario_perfis up ON up.usuario_id = u.id
INNER JOIN teamcruz.perfis p ON p.id = up.perfil_id
LEFT JOIN teamcruz.recepcionista_unidades ru ON ru.usuario_id = u.id AND ru.ativo = true
LEFT JOIN teamcruz.unidades un ON un.id = ru.unidade_id
WHERE p.nome = 'recepcionista'
GROUP BY u.id, u.nome, u.email, p.nome
ORDER BY u.nome;

-- =====================================================
-- FUNÇÃO: Obter IDs das unidades de um recepcionista
-- =====================================================

CREATE OR REPLACE FUNCTION teamcruz.get_unidades_recepcionista(p_usuario_id UUID)
RETURNS TABLE(unidade_id UUID, unidade_nome VARCHAR, cargo VARCHAR, turno VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ru.unidade_id,
        un.nome::VARCHAR,
        ru.cargo::VARCHAR,
        ru.turno::VARCHAR
    FROM teamcruz.recepcionista_unidades ru
    INNER JOIN teamcruz.unidades un ON un.id = ru.unidade_id
    WHERE ru.usuario_id = p_usuario_id
      AND ru.ativo = true
    ORDER BY un.nome;
END;
$$ LANGUAGE plpgsql;

-- Exemplo de uso da função:
-- SELECT * FROM teamcruz.get_unidades_recepcionista('uuid-do-usuario');

-- =====================================================
-- TRIGGER: Atualizar updated_at automaticamente
-- =====================================================

CREATE OR REPLACE FUNCTION teamcruz.update_recepcionista_unidades_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recepcionista_unidades_updated_at
    BEFORE UPDATE ON teamcruz.recepcionista_unidades
    FOR EACH ROW
    EXECUTE FUNCTION teamcruz.update_recepcionista_unidades_timestamp();

-- =====================================================
-- VIEW: Resumo de recepcionistas e suas unidades
-- =====================================================

CREATE OR REPLACE VIEW teamcruz.v_recepcionistas_unidades AS
SELECT
    u.id as usuario_id,
    u.nome as recepcionista_nome,
    u.email as recepcionista_email,
    u.cpf as recepcionista_cpf,
    u.telefone as recepcionista_telefone,
    ru.id as vinculo_id,
    ru.cargo,
    ru.turno,
    ru.horario_entrada,
    ru.horario_saida,
    ru.dias_semana,
    ru.ativo as vinculo_ativo,
    ru.data_inicio,
    ru.data_fim,
    un.id as unidade_id,
    un.nome as unidade_nome,
    un.cnpj as unidade_cnpj,
    un.status as unidade_status,
    un.telefone_celular as unidade_telefone,
    un.email as unidade_email,
    COUNT(a.id) FILTER (WHERE a.status = 'ATIVO') as total_alunos_ativos,
    COUNT(a.id) as total_alunos
FROM teamcruz.usuarios u
INNER JOIN teamcruz.usuario_perfis up ON up.usuario_id = u.id
INNER JOIN teamcruz.perfis p ON p.id = up.perfil_id AND p.nome = 'recepcionista'
LEFT JOIN teamcruz.recepcionista_unidades ru ON ru.usuario_id = u.id
LEFT JOIN teamcruz.unidades un ON un.id = ru.unidade_id
LEFT JOIN teamcruz.alunos a ON a.unidade_id = un.id
GROUP BY
    u.id, u.nome, u.email, u.cpf, u.telefone,
    ru.id, ru.cargo, ru.turno, ru.horario_entrada, ru.horario_saida,
    ru.dias_semana, ru.ativo, ru.data_inicio, ru.data_fim,
    un.id, un.nome, un.cnpj, un.status, un.telefone_celular, un.email;

-- Exemplo de uso da view:
-- SELECT * FROM teamcruz.v_recepcionistas_unidades WHERE recepcionista_email = 'maria@teamcruz.com';

-- =====================================================
-- GRANTS (Permissões)
-- =====================================================

-- Ajustar conforme seu esquema de permissões
-- GRANT SELECT, INSERT, UPDATE, DELETE ON teamcruz.recepcionista_unidades TO seu_usuario_app;
-- GRANT USAGE ON SEQUENCE teamcruz.recepcionista_unidades_id_seq TO seu_usuario_app;

COMMENT ON TABLE teamcruz.recepcionista_unidades IS 'TABELA CRIADA - Relacionamento N:N entre recepcionistas e unidades';
