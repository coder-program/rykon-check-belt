-- Criar ENUMs
DO $$ BEGIN
    CREATE TYPE tipo_cadastro AS ENUM ('ALUNO', 'PROFESSOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_cadastro AS ENUM ('ATIVO', 'INATIVO', 'EM_AVALIACAO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE genero AS ENUM ('MASCULINO', 'FEMININO', 'OUTRO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar extensão UUID se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tabela pessoas
CREATE TABLE IF NOT EXISTS pessoas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_cadastro tipo_cadastro NOT NULL,
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    data_nascimento DATE NOT NULL,
    genero genero,
    telefone_whatsapp VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    
    -- Endereço
    cep VARCHAR(10),
    logradouro VARCHAR(255),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    uf VARCHAR(2),
    
    unidade_id UUID,
    status status_cadastro DEFAULT 'ATIVO',
    
    -- Campos de ALUNO
    data_matricula DATE,
    faixa_atual VARCHAR(20),
    grau_atual INTEGER DEFAULT 0,
    
    -- Responsável (para menores)
    responsavel_nome VARCHAR(255),
    responsavel_cpf VARCHAR(14),
    responsavel_telefone VARCHAR(20),
    
    -- Campos de PROFESSOR
    faixa_ministrante VARCHAR(20),
    data_inicio_docencia DATE,
    registro_profissional VARCHAR(100),
    
    -- Campos de controle
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_pessoa_cpf ON pessoas(cpf);
CREATE INDEX IF NOT EXISTS idx_pessoa_tipo_cadastro ON pessoas(tipo_cadastro);
CREATE INDEX IF NOT EXISTS idx_pessoa_status ON pessoas(status);
CREATE INDEX IF NOT EXISTS idx_pessoa_unidade ON pessoas(unidade_id);

-- Inserir alguns dados de exemplo
INSERT INTO pessoas (
    tipo_cadastro, nome_completo, cpf, data_nascimento, 
    genero, telefone_whatsapp, email, status,
    faixa_atual, grau_atual
) VALUES 
(
    'ALUNO', 'João Silva', '123.456.789-00', '1995-05-15',
    'MASCULINO', '(11) 98765-4321', 'joao@email.com', 'ATIVO',
    'AZUL', 2
),
(
    'ALUNO', 'Maria Santos', '987.654.321-00', '2000-08-20',
    'FEMININO', '(11) 98765-1234', 'maria@email.com', 'ATIVO',
    'ROXA', 1
),
(
    'PROFESSOR', 'Carlos Pereira', '111.222.333-44', '1985-03-10',
    'MASCULINO', '(11) 99999-8888', 'carlos@email.com', 'ATIVO',
    NULL, NULL
)
ON CONFLICT (cpf) DO NOTHING;

-- Atualizar campos de professor
UPDATE pessoas 
SET faixa_ministrante = 'PRETA', 
    data_inicio_docencia = '2010-01-15'
WHERE tipo_cadastro = 'PROFESSOR' AND cpf = '111.222.333-44';

SELECT COUNT(*) as total, tipo_cadastro 
FROM pessoas 
GROUP BY tipo_cadastro;
