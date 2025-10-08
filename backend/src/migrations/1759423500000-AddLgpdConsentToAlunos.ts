import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLgpdConsentToAlunos1759423500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar campos LGPD na tabela alunos
    await queryRunner.query(`
      ALTER TABLE teamcruz.alunos
      ADD COLUMN IF NOT EXISTS plano_saude VARCHAR(100),
      ADD COLUMN IF NOT EXISTS atestado_medico_validade DATE,
      ADD COLUMN IF NOT EXISTS restricoes_medicas TEXT,
      ADD COLUMN IF NOT EXISTS consent_lgpd BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS consent_lgpd_date TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS consent_imagem BOOLEAN DEFAULT false;
    `);

    console.log('✅ Campos LGPD adicionados à tabela alunos');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover campos LGPD
    await queryRunner.query(`
      ALTER TABLE teamcruz.alunos
      DROP COLUMN IF EXISTS consent_imagem,
      DROP COLUMN IF EXISTS consent_lgpd_date,
      DROP COLUMN IF EXISTS consent_lgpd,
      DROP COLUMN IF EXISTS restricoes_medicas,
      DROP COLUMN IF EXISTS atestado_medico_validade,
      DROP COLUMN IF EXISTS plano_saude;
    `);
  }
}
