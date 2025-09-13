import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateGraduacaoTables1757100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar tabela de definição de faixas (catálogo)
    await queryRunner.createTable(
      new Table({
        name: 'faixa_def',
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
            name: 'codigo',
            type: 'varchar',
            length: '20',
            isUnique: true,
          },
          {
            name: 'nome_exibicao',
            type: 'varchar',
            length: '40',
          },
          {
            name: 'cor_hex',
            type: 'varchar',
            length: '7',
          },
          {
            name: 'ordem',
            type: 'int',
          },
          {
            name: 'graus_max',
            type: 'int',
            default: 4,
          },
          {
            name: 'aulas_por_grau',
            type: 'int',
            default: 40,
          },
          {
            name: 'categoria',
            type: 'varchar',
            length: '20',
            default: "'ADULTO'",
          },
          {
            name: 'ativo',
            type: 'boolean',
            default: true,
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
      }),
      true,
    );

    // 2. Criar tabela de faixas do aluno (histórico)
    await queryRunner.createTable(
      new Table({
        name: 'aluno_faixa',
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
            name: 'aluno_id',
            type: 'uuid',
          },
          {
            name: 'faixa_def_id',
            type: 'uuid',
          },
          {
            name: 'ativa',
            type: 'boolean',
            default: true,
          },
          {
            name: 'dt_inicio',
            type: 'date',
          },
          {
            name: 'dt_fim',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'graus_atual',
            type: 'int',
            default: 0,
          },
          {
            name: 'presencas_no_ciclo',
            type: 'int',
            default: 0,
          },
          {
            name: 'presencas_total_fx',
            type: 'int',
            default: 0,
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
            name: 'FK_aluno_faixa_aluno',
            columnNames: ['aluno_id'],
            referencedSchema: 'teamcruz',
            referencedTableName: 'pessoas',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_aluno_faixa_faixa_def',
            columnNames: ['faixa_def_id'],
            referencedSchema: 'teamcruz',
            referencedTableName: 'faixa_def',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
        ],
      }),
      true,
    );

    // Criar índice para aluno_faixa
    await queryRunner.query(`
      CREATE INDEX "IX_aluno_faixa_aluno_ativa" 
      ON teamcruz.aluno_faixa (aluno_id, ativa)
    `);

    // 3. Criar tabela de histórico de graus
    await queryRunner.createTable(
      new Table({
        name: 'aluno_faixa_grau',
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
            name: 'aluno_faixa_id',
            type: 'uuid',
          },
          {
            name: 'grau_num',
            type: 'int',
          },
          {
            name: 'dt_concessao',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'concedido_por',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'observacao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'origem',
            type: 'varchar',
            length: '20',
            default: "'MANUAL'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            name: 'FK_aluno_faixa_grau_aluno_faixa',
            columnNames: ['aluno_faixa_id'],
            referencedSchema: 'teamcruz',
            referencedTableName: 'aluno_faixa',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_aluno_faixa_grau_concedido_por',
            columnNames: ['concedido_por'],
            referencedSchema: 'teamcruz',
            referencedTableName: 'usuarios',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );

    // 4. Criar tabela de graduações (mudança de faixa)
    await queryRunner.createTable(
      new Table({
        name: 'aluno_graduacao',
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
            name: 'aluno_id',
            type: 'uuid',
          },
          {
            name: 'faixa_origem_id',
            type: 'uuid',
          },
          {
            name: 'faixa_destino_id',
            type: 'uuid',
          },
          {
            name: 'dt_graduacao',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'concedido_por',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'observacao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            name: 'FK_aluno_graduacao_aluno',
            columnNames: ['aluno_id'],
            referencedSchema: 'teamcruz',
            referencedTableName: 'pessoas',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_aluno_graduacao_faixa_origem',
            columnNames: ['faixa_origem_id'],
            referencedSchema: 'teamcruz',
            referencedTableName: 'faixa_def',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
          {
            name: 'FK_aluno_graduacao_faixa_destino',
            columnNames: ['faixa_destino_id'],
            referencedSchema: 'teamcruz',
            referencedTableName: 'faixa_def',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
          {
            name: 'FK_aluno_graduacao_concedido_por',
            columnNames: ['concedido_por'],
            referencedSchema: 'teamcruz',
            referencedTableName: 'usuarios',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );

    // 5. Adicionar campos faltantes na tabela de presenças
    await queryRunner.query(`
      ALTER TABLE teamcruz.presencas 
      ADD COLUMN IF NOT EXISTS origem VARCHAR(20) DEFAULT 'MANUAL',
      ADD COLUMN IF NOT EXISTS valido BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS observacao TEXT,
      ADD COLUMN IF NOT EXISTS unidade_id UUID,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    // 6. Criar índice para presenças (comentado por enquanto devido ao nome da coluna)
    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS "IX_presenca_pessoa_data"
    //   ON teamcruz.presencas (pessoa_id, data)
    // `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    // await queryRunner.query(`DROP INDEX IF EXISTS teamcruz."IX_presenca_pessoa_data"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS teamcruz."IX_aluno_faixa_aluno_ativa"`,
    );

    // Remover tabelas na ordem reversa
    await queryRunner.dropTable('teamcruz.aluno_graduacao');
    await queryRunner.dropTable('teamcruz.aluno_faixa_grau');
    await queryRunner.dropTable('teamcruz.aluno_faixa');
    await queryRunner.dropTable('teamcruz.faixa_def');

    // Remover campos adicionados em presenças
    await queryRunner.query(`
      ALTER TABLE teamcruz.presencas 
      DROP COLUMN IF EXISTS origem,
      DROP COLUMN IF EXISTS valido,
      DROP COLUMN IF EXISTS observacao,
      DROP COLUMN IF EXISTS unidade_id,
      DROP COLUMN IF EXISTS created_at,
      DROP COLUMN IF EXISTS updated_at
    `);
  }
}
