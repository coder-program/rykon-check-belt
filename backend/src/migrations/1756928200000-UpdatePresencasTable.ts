import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePresencasTable1756928200000 implements MigrationInterface {
  name = 'UpdatePresencasTable1756928200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remover tabela antiga se existir (para desenvolvimento)
    await queryRunner.query(`DROP TABLE IF EXISTS "teamcruz"."presencas" CASCADE`);

    // Criar nova tabela de presenças
    await queryRunner.query(`
      CREATE TABLE "teamcruz"."presencas" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "data_hora" TIMESTAMP NOT NULL DEFAULT now(),
        "origem_registro" character varying NOT NULL CHECK ("origem_registro" IN ('TABLET', 'QR_CODE', 'MANUAL')),
        "aluno_id" uuid NOT NULL,
        "unidade_id" uuid NOT NULL,
        "latitude" character varying(50),
        "longitude" character varying(50),
        "endereco_ip" character varying(100),
        "observacoes" text,
        CONSTRAINT "PK_presencas" PRIMARY KEY ("id")
      )
    `);

    // Adicionar índices para performance
    await queryRunner.query(`
      CREATE INDEX "IDX_presencas_aluno_id" ON "teamcruz"."presencas" ("aluno_id")
    `);
    
    await queryRunner.query(`
      CREATE INDEX "IDX_presencas_unidade_id" ON "teamcruz"."presencas" ("unidade_id")
    `);
    
    await queryRunner.query(`
      CREATE INDEX "IDX_presencas_data_hora" ON "teamcruz"."presencas" ("data_hora")
    `);

    // Adicionar constraint único para evitar dupla presença no mesmo dia
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_presencas_unique_daily" 
      ON "teamcruz"."presencas" ("aluno_id", "unidade_id", DATE("data_hora"))
    `);

    // Adicionar foreign keys
    await queryRunner.query(`
      ALTER TABLE "teamcruz"."presencas" 
      ADD CONSTRAINT "FK_presencas_aluno" 
      FOREIGN KEY ("aluno_id") REFERENCES "teamcruz"."alunos"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
    
    await queryRunner.query(`
      ALTER TABLE "teamcruz"."presencas" 
      ADD CONSTRAINT "FK_presencas_unidade" 
      FOREIGN KEY ("unidade_id") REFERENCES "teamcruz"."unidades"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "teamcruz"."presencas" CASCADE`);
  }
}
