import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnderecosSchema1756927800000 implements MigrationInterface {
  name = 'EnderecosSchema1756927800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tabela de endereços
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS teamcruz.enderecos (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      cep VARCHAR(8) NOT NULL,
      logradouro VARCHAR(200) NOT NULL,
      numero VARCHAR(20) NOT NULL,
      complemento VARCHAR(100),
      bairro VARCHAR(100) NOT NULL,
      cidade_nome VARCHAR(100) NOT NULL,
      estado VARCHAR(2) NOT NULL,
      codigo_pais VARCHAR(50) DEFAULT 'BR',
      latitude NUMERIC(10,8),
      longitude NUMERIC(11,8),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Criar tabela de vínculos de endereço
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS teamcruz.vinculos_endereco (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tipo_dono VARCHAR(20) NOT NULL,
      dono_id UUID NOT NULL,
      endereco_id UUID NOT NULL REFERENCES teamcruz.enderecos(id) ON DELETE CASCADE,
      finalidade VARCHAR(20) DEFAULT 'RESIDENCIAL',
      principal BOOLEAN DEFAULT false,
      valido_de TIMESTAMP,
      valido_ate TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Adicionar constraint único para evitar duplos endereços principais
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS ix_vinculos_endereco_principal_unico 
      ON teamcruz.vinculos_endereco (tipo_dono, dono_id, finalidade) 
      WHERE principal = true`);

    // Adicionar coluna endereco_id na tabela unidades
    await queryRunner.query(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'teamcruz' 
        AND table_name = 'unidades' 
        AND column_name = 'endereco_id'
      ) THEN
        ALTER TABLE teamcruz.unidades 
        ADD COLUMN endereco_id UUID REFERENCES teamcruz.enderecos(id) ON UPDATE CASCADE ON DELETE SET NULL;
      END IF;
    END$$;`);

    // Índices
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_enderecos_cep ON teamcruz.enderecos (cep)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_enderecos_cidade_estado ON teamcruz.enderecos (cidade_nome, estado)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_vinculos_endereco_dono ON teamcruz.vinculos_endereco (tipo_dono, dono_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_vinculos_endereco_endereco ON teamcruz.vinculos_endereco (endereco_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_unidades_endereco ON teamcruz.unidades (endereco_id)`,
    );

    // Comentários
    await queryRunner.query(
      `COMMENT ON TABLE teamcruz.enderecos IS 'Endereços para unidades e outras entidades'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN teamcruz.enderecos.cep IS 'CEP sem formatação (somente números)'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN teamcruz.enderecos.latitude IS 'Latitude para geolocalização'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN teamcruz.enderecos.longitude IS 'Longitude para geolocalização'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove coluna da tabela unidades
    await queryRunner.query(`ALTER TABLE teamcruz.unidades DROP COLUMN IF EXISTS endereco_id`);
    
    // Remove tabela de vínculos de endereço
    await queryRunner.query(`DROP TABLE IF EXISTS teamcruz.vinculos_endereco`);
    
    // Remove tabela de endereços
    await queryRunner.query(`DROP TABLE IF EXISTS teamcruz.enderecos`);
  }
}
