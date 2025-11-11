import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResponsaveisTable1738451000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar tabela responsaveis
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS teamcruz.responsaveis (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        usuario_id UUID NOT NULL UNIQUE,
        nome_completo VARCHAR(255) NOT NULL,
        cpf VARCHAR(11) UNIQUE NOT NULL,
        rg VARCHAR(20),
        data_nascimento DATE,
        genero VARCHAR(20),

        -- Contato
        email VARCHAR(255) NOT NULL,
        telefone VARCHAR(20) NOT NULL,
        telefone_secundario VARCHAR(20),

        -- Endereço
        cep VARCHAR(10),
        logradouro VARCHAR(255),
        numero VARCHAR(10),
        complemento VARCHAR(100),
        bairro VARCHAR(100),
        cidade VARCHAR(100),
        estado VARCHAR(2),
        pais VARCHAR(50) DEFAULT 'Brasil',

        -- Profissional
        profissao VARCHAR(100),
        empresa VARCHAR(255),
        renda_familiar DECIMAL(10,2),

        -- Sistema
        ativo BOOLEAN DEFAULT true,
        observacoes TEXT,
        foto_url VARCHAR(500),

        -- Auditoria
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by UUID,
        updated_by UUID,

        -- Foreign Keys
        CONSTRAINT fk_responsavel_usuario FOREIGN KEY (usuario_id)
          REFERENCES teamcruz.usuarios(id) ON DELETE CASCADE,
        CONSTRAINT fk_responsavel_created_by FOREIGN KEY (created_by)
          REFERENCES teamcruz.usuarios(id) ON DELETE SET NULL,
        CONSTRAINT fk_responsavel_updated_by FOREIGN KEY (updated_by)
          REFERENCES teamcruz.usuarios(id) ON DELETE SET NULL
      );
    `);

    // Adicionar índices
    await queryRunner.query(`
      CREATE INDEX idx_responsaveis_usuario_id ON teamcruz.responsaveis(usuario_id);
      CREATE INDEX idx_responsaveis_cpf ON teamcruz.responsaveis(cpf);
      CREATE INDEX idx_responsaveis_email ON teamcruz.responsaveis(email);
      CREATE INDEX idx_responsaveis_ativo ON teamcruz.responsaveis(ativo);
    `);

    // Adicionar coluna responsavel_id na tabela alunos
    await queryRunner.query(`
      ALTER TABLE teamcruz.alunos
      ADD COLUMN responsavel_id UUID;
    `);

    await queryRunner.query(`
      ALTER TABLE teamcruz.alunos
      ADD CONSTRAINT fk_aluno_responsavel
      FOREIGN KEY (responsavel_id)
      REFERENCES teamcruz.responsaveis(id)
      ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_alunos_responsavel_id ON teamcruz.alunos(responsavel_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover FK e coluna responsavel_id de alunos
    await queryRunner.query(`
      ALTER TABLE teamcruz.alunos
      DROP CONSTRAINT IF EXISTS fk_aluno_responsavel;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS teamcruz.idx_alunos_responsavel_id;
    `);

    await queryRunner.query(`
      ALTER TABLE teamcruz.alunos
      DROP COLUMN IF EXISTS responsavel_id;
    `);

    // Remover índices de responsaveis
    await queryRunner.query(`
      DROP INDEX IF EXISTS teamcruz.idx_responsaveis_usuario_id;
      DROP INDEX IF EXISTS teamcruz.idx_responsaveis_cpf;
      DROP INDEX IF EXISTS teamcruz.idx_responsaveis_email;
      DROP INDEX IF EXISTS teamcruz.idx_responsaveis_ativo;
    `);

    // Remover tabela responsaveis
    await queryRunner.query(`
      DROP TABLE IF EXISTS teamcruz.responsaveis CASCADE;
    `);
  }
}
