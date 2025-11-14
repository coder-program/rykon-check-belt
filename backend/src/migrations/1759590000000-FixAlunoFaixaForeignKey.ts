import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixAlunoFaixaForeignKey1759590000000
  implements MigrationInterface
{
  name = 'FixAlunoFaixaForeignKey1759590000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Primeiro, remover a constraint incorreta
    await queryRunner.query(`
      ALTER TABLE "teamcruz"."aluno_faixa"
      DROP CONSTRAINT IF EXISTS "FK_aluno_faixa_aluno"
    `);

    // 2. Criar a constraint correta apontando para a tabela alunos
    await queryRunner.query(`
      ALTER TABLE "teamcruz"."aluno_faixa"
      ADD CONSTRAINT "FK_aluno_faixa_aluno"
      FOREIGN KEY ("aluno_id")
      REFERENCES "teamcruz"."alunos"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover a constraint correta
    await queryRunner.query(`
      ALTER TABLE "teamcruz"."aluno_faixa"
      DROP CONSTRAINT IF EXISTS "FK_aluno_faixa_aluno"
    `);

    // Recriar a constraint incorreta (para reverter)
    await queryRunner.query(`
      ALTER TABLE "teamcruz"."aluno_faixa"
      ADD CONSTRAINT "FK_aluno_faixa_aluno"
      FOREIGN KEY ("aluno_id")
      REFERENCES "teamcruz"."pessoas"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);
  }
}
