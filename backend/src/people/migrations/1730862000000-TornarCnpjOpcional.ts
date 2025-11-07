import { MigrationInterface, QueryRunner } from 'typeorm';

export class TornarCnpjOpcional1730862000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remover unique constraint do CNPJ
    await queryRunner.query(
      `ALTER TABLE teamcruz.unidades DROP CONSTRAINT IF EXISTS "UQ_unidades_cnpj"`,
    );
    await queryRunner.query(
      `ALTER TABLE teamcruz.unidades DROP CONSTRAINT IF EXISTS "unidades_cnpj_key"`,
    );

    // Tornar coluna CNPJ nullable
    await queryRunner.query(
      `ALTER TABLE teamcruz.unidades ALTER COLUMN cnpj DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Tornar coluna CNPJ NOT NULL novamente
    await queryRunner.query(
      `ALTER TABLE teamcruz.unidades ALTER COLUMN cnpj SET NOT NULL`,
    );

    // Adicionar unique constraint de volta
    await queryRunner.query(
      `ALTER TABLE teamcruz.unidades ADD CONSTRAINT "unidades_cnpj_key" UNIQUE (cnpj)`,
    );
  }
}
