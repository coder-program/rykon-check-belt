import { MigrationInterface, QueryRunner } from 'typeorm';

export class InicialSchema1756927400000 implements MigrationInterface {
  name = 'InicialSchema1756927400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar schema teamcruz
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS teamcruz`);

    // Extensão para UUID
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Enums em português
    await queryRunner.query(`DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_dono_endereco') THEN
        CREATE TYPE tipo_dono_endereco AS ENUM ('ALUNO','PROFESSOR','UNIDADE','FRANQUEADO','FUNCIONARIO');
      END IF;
    END$$;`);

    await queryRunner.query(`DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'finalidade_endereco') THEN
        CREATE TYPE finalidade_endereco AS ENUM ('RESIDENCIAL','COMERCIAL','COBRANCA','ENTREGA','OUTRO');
      END IF;
    END$$;`);

    // Tabelas básicas (permissões/usuários)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS teamcruz.tipos_permissao (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      codigo VARCHAR UNIQUE NOT NULL,
      nome VARCHAR NOT NULL,
      descricao TEXT,
      ordem INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS teamcruz.niveis_permissao (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      codigo VARCHAR UNIQUE NOT NULL,
      nome VARCHAR NOT NULL,
      descricao TEXT,
      ordem INTEGER,
      cor VARCHAR,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS teamcruz.permissoes (
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
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS teamcruz.perfis (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      nome VARCHAR UNIQUE NOT NULL,
      descricao TEXT,
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS teamcruz.usuarios (
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
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS teamcruz.password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      token VARCHAR UNIQUE NOT NULL,
      user_id UUID REFERENCES teamcruz.usuarios(id) ON DELETE CASCADE,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS teamcruz.audit_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      entity_name VARCHAR NOT NULL,
      entity_id VARCHAR NOT NULL,
      action VARCHAR NOT NULL,
      old_values JSON,
      new_values JSON,
      user_id UUID REFERENCES teamcruz.usuarios(id),
      ip_address VARCHAR,
      user_agent VARCHAR,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS teamcruz.usuario_perfis (
      usuario_id UUID REFERENCES teamcruz.usuarios(id) ON DELETE CASCADE,
      perfil_id UUID REFERENCES teamcruz.perfis(id) ON DELETE CASCADE,
      PRIMARY KEY (usuario_id, perfil_id)
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS teamcruz.perfil_permissoes (
      perfil_id UUID REFERENCES teamcruz.perfis(id) ON DELETE CASCADE,
      permissao_id UUID REFERENCES teamcruz.permissoes(id) ON DELETE CASCADE,
      PRIMARY KEY (perfil_id, permissao_id)
    )`);

    // Endereços
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS teamcruz.enderecos (
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
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS teamcruz.vinculos_endereco (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tipo_dono tipo_dono_endereco NOT NULL,
      dono_id UUID NOT NULL,
      endereco_id UUID NOT NULL REFERENCES teamcruz.enderecos(id) ON DELETE CASCADE,
      finalidade finalidade_endereco NOT NULL DEFAULT 'RESIDENCIAL',
      principal BOOLEAN NOT NULL DEFAULT false,
      valido_de DATE,
      valido_ate DATE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_vinculos_endereco_dono ON teamcruz.vinculos_endereco(tipo_dono, dono_id)`,
    );

    await queryRunner.query(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'ux_endereco_principal_por_finalidade'
      ) THEN
        CREATE UNIQUE INDEX ux_endereco_principal_por_finalidade
          ON teamcruz.vinculos_endereco(tipo_dono, dono_id, finalidade)
          WHERE principal = true;
      END IF;
    END$$;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índice único condicional
    await queryRunner.query(`DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'ux_endereco_principal_por_finalidade'
      ) THEN
        DROP INDEX ux_endereco_principal_por_finalidade;
      END IF;
    END$$;`);

    await queryRunner.query(`DROP TABLE IF EXISTS teamcruz.vinculos_endereco`);
    await queryRunner.query(`DROP TABLE IF EXISTS teamcruz.enderecos`);

    await queryRunner.query(`DROP TABLE IF EXISTS teamcruz.perfil_permissoes`);
    await queryRunner.query(`DROP TABLE IF EXISTS teamcruz.usuario_perfis`);
    await queryRunner.query(`DROP TABLE IF EXISTS teamcruz.audit_logs`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS teamcruz.password_reset_tokens`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS teamcruz.usuarios`);
    await queryRunner.query(`DROP TABLE IF EXISTS teamcruz.perfis`);
    await queryRunner.query(`DROP TABLE IF EXISTS teamcruz.permissoes`);
    await queryRunner.query(`DROP TABLE IF EXISTS teamcruz.niveis_permissao`);
    await queryRunner.query(`DROP TABLE IF EXISTS teamcruz.tipos_permissao`);

    // Remover tipos ENUM se existirem
    await queryRunner.query(`DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'finalidade_endereco') THEN
        DROP TYPE finalidade_endereco;
      END IF;
    END$$;`);

    await queryRunner.query(`DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_dono_endereco') THEN
        DROP TYPE tipo_dono_endereco;
      END IF;
    END$$;`);
  }
}
