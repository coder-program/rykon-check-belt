-- Script de criação das tabelas de pessoas e unidades
-- Baseado nas entidades do sistema TeamCruz

-- Criar o schema teamcruz se não existir
CREATE SCHEMA IF NOT EXISTS teamcruz;

-- ==============================================
-- 1. ENUMS PARA PESSOAS E UNIDADES
-- ==============================================

-- Enum para situação do franqueado
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'situacao_franqueado_enum') THEN
        CREATE TYPE teamcruz.situacao_franqueado_enum AS ENUM (
            'ATIVA',
            'INATIVA',
            'EM_HOMOLOGACAO'
        );
    END IF;
END $$;

-- Enum para gênero
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'genero_enum') THEN
        CREATE TYPE teamcruz.genero_enum AS ENUM (
            'MASCULINO',
            'FEMININO',
            'OUTRO'
        );
    END IF;
END $$;

-- Enum para status do aluno
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_aluno_enum') THEN
        CREATE TYPE teamcruz.status_aluno_enum AS ENUM (
            'ATIVO',
            'INATIVO',
            'SUSPENSO',
            'CANCELADO'
        );
    END IF;
END $$;

-- Enum para faixa do aluno (completo)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'faixa_aluno_enum') THEN
        CREATE TYPE teamcruz.faixa_aluno_enum AS ENUM (
            'BRANCA',
            'CINZA_BRANCA',
            'CINZA',
            'CINZA_PRETA',
            'AMARELA_BRANCA',
            'AMARELA',
            'AMARELA_PRETA',
            'LARANJA_BRANCA',
            'LARANJA',
            'LARANJA_PRETA',
            'VERDE_BRANCA',
            'VERDE',
            'VERDE_PRETA',
            'AZUL',
            'ROXA',
            'MARROM',
            'PRETA',
            'CORAL',
            'VERMELHA'
        );
    END IF;
END $$;

-- Enum para tipo de cadastro
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_cadastro_enum') THEN
        CREATE TYPE teamcruz.tipo_cadastro_enum AS ENUM (
            'ALUNO',
            'PROFESSOR'
        );
    END IF;
END $$;

-- Enum para status de cadastro
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_cadastro_enum') THEN
        CREATE TYPE teamcruz.status_cadastro_enum AS ENUM (
            'ATIVO',
            'INATIVO',
            'EM_AVALIACAO'
        );
    END IF;
END $$;

-- Enum para status da unidade
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_unidade_enum') THEN
        CREATE TYPE teamcruz.status_unidade_enum AS ENUM (
            'ATIVA',
            'INATIVA',
            'HOMOLOGACAO'
        );
    END IF;
END $$;

-- Enum para papel do responsável
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'papel_responsavel_enum') THEN
        CREATE TYPE teamcruz.papel_responsavel_enum AS ENUM (
            'PROPRIETARIO',
            'GERENTE',
            'INSTRUTOR',
            'ADMINISTRATIVO'
        );
    END IF;
END $$;

-- Enum para modalidades
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'modalidade_enum') THEN
        CREATE TYPE teamcruz.modalidade_enum AS ENUM (
            'INFANTIL',
            'ADULTO',
            'NO_GI',
            'COMPETICAO',
            'FEMININO',
            'AUTODEFESA',
            'CONDICIONAMENTO'
        );
    END IF;
END $$;

-- ==============================================
-- 2. TABELA FRANQUEADOS
-- ==============================================

CREATE TABLE IF NOT EXISTS teamcruz.franqueados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identificação
    nome VARCHAR(150) NOT NULL,
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    razao_social VARCHAR(200),
    nome_fantasia VARCHAR(150),
    inscricao_estadual VARCHAR(20),
    inscricao_municipal VARCHAR(20),

    -- Contato
    email VARCHAR(120),
    telefone VARCHAR(20), -- Mantido para compatibilidade
    telefone_fixo VARCHAR(20),
    telefone_celular VARCHAR(20),
    website VARCHAR(200),
    redes_sociais JSONB,

    -- Endereço
    endereco_id UUID,

    -- Dados do Responsável Legal
    responsavel_nome VARCHAR(150),
    responsavel_cpf VARCHAR(14),
    responsavel_cargo VARCHAR(100),
    responsavel_email VARCHAR(120),
    responsavel_telefone VARCHAR(20),

    -- Informações da Franquia
    ano_fundacao INTEGER,
    missao TEXT,
    visao TEXT,
    valores TEXT,
    historico TEXT,
    logotipo_url VARCHAR(500),

    -- Relacionamento Hierárquico
    id_matriz UUID,

    -- Gestão
    unidades_gerencia TEXT[], -- Array de IDs das unidades

    -- Dados Financeiros
    data_contrato DATE,
    taxa_franquia DECIMAL(10,2),
    dados_bancarios JSONB,

    -- Status
    situacao teamcruz.situacao_franqueado_enum DEFAULT 'ATIVA' NOT NULL,
    ativo BOOLEAN DEFAULT TRUE NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Foreign Keys
    CONSTRAINT fk_franqueados_endereco FOREIGN KEY (endereco_id) REFERENCES teamcruz.enderecos(id),
    CONSTRAINT fk_franqueados_matriz FOREIGN KEY (id_matriz) REFERENCES teamcruz.franqueados(id)
);

