import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFaceEmbeddingsTable1700000000000 implements MigrationInterface {
    name = 'CreateFaceEmbeddingsTable1700000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "face_embeddings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "alunoId" uuid,
                "professorId" uuid,
                "imageBase64" text NOT NULL,
                "faceDescriptor" jsonb NOT NULL,
                "confidence" numeric(10,8) NOT NULL,
                "imageUrl" character varying NOT NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_face_embeddings_id" PRIMARY KEY ("id")
            )
        `);

        // Adicionar constraints de FK se as tabelas existirem
        await queryRunner.query(`
            ALTER TABLE "face_embeddings" 
            ADD CONSTRAINT "FK_face_embeddings_alunoId" 
            FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "face_embeddings" 
            ADD CONSTRAINT "FK_face_embeddings_professorId" 
            FOREIGN KEY ("professorId") REFERENCES "professores"("id") ON DELETE CASCADE
        `);

        // Índices para performance
        await queryRunner.query(`CREATE INDEX "IDX_face_embeddings_alunoId" ON "face_embeddings" ("alunoId")`);
        await queryRunner.query(`CREATE INDEX "IDX_face_embeddings_professorId" ON "face_embeddings" ("professorId")`);
        await queryRunner.query(`CREATE INDEX "IDX_face_embeddings_isActive" ON "face_embeddings" ("isActive")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_face_embeddings_isActive"`);
        await queryRunner.query(`DROP INDEX "IDX_face_embeddings_professorId"`);
        await queryRunner.query(`DROP INDEX "IDX_face_embeddings_alunoId"`);
        await queryRunner.query(`ALTER TABLE "face_embeddings" DROP CONSTRAINT "FK_face_embeddings_professorId"`);
        await queryRunner.query(`ALTER TABLE "face_embeddings" DROP CONSTRAINT "FK_face_embeddings_alunoId"`);
        await queryRunner.query(`DROP TABLE "face_embeddings"`);
    }
}