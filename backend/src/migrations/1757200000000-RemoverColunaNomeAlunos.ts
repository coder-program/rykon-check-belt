import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoverColunaNomeAlunos1757200000000
  implements MigrationInterface
{
  name = 'RemoverColunaNomeAlunos1757200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se a coluna 'nome' existe
    const columnExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'teamcruz'
      AND table_name = 'alunos'
      AND column_name = 'nome'
    `);

    // Se a coluna existe, remover
    if (columnExists && columnExists.length > 0) {
      // Remover a constraint NOT NULL se existir
      await queryRunner
        .query(
          `
        ALTER TABLE teamcruz.alunos
        ALTER COLUMN nome DROP NOT NULL
      `,
        )
        .catch(() => {
          // Ignorar erro se a constraint não existir
        });

      // Remover a coluna
      await queryRunner.query(`
        ALTER TABLE teamcruz.alunos
        DROP COLUMN IF EXISTS nome
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recriar a coluna caso seja necessário reverter
    await queryRunner.query(`
      ALTER TABLE teamcruz.alunos
      ADD COLUMN IF NOT EXISTS nome VARCHAR(255)
    `);
  }
}