-- Índices para franqueados
CREATE UNIQUE INDEX IF NOT EXISTS idx_franqueados_cnpj ON teamcruz.franqueados(cnpj);
CREATE INDEX IF NOT EXISTS idx_franqueados_situacao ON teamcruz.franqueados(situacao);
CREATE INDEX IF NOT EXISTS idx_franqueados_matriz ON teamcruz.franqueados(id_matriz);

-- ==============================================
-- 3. TABELA UNIDADES
-- ==============================================

CREATE TABLE IF NOT EXISTS teamcruz.unidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Referência ao franqueado
    franqueado_id UUID NOT NULL,

    -- Identificação da Unidade
    nome VARCHAR(150) NOT NULL,
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    razao_social VARCHAR(200),
    nome_fantasia VARCHAR(150),
    inscricao_estadual VARCHAR(20),
    inscricao_municipal VARCHAR(20),
    codigo_interno VARCHAR(50),

    -- Contato
    telefone_fixo VARCHAR(20),
    telefone_celular VARCHAR(20),
    email VARCHAR(120),
    website VARCHAR(200),
    redes_sociais JSONB,

    status teamcruz.status_unidade_enum DEFAULT 'HOMOLOGACAO' NOT NULL,

    -- Dados do responsável pela unidade
    responsavel_nome VARCHAR(150) NOT NULL,
    responsavel_cpf VARCHAR(14) NOT NULL,
    responsavel_papel teamcruz.papel_responsavel_enum NOT NULL,
    responsavel_contato VARCHAR(120) NOT NULL,

    -- Estrutura da Unidade
    qtde_tatames INTEGER,
    area_tatame_m2 DECIMAL(10,2),
    capacidade_max_alunos INTEGER,
    qtde_instrutores INTEGER DEFAULT 0 NOT NULL,
    valor_plano_padrao DECIMAL(10,2),

    -- Dados estruturais (JSONB)
    horarios_funcionamento JSONB,
    modalidades JSONB, -- Array de modalidades

    -- Responsável Técnico
    instrutor_principal_id UUID,

    -- Endereço
    endereco_id UUID,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Foreign Keys
    CONSTRAINT fk_unidades_franqueado FOREIGN KEY (franqueado_id) REFERENCES teamcruz.franqueados(id) ON DELETE CASCADE,
    CONSTRAINT fk_unidades_endereco FOREIGN KEY (endereco_id) REFERENCES teamcruz.enderecos(id)
    -- CONSTRAINT fk_unidades_instrutor FOREIGN KEY (instrutor_principal_id) REFERENCES teamcruz.pessoas(id) -- Descomente se necessário
);

-- Índices para unidades
CREATE UNIQUE INDEX IF NOT EXISTS idx_unidades_cnpj ON teamcruz.unidades(cnpj);
CREATE INDEX IF NOT EXISTS idx_unidades_franqueado ON teamcruz.unidades(franqueado_id);
CREATE INDEX IF NOT EXISTS idx_unidades_status ON teamcruz.unidades(status);

-- ==============================================
-- 4. TABELA PESSOAS (Tabela unificada)
-- ==============================================

CREATE TABLE IF NOT EXISTS teamcruz.pessoas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Campos Comuns
    tipo_cadastro teamcruz.tipo_cadastro_enum NOT NULL,
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    data_nascimento DATE NOT NULL,
    genero teamcruz.genero_enum NOT NULL,
    telefone_whatsapp VARCHAR(20),
    email VARCHAR(255),

    -- Endereço (opcional)
    cep VARCHAR(10),
    logradouro VARCHAR(255),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    uf VARCHAR(2),

    unidade_id UUID,
    status teamcruz.status_cadastro_enum DEFAULT 'ATIVO' NOT NULL,

    -- Campos Específicos de Aluno
    data_matricula DATE,
    faixa_atual VARCHAR(20),
    grau_atual INTEGER DEFAULT 0,

    -- Responsável (para menores de 18 anos)
    responsavel_nome VARCHAR(255),
    responsavel_cpf VARCHAR(14),
    responsavel_telefone VARCHAR(20),

    -- Campos Específicos de Professor
    faixa_ministrante VARCHAR(20),
    data_inicio_docencia DATE,
    registro_profissional VARCHAR(100),

    -- Campos de Controle
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID,
    updated_by UUID,

    -- Foreign Keys
    CONSTRAINT fk_pessoas_unidade FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id)
    -- CONSTRAINT fk_pessoas_created_by FOREIGN KEY (created_by) REFERENCES teamcruz.usuarios(id),
    -- CONSTRAINT fk_pessoas_updated_by FOREIGN KEY (updated_by) REFERENCES teamcruz.usuarios(id)
);

