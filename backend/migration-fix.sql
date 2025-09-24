-- Corrigir as migrações com schema correto
SET search_path TO teamcruz, public;

-- Criar schema teamcruz se não existir
CREATE SCHEMA IF NOT EXISTS teamcruz;

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tabela tipos_permissao primeiro
CREATE TABLE IF NOT EXISTS teamcruz.tipos_permissao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR UNIQUE NOT NULL,
  nome VARCHAR NOT NULL,
  descricao TEXT,
  ordem INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela niveis_permissao
CREATE TABLE IF NOT EXISTS teamcruz.niveis_permissao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR UNIQUE NOT NULL,
  nome VARCHAR NOT NULL,
  descricao TEXT,
  ordem INTEGER,
  cor VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agora criar permissoes com referencias corretas
CREATE TABLE IF NOT EXISTS teamcruz.permissoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR UNIQUE NOT NULL,
  nome VARCHAR NOT NULL,
  descricao TEXT,
  tipo_id UUID REFERENCES teamcruz.tipos_permissao(id),
  nivel_id UUID REFERENCES teamcruz.niveis_permissao(id),
  modulo VARCHAR,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela perfis
CREATE TABLE IF NOT EXISTS teamcruz.perfis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR UNIQUE NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela usuarios
CREATE TABLE IF NOT EXISTS teamcruz.usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR UNIQUE NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,
  nome VARCHAR NOT NULL,
  cpf VARCHAR,
  telefone VARCHAR,
  ativo BOOLEAN DEFAULT true,
  ultimo_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabelas de relacionamento
CREATE TABLE IF NOT EXISTS teamcruz.perfil_permissoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  perfil_id UUID REFERENCES teamcruz.perfis(id) ON DELETE CASCADE,
  permissao_id UUID REFERENCES teamcruz.permissoes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(perfil_id, permissao_id)
);

CREATE TABLE IF NOT EXISTS teamcruz.usuario_perfis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES teamcruz.usuarios(id) ON DELETE CASCADE,
  perfil_id UUID REFERENCES teamcruz.perfis(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(usuario_id, perfil_id)
);

-- Criar tabela password_reset_tokens
CREATE TABLE IF NOT EXISTS teamcruz.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token VARCHAR UNIQUE NOT NULL,
  user_id UUID REFERENCES teamcruz.usuarios(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela audit_logs
CREATE TABLE IF NOT EXISTS teamcruz.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_name VARCHAR NOT NULL,
  entity_id VARCHAR NOT NULL,
  action VARCHAR NOT NULL,
  old_values JSON,
  new_values JSON,
  user_id UUID REFERENCES teamcruz.usuarios(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir dados iniciais de tipos de permissão
INSERT INTO teamcruz.tipos_permissao (codigo, nome, descricao, ordem) VALUES
('CREATE', 'Criar', 'Permissão para criar novos registros', 1),
('READ', 'Visualizar', 'Permissão para visualizar registros', 2),
('UPDATE', 'Editar', 'Permissão para editar registros existentes', 3),
('DELETE', 'Excluir', 'Permissão para excluir registros', 4),
('ADMIN', 'Administrar', 'Permissão administrativa completa', 5)
ON CONFLICT (codigo) DO NOTHING;

-- Inserir dados iniciais de níveis de permissão
INSERT INTO teamcruz.niveis_permissao (codigo, nome, descricao, ordem, cor) VALUES
('LOW', 'Baixo', 'Nível de permissão baixo', 1, '#28a745'),
('MEDIUM', 'Médio', 'Nível de permissão médio', 2, '#ffc107'),
('HIGH', 'Alto', 'Nível de permissão alto', 3, '#fd7e14'),
('CRITICAL', 'Crítico', 'Nível de permissão crítico', 4, '#dc3545'),
('SYSTEM', 'Sistema', 'Nível de permissão de sistema', 5, '#6f42c1')
ON CONFLICT (codigo) DO NOTHING;

-- Marcar migrações como executadas
INSERT INTO migrations (timestamp, name) VALUES
(1756927400000, 'InicialSchema1756927400000');

COMMIT;
