import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreatePersonTable1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'pessoas',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tipo_cadastro',
            type: 'enum',
            enum: ['ALUNO', 'PROFESSOR'],
          },
          {
            name: 'nome_completo',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'cpf',
            type: 'varchar',
            length: '14',
            isUnique: true,
          },
          {
            name: 'data_nascimento',
            type: 'date',
          },
          {
            name: 'genero',
            type: 'enum',
            enum: ['MASCULINO', 'FEMININO', 'OUTRO'],
            isNullable: true,
          },
          {
            name: 'telefone_whatsapp',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          // Endereço
          {
            name: 'cep',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'logradouro',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'numero',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'complemento',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'bairro',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'cidade',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'uf',
            type: 'varchar',
            length: '2',
            isNullable: true,
          },
          {
            name: 'unidade_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['ATIVO', 'INATIVO', 'EM_AVALIACAO'],
            default: "'ATIVO'",
          },
          // Campos de ALUNO
          {
            name: 'data_matricula',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'faixa_atual',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'grau_atual',
            type: 'int',
            default: 0,
            isNullable: true,
          },
          // Responsável
          {
            name: 'responsavel_nome',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'responsavel_cpf',
            type: 'varchar',
            length: '14',
            isNullable: true,
          },
          {
            name: 'responsavel_telefone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          // Campos de PROFESSOR
          {
            name: 'faixa_ministrante',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'data_inicio_docencia',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'registro_profissional',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          // Campos de controle
          {
            name: 'observacoes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Criar índices
    await queryRunner.createIndex(
      'pessoas',
      new Index({
        name: 'IDX_PESSOA_CPF',
        columnNames: ['cpf'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'pessoas',
      new Index({
        name: 'IDX_PESSOA_TIPO_CADASTRO',
        columnNames: ['tipo_cadastro'],
      }),
    );

    await queryRunner.createIndex(
      'pessoas',
      new Index({
        name: 'IDX_PESSOA_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'pessoas',
      new Index({
        name: 'IDX_PESSOA_UNIDADE',
        columnNames: ['unidade_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('pessoas');
  }
}