-- Índices para pessoas
CREATE UNIQUE INDEX IF NOT EXISTS idx_pessoas_cpf ON teamcruz.pessoas(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pessoas_tipo_cadastro ON teamcruz.pessoas(tipo_cadastro);
CREATE INDEX IF NOT EXISTS idx_pessoas_status ON teamcruz.pessoas(status);
CREATE INDEX IF NOT EXISTS idx_pessoas_unidade ON teamcruz.pessoas(unidade_id);
CREATE INDEX IF NOT EXISTS idx_pessoas_nome ON teamcruz.pessoas(nome_completo);

-- ==============================================
-- 5. TABELA ALUNOS (Tabela específica detalhada)
-- ==============================================

CREATE TABLE IF NOT EXISTS teamcruz.alunos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Dados Pessoais
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    data_nascimento DATE NOT NULL,
    genero teamcruz.genero_enum NOT NULL,

    -- Contato
    email VARCHAR(255),
    telefone VARCHAR(20),
    telefone_emergencia VARCHAR(20),
    nome_contato_emergencia VARCHAR(255),

    -- Endereço
    endereco_id UUID,

    -- Dados de Matrícula
    numero_matricula VARCHAR(20) UNIQUE,
    data_matricula DATE DEFAULT CURRENT_DATE NOT NULL,
    usuario_id UUID,
    unidade_id UUID NOT NULL,
    status teamcruz.status_aluno_enum DEFAULT 'ATIVO' NOT NULL,

    -- Graduação
    faixa_atual teamcruz.faixa_aluno_enum DEFAULT 'BRANCA' NOT NULL,
    graus INTEGER DEFAULT 0 NOT NULL,
    data_ultima_graduacao DATE,

    -- Dados Médicos
    observacoes_medicas TEXT,
    alergias TEXT,
    medicamentos_uso_continuo TEXT,
    plano_saude VARCHAR(100),
    atestado_medico_validade DATE,
    restricoes_medicas TEXT,

    -- Responsável (para menores)
    responsavel_nome VARCHAR(255),
    responsavel_cpf VARCHAR(14),
    responsavel_telefone VARCHAR(20),
    responsavel_parentesco VARCHAR(50),

    -- Dados Financeiros
    dia_vencimento INTEGER,
    valor_mensalidade DECIMAL(10,2),
    desconto_percentual DECIMAL(5,2) DEFAULT 0 NOT NULL,

    -- Consentimentos LGPD
    consent_lgpd BOOLEAN DEFAULT FALSE,
    consent_lgpd_date TIMESTAMPTZ,
    consent_imagem BOOLEAN DEFAULT FALSE,

    -- Metadados
    observacoes TEXT,
    foto_url VARCHAR(500),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP, -- Soft delete

    -- Foreign Keys
    CONSTRAINT fk_alunos_unidade FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id),
    CONSTRAINT fk_alunos_endereco FOREIGN KEY (endereco_id) REFERENCES teamcruz.enderecos(id)
    -- CONSTRAINT fk_alunos_usuario FOREIGN KEY (usuario_id) REFERENCES teamcruz.usuarios(id)
);

-- Índices para alunos
CREATE UNIQUE INDEX IF NOT EXISTS idx_alunos_cpf ON teamcruz.alunos(cpf);
CREATE UNIQUE INDEX IF NOT EXISTS idx_alunos_matricula ON teamcruz.alunos(numero_matricula) WHERE numero_matricula IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alunos_nome ON teamcruz.alunos(nome_completo);
CREATE INDEX IF NOT EXISTS idx_alunos_unidade ON teamcruz.alunos(unidade_id);
CREATE INDEX IF NOT EXISTS idx_alunos_status ON teamcruz.alunos(status);
CREATE INDEX IF NOT EXISTS idx_alunos_faixa ON teamcruz.alunos(faixa_atual);
CREATE INDEX IF NOT EXISTS idx_alunos_deleted_at ON teamcruz.alunos(deleted_at); -- Para soft delete

