import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreatePresencasTable1735589400000 implements MigrationInterface {
  name = 'CreatePresencasTable1735589400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enum para método de check-in
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'presenca_metodo_enum') THEN
          CREATE TYPE presenca_metodo_enum AS ENUM (
            'QR_CODE', 'CPF', 'FACIAL', 'NOME', 'MANUAL', 'RESPONSAVEL'
          );
        END IF;
      END$$;
    `);

    // Criar enum para status da presença
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'presenca_status_enum') THEN
          CREATE TYPE presenca_status_enum AS ENUM (
            'PRESENTE', 'AUSENTE', 'ATRASADO', 'JUSTIFICADO', 'CANCELADO'
          );
        END IF;
      END$$;
    `);

    // Criar tabela de presenças
    await queryRunner.createTable(
      new Table({
        name: 'presencas',
        schema: 'teamcruz',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'pessoa_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'unidade_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'aula_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'data_presenca',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'hora_checkin',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'hora_checkout',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'metodo_checkin',
            type: 'presenca_metodo_enum',
            default: "'MANUAL'",
          },
          {
            name: 'status',
            type: 'presenca_status_enum',
            default: "'PRESENTE'",
          },
          {
            name: 'observacoes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'ip_checkin',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'dispositivo_info',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'localizacao_gps',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'foto_checkin',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'responsavel_checkin_id',
            type: 'uuid',
            isNullable: true,
            comment: 'ID do responsável que fez o check-in (para menores)',
          },
          {
            name: 'validado_por',
            type: 'uuid',
            isNullable: true,
            comment: 'ID do instrutor/funcionário que validou',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            name: 'FK_presenca_pessoa',
            columnNames: ['pessoa_id'],
            referencedSchema: 'teamcruz',
            referencedTableName: 'pessoas',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_presenca_unidade',
            columnNames: ['unidade_id'],
            referencedSchema: 'teamcruz',
            referencedTableName: 'unidades',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            name: 'FK_presenca_responsavel',
            columnNames: ['responsavel_checkin_id'],
            referencedSchema: 'teamcruz',
            referencedTableName: 'pessoas',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            name: 'FK_presenca_validador',
            columnNames: ['validado_por'],
            referencedSchema: 'teamcruz',
            referencedTableName: 'usuarios',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );

    // Criar índices para otimização usando SQL direto (apenas se as colunas existirem)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'teamcruz' 
          AND table_name = 'presencas' 
          AND column_name = 'pessoa_id'
        ) THEN
          CREATE INDEX IF NOT EXISTS IDX_presenca_pessoa_data ON teamcruz.presencas (pessoa_id, data_presenca);
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_presenca_unidade_data ON teamcruz.presencas (unidade_id, data_presenca);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_presenca_data ON teamcruz.presencas (data_presenca);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_presenca_metodo ON teamcruz.presencas (metodo_checkin);
    `);

    // Constraint única para evitar múltiplas presenças no mesmo dia (apenas se a coluna existir)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'teamcruz' 
          AND table_name = 'presencas' 
          AND column_name = 'pessoa_id'
        ) THEN
          ALTER TABLE teamcruz.presencas
          ADD CONSTRAINT IF NOT EXISTS UQ_presenca_pessoa_data
          UNIQUE (pessoa_id, data_presenca);
        END IF;
      END$$;
    `);

    // Criar função para atualizar updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION teamcruz.update_presenca_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Criar trigger para updated_at
    await queryRunner.query(`
      CREATE TRIGGER update_presenca_updated_at
      BEFORE UPDATE ON teamcruz.presencas
      FOR EACH ROW
      EXECUTE FUNCTION teamcruz.update_presenca_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover trigger e função
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_presenca_updated_at ON teamcruz.presencas`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS teamcruz.update_presenca_updated_at()`,
    );

    // Remover tabela
    await queryRunner.dropTable('teamcruz.presencas');

    // Remover enums
    await queryRunner.query(`DROP TYPE IF EXISTS presenca_metodo_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS presenca_status_enum`);
  }
}
