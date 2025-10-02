import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfessorUnidades1735905000000 implements MigrationInterface {
  name = 'ProfessorUnidades1735905000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar tabela de relacionamento professor-unidades (N:N)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS teamcruz.professor_unidades (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        professor_id UUID NOT NULL REFERENCES teamcruz.pessoas(id) ON DELETE CASCADE,
        unidade_id UUID NOT NULL REFERENCES teamcruz.unidades(id) ON DELETE CASCADE,
        is_principal BOOLEAN DEFAULT FALSE,
        data_vinculo DATE DEFAULT CURRENT_DATE,
        data_desvinculo DATE,
        ativo BOOLEAN DEFAULT TRUE,
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(professor_id, unidade_id)
      )
    `);

    // Índices para otimização
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_professor_unidades_professor 
      ON teamcruz.professor_unidades(professor_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_professor_unidades_unidade 
      ON teamcruz.professor_unidades(unidade_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_professor_unidades_ativo 
      ON teamcruz.professor_unidades(ativo)
    `);

    // Trigger para updated_at
    await queryRunner.query(`
      CREATE TRIGGER update_professor_unidades_updated_at
      BEFORE UPDATE ON teamcruz.professor_unidades
      FOR EACH ROW
      EXECUTE FUNCTION teamcruz.update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_professor_unidades_updated_at ON teamcruz.professor_unidades`);
    await queryRunner.query(`DROP INDEX IF EXISTS teamcruz.idx_professor_unidades_ativo`);
    await queryRunner.query(`DROP INDEX IF EXISTS teamcruz.idx_professor_unidades_unidade`);
    await queryRunner.query(`DROP INDEX IF EXISTS teamcruz.idx_professor_unidades_professor`);
    await queryRunner.query(`DROP TABLE IF EXISTS teamcruz.professor_unidades`);
  }
}
