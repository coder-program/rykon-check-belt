const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'acesso_usuarios_db',
});

async function createTables() {
  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL');

    // Criar extensão uuid se não existir
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // Criar tabelas
    const createTables = `
      -- Tabela tipos_permissao
      CREATE TABLE IF NOT EXISTS tipos_permissao (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        codigo VARCHAR UNIQUE NOT NULL,
        nome VARCHAR NOT NULL,
        descricao TEXT,
        ordem INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabela niveis_permissao
      CREATE TABLE IF NOT EXISTS niveis_permissao (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        codigo VARCHAR UNIQUE NOT NULL,
        nome VARCHAR NOT NULL,
        descricao TEXT,
        ordem INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabela permissoes
      CREATE TABLE IF NOT EXISTS permissoes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        codigo VARCHAR UNIQUE NOT NULL,
        nome VARCHAR NOT NULL,
        descricao TEXT,
        tipo_id UUID REFERENCES tipos_permissao(id),
        nivel_id UUID REFERENCES niveis_permissao(id),
        modulo VARCHAR,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabela perfis
      CREATE TABLE IF NOT EXISTS perfis (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nome VARCHAR UNIQUE NOT NULL,
        descricao TEXT,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabela usuarios
      CREATE TABLE IF NOT EXISTS usuarios (
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

      -- Tabela password_reset_tokens
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        token VARCHAR UNIQUE NOT NULL,
        user_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabela audit_logs
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        entity_name VARCHAR NOT NULL,
        entity_id VARCHAR NOT NULL,
        action VARCHAR NOT NULL,
        old_values JSON,
        new_values JSON,
        user_id UUID REFERENCES usuarios(id),
        ip_address VARCHAR,
        user_agent VARCHAR,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabela de relacionamento usuario_perfis
      CREATE TABLE IF NOT EXISTS usuario_perfis (
        usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
        perfil_id UUID REFERENCES perfis(id) ON DELETE CASCADE,
        PRIMARY KEY (usuario_id, perfil_id)
      );

      -- Tabela de relacionamento perfil_permissoes
      CREATE TABLE IF NOT EXISTS perfil_permissoes (
        perfil_id UUID REFERENCES perfis(id) ON DELETE CASCADE,
        permissao_id UUID REFERENCES permissoes(id) ON DELETE CASCADE,
        PRIMARY KEY (perfil_id, permissao_id)
      );

      -- ==============================
      -- Endereços (normalizado) - Nomes em Português
      -- ==============================

      -- Tipos ENUM para links de endereço (com verificação de existência)
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_dono_endereco') THEN
          CREATE TYPE tipo_dono_endereco AS ENUM ('ALUNO','PROFESSOR','UNIDADE','FRANQUEADO','FUNCIONARIO');
        END IF;
      END$$;

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'finalidade_endereco') THEN
          CREATE TYPE finalidade_endereco AS ENUM ('RESIDENCIAL','COMERCIAL','COBRANCA','ENTREGA','OUTRO');
        END IF;
      END$$;

      -- Tabela enderecos (usando cidade_nome/estado para simplicidade)
      CREATE TABLE IF NOT EXISTS enderecos (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        cep VARCHAR(8) NOT NULL,
        logradouro VARCHAR(200) NOT NULL,
        numero VARCHAR(20) NOT NULL,
        complemento VARCHAR(100),
        bairro VARCHAR(100),
        cidade_nome VARCHAR(120),
        estado VARCHAR(2),
        codigo_pais CHAR(2) DEFAULT 'BR' NOT NULL,
        latitude NUMERIC(9,6),
        longitude NUMERIC(9,6),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabela vinculos_endereco (polimórfica)
      CREATE TABLE IF NOT EXISTS vinculos_endereco (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tipo_dono tipo_dono_endereco NOT NULL,
        dono_id UUID NOT NULL,
        endereco_id UUID NOT NULL REFERENCES enderecos(id) ON DELETE CASCADE,
        finalidade finalidade_endereco NOT NULL DEFAULT 'RESIDENCIAL',
        principal BOOLEAN NOT NULL DEFAULT false,
        valido_de DATE,
        valido_ate DATE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Índices úteis
      CREATE INDEX IF NOT EXISTS ix_vinculos_endereco_dono ON vinculos_endereco(tipo_dono, dono_id);

      -- Garante 1 endereço principal por finalidade
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'ux_endereco_principal_por_finalidade'
        ) THEN
          CREATE UNIQUE INDEX ux_endereco_principal_por_finalidade
            ON vinculos_endereco(tipo_dono, dono_id, finalidade)
            WHERE principal = true;
        END IF;
      END$$;
    `;

    await client.query(createTables);
    console.log('✅ Tabelas criadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.end();
  }
}

createTables();
