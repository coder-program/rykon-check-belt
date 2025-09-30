import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPresencaMetodoDetalhes1735585200000
  implements MigrationInterface
{
  name = 'AddPresencaMetodoDetalhes1735585200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "teamcruz"."presencas"
            ADD COLUMN IF NOT EXISTS "metodo" VARCHAR(50),
            ADD COLUMN IF NOT EXISTS "detalhes" JSONB
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "teamcruz"."presencas"
            DROP COLUMN IF EXISTS "metodo",
            DROP COLUMN IF EXISTS "detalhes"
        `);
  }
}
