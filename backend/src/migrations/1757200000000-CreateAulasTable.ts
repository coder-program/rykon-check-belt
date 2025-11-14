import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAulasTable1757200000000 implements MigrationInterface {
  name = 'CreateAulasTable1757200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar ENUM para tipo de aula
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_aula_enum') THEN
          CREATE TYPE tipo_aula_enum AS ENUM ('GI', 'NO_GI', 'INFANTIL', 'FEMININO', 'COMPETICAO', 'LIVRE');
        END IF;
      END$$;
    `);

    // Criar tabela aulas
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS teamcruz.aulas (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        unidade_id UUID NOT NULL,
        professor_id UUID,
        tipo tipo_aula_enum NOT NULL DEFAULT 'GI',
        dia_semana INTEGER CHECK (dia_semana >= 0 AND dia_semana <= 6),
        data_hora_inicio TIMESTAMPTZ,
        data_hora_fim TIMESTAMPTZ,
        capacidade_maxima INTEGER NOT NULL DEFAULT 30,
        ativo BOOLEAN NOT NULL DEFAULT true,
        qr_code VARCHAR(500),
        qr_code_gerado_em TIMESTAMPTZ,
        configuracoes JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        -- Foreign Keys
        CONSTRAINT fk_aula_unidade FOREIGN KEY (unidade_id)
          REFERENCES teamcruz.unidades(id) ON DELETE CASCADE,
        CONSTRAINT fk_aula_professor FOREIGN KEY (professor_id)
          REFERENCES teamcruz.pessoas(id) ON DELETE SET NULL
      )
    `);

    // Criar índices para performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_aulas_unidade_id ON teamcruz.aulas(unidade_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_aulas_professor_id ON teamcruz.aulas(professor_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_aulas_ativo ON teamcruz.aulas(ativo);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_aulas_dia_semana ON teamcruz.aulas(dia_semana);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_aulas_unidade_dia_inicio
      ON teamcruz.aulas(unidade_id, dia_semana, data_hora_inicio);
    `);

    // Comentários na tabela
    await queryRunner.query(`
      COMMENT ON TABLE teamcruz.aulas IS 'Aulas disponíveis nas unidades da TeamCruz';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN teamcruz.aulas.tipo IS 'Tipo de aula: GI, NO_GI, INFANTIL, FEMININO, COMPETICAO, LIVRE';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN teamcruz.aulas.dia_semana IS '0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN teamcruz.aulas.configuracoes IS 'Configurações adicionais da aula em formato JSON';
    `);

    // Trigger para atualizar updated_at automaticamente
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_aulas_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_update_aulas_updated_at ON teamcruz.aulas;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_update_aulas_updated_at
      BEFORE UPDATE ON teamcruz.aulas
      FOR EACH ROW
      EXECUTE FUNCTION update_aulas_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover trigger
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_update_aulas_updated_at ON teamcruz.aulas;
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_aulas_updated_at();
    `);

    // Remover índices
    await queryRunner.query(
      `DROP INDEX IF EXISTS teamcruz.idx_aulas_unidade_dia_inicio`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS teamcruz.idx_aulas_dia_semana`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS teamcruz.idx_aulas_ativo`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS teamcruz.idx_aulas_professor_id`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS teamcruz.idx_aulas_unidade_id`,
    );

    // Remover tabela
    await queryRunner.query(`DROP TABLE IF EXISTS teamcruz.aulas`);

    // Remover ENUM
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_aula_enum') THEN
          DROP TYPE tipo_aula_enum;
        END IF;
      END$$;
    `);
  }
}
