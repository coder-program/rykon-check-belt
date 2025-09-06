import { MigrationInterface, QueryRunner } from 'typeorm';

export class UnidadesSchema1756927500000 implements MigrationInterface {
  name = 'UnidadesSchema1756927500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ENUMs para unidades
    await queryRunner.query(`DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_unidade_enum') THEN
        CREATE TYPE status_unidade_enum AS ENUM ('ATIVA','INATIVA','HOMOLOGACAO');
      END IF;
    END$$;`);

    await queryRunner.query(`DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'papel_responsavel_enum') THEN
        CREATE TYPE papel_responsavel_enum AS ENUM ('PROPRIETARIO','GERENTE','INSTRUTOR','ADMINISTRATIVO');
      END IF;
    END$$;`);

    // Tabela franqueados (necessária para FK)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS teamcruz.franqueados (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      nome VARCHAR(150) NOT NULL,
      email VARCHAR(120) UNIQUE NOT NULL,
      telefone VARCHAR(20),
      cnpj VARCHAR(18) NOT NULL UNIQUE,
      unidades_gerencia JSONB DEFAULT '[]'::jsonb,
      data_contrato DATE NOT NULL,
      taxa_franquia NUMERIC(10,2),
      dados_bancarios JSONB,
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabela unidades
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS teamcruz.unidades (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      franqueado_id UUID NOT NULL REFERENCES teamcruz.franqueados(id) ON UPDATE CASCADE ON DELETE RESTRICT,
      nome VARCHAR(150) NOT NULL,
      cnpj VARCHAR(18) NOT NULL UNIQUE,
      status status_unidade_enum NOT NULL DEFAULT 'HOMOLOGACAO',
      responsavel_nome VARCHAR(150) NOT NULL,
      responsavel_cpf VARCHAR(14) NOT NULL,
      responsavel_papel papel_responsavel_enum NOT NULL,
      responsavel_contato VARCHAR(120) NOT NULL,
      qtde_tatames INTEGER,
      capacidade_max_alunos INTEGER,
      valor_plano_padrao NUMERIC(10,2),
      horarios_funcionamento JSONB,
      modalidades JSONB,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )`);

    // Índices
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_unidades_franqueado ON teamcruz.unidades (franqueado_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_unidades_status ON teamcruz.unidades (status)`,
    );

    // Comentários
    await queryRunner.query(
      `COMMENT ON TABLE teamcruz.unidades IS 'Unidades físicas (academias) vinculadas ao franqueado'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN teamcruz.unidades.status IS 'ATIVA, INATIVA ou HOMOLOGACAO'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS teamcruz.unidades`);
    await queryRunner.query(`DROP TABLE IF EXISTS teamcruz.franqueados`);

    await queryRunner.query(`DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'papel_responsavel_enum') THEN
        DROP TYPE papel_responsavel_enum;
      END IF;
    END$$;`);

    await queryRunner.query(`DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_unidade_enum') THEN
        DROP TYPE status_unidade_enum;
      END IF;
    END$$;`);
  }
}
