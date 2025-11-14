import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCadastroCompletoUsuarios1757300000000
  implements MigrationInterface
{
  name = 'AddCadastroCompletoUsuarios1757300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar coluna cadastro_completo
    await queryRunner.query(`
      ALTER TABLE teamcruz.usuarios
      ADD COLUMN IF NOT EXISTS cadastro_completo BOOLEAN DEFAULT false
    `);

    // Adicionar comentário para documentação
    await queryRunner.query(`
      COMMENT ON COLUMN teamcruz.usuarios.cadastro_completo IS
      'Indica se o usuário completou o cadastro com todos os dados necessários (unidade, faixa, etc.)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE teamcruz.usuarios
      DROP COLUMN IF EXISTS cadastro_completo
    `);
  }
}
