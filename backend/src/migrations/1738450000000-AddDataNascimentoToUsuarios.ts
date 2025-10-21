import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDataNascimentoToUsuarios1738450000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE teamcruz.usuarios
      ADD COLUMN data_nascimento DATE;
    `);

    console.log('✅ Coluna data_nascimento adicionada à tabela usuarios');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE teamcruz.usuarios
      DROP COLUMN data_nascimento;
    `);

    console.log('✅ Coluna data_nascimento removida da tabela usuarios');
  }
}