-- ==============================================
-- TRIGGERS PARA UPDATE_AT AUTOMÁTICO
-- ==============================================

-- Aplicar trigger nas tabelas que têm updated_at
CREATE TRIGGER update_franqueados_updated_at
    BEFORE UPDATE ON teamcruz.franqueados
    FOR EACH ROW EXECUTE FUNCTION teamcruz.update_updated_at_column();

CREATE TRIGGER update_unidades_updated_at
    BEFORE UPDATE ON teamcruz.unidades
    FOR EACH ROW EXECUTE FUNCTION teamcruz.update_updated_at_column();

CREATE TRIGGER update_pessoas_updated_at
    BEFORE UPDATE ON teamcruz.pessoas
    FOR EACH ROW EXECUTE FUNCTION teamcruz.update_updated_at_column();

CREATE TRIGGER update_alunos_updated_at
    BEFORE UPDATE ON teamcruz.alunos
    FOR EACH ROW EXECUTE FUNCTION teamcruz.update_updated_at_column();

-- ==============================================
-- COMENTÁRIOS NAS TABELAS
-- ==============================================

-- Franqueados
COMMENT ON TABLE teamcruz.franqueados IS 'Tabela de franqueados do sistema TeamCruz';
COMMENT ON COLUMN teamcruz.franqueados.id_matriz IS 'Se NULL = é matriz, se preenchido = é filial';
COMMENT ON COLUMN teamcruz.franqueados.unidades_gerencia IS 'Array de IDs das unidades que gerencia';
COMMENT ON COLUMN teamcruz.franqueados.redes_sociais IS 'JSON com redes sociais: instagram, facebook, youtube, tiktok, linkedin';
COMMENT ON COLUMN teamcruz.franqueados.dados_bancarios IS 'JSON com dados bancários: banco, agencia, conta, titular, documento';

-- Unidades
COMMENT ON TABLE teamcruz.unidades IS 'Tabela de unidades/academias do sistema';
COMMENT ON COLUMN teamcruz.unidades.horarios_funcionamento IS 'JSON com horários por dia da semana';
COMMENT ON COLUMN teamcruz.unidades.modalidades IS 'Array JSON com modalidades oferecidas';

-- Pessoas
COMMENT ON TABLE teamcruz.pessoas IS 'Tabela unificada para alunos e professores';
COMMENT ON COLUMN teamcruz.pessoas.tipo_cadastro IS 'ALUNO ou PROFESSOR';

-- Alunos
COMMENT ON TABLE teamcruz.alunos IS 'Tabela detalhada específica para alunos';
COMMENT ON COLUMN teamcruz.alunos.deleted_at IS 'Campo para soft delete';
COMMENT ON COLUMN teamcruz.alunos.consent_lgpd IS 'Consentimento LGPD para uso dos dados';
COMMENT ON COLUMN teamcruz.alunos.consent_imagem IS 'Consentimento para uso de imagem';

-- ==============================================
-- FUNÇÕES AUXILIARES
-- ==============================================

-- Função para calcular idade
CREATE OR REPLACE FUNCTION teamcruz.calcular_idade(data_nascimento DATE)
RETURNS INTEGER AS $$
DECLARE
    idade INTEGER;
BEGIN
    SELECT EXTRACT(YEAR FROM AGE(data_nascimento)) INTO idade;
    RETURN idade;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar se é menor de idade
CREATE OR REPLACE FUNCTION teamcruz.is_menor_idade(data_nascimento DATE)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN teamcruz.calcular_idade(data_nascimento) < 18;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar número de matrícula
CREATE OR REPLACE FUNCTION teamcruz.gerar_numero_matricula(unidade_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    contador INTEGER;
    numero_matricula VARCHAR(20);
BEGIN
    -- Busca o próximo número sequencial para a unidade
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_matricula FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO contador
    FROM teamcruz.alunos
    WHERE alunos.unidade_id = gerar_numero_matricula.unidade_id
    AND numero_matricula IS NOT NULL;

    -- Formato: UN-{primeiros 8 chars do UUID}-{contador}
    numero_matricula := 'UN-' || SUBSTRING(unidade_id::TEXT FROM 1 FOR 8) || '-' || LPAD(contador::TEXT, 4, '0');

    RETURN numero_matricula;
END;
$$ LANGUAGE plpgsql;

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
    'franqueados',
    'unidades',
    'pessoas',
    'alunos'
)
ORDER BY tablename;

-- Mostrar os ENUMs criados
SELECT
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'teamcruz')
ORDER BY t.typname, e.enumsortorder;