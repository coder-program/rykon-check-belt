import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeAprovadoPorToVarchar1732206000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Alterar aprovado_por de UUID para VARCHAR
    await queryRunner.query(`
      ALTER TABLE teamcruz.aluno_graduacao
      ALTER COLUMN aprovado_por TYPE VARCHAR(255);
    `);

    // Alterar concedido_por de UUID para VARCHAR também (para consistência)
    await queryRunner.query(`
      ALTER TABLE teamcruz.aluno_graduacao
      ALTER COLUMN concedido_por TYPE VARCHAR(255);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverter para UUID (cuidado: só funciona se não houver valores não-UUID)
    await queryRunner.query(`
      ALTER TABLE teamcruz.aluno_graduacao
      ALTER COLUMN aprovado_por TYPE UUID USING aprovado_por::UUID;
    `);

    await queryRunner.query(`
      ALTER TABLE teamcruz.aluno_graduacao
      ALTER COLUMN concedido_por TYPE UUID USING concedido_por::UUID;
    `);
  }
}
