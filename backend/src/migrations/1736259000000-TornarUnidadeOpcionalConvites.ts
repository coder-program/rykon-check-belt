import { MigrationInterface, QueryRunner } from 'typeorm';

export class TornarUnidadeOpcionalConvites1736259000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tornar a coluna unidade_id opcional na tabela convites_cadastro
    await queryRunner.query(
      `ALTER TABLE teamcruz.convites_cadastro 
       ALTER COLUMN unidade_id DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverter: tornar a coluna obrigatória novamente
    await queryRunner.query(
      `ALTER TABLE teamcruz.convites_cadastro 
       ALTER COLUMN unidade_id SET NOT NULL`,
    );
  }
}
