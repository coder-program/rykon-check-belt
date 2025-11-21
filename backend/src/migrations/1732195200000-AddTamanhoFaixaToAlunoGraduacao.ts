import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTamanhoFaixaToAlunoGraduacao1732195200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE teamcruz.aluno_graduacao
      ADD COLUMN tamanho_faixa VARCHAR(10);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE teamcruz.aluno_graduacao
      DROP COLUMN tamanho_faixa;
    `);
  }
}
