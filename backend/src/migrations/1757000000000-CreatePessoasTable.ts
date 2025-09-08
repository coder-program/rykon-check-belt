import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePessoasTable1757000000000 implements MigrationInterface {
  name = 'CreatePessoasTable1757000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enums se não existirem
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pessoas_tipo_cadastro_enum') THEN
          CREATE TYPE pessoas_tipo_cadastro_enum AS ENUM ('ALUNO', 'PROFESSOR');
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pessoas_status_enum') THEN
          CREATE TYPE pessoas_status_enum AS ENUM ('ATIVO', 'INATIVO', 'EM_AVALIACAO');
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pessoas_genero_enum') THEN
          CREATE TYPE pessoas_genero_enum AS ENUM ('MASCULINO', 'FEMININO', 'OUTRO');
        END IF;
      END$$;
    `);

    // Criar tabela pessoas no schema public
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pessoas (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        
        -- Tipo de cadastro
        tipo_cadastro pessoas_tipo_cadastro_enum NOT NULL,
        
        -- Dados pessoais comuns
        nome_completo VARCHAR(255) NOT NULL,
        cpf VARCHAR(14) UNIQUE NOT NULL,
        data_nascimento DATE NOT NULL,
        genero pessoas_genero_enum,
        telefone_whatsapp VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        
        -- Endereço
        cep VARCHAR(10),
        logradouro VARCHAR(255),
        numero VARCHAR(20),
        complemento VARCHAR(100),
        bairro VARCHAR(100),
        cidade VARCHAR(100),
        uf VARCHAR(2),
        
        -- Relação com unidade
        unidade_id UUID,
        
        -- Status
        status pessoas_status_enum NOT NULL DEFAULT 'ATIVO',
        
        -- ===== CAMPOS ESPECÍFICOS DE ALUNO =====
        data_matricula DATE,
        faixa_atual VARCHAR(20),
        grau_atual INTEGER DEFAULT 0,
        
        -- Responsável (para menores de 18 anos)
        responsavel_nome VARCHAR(255),
        responsavel_cpf VARCHAR(14),
        responsavel_telefone VARCHAR(20),
        
        -- ===== CAMPOS ESPECÍFICOS DE PROFESSOR =====
        faixa_ministrante VARCHAR(20),
        data_inicio_docencia DATE,
        registro_profissional VARCHAR(100),
        
        -- ===== CAMPOS DE CONTROLE =====
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID,
        updated_by UUID
      )
    `);

    // Criar índices
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pessoas_cpf ON pessoas(cpf)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pessoas_tipo_cadastro ON pessoas(tipo_cadastro)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pessoas_status ON pessoas(status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pessoas_unidade_id ON pessoas(unidade_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pessoas_nome ON pessoas(nome_completo)`);

    // Trigger para atualizar updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_pessoas_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger
          WHERE tgname = 'update_pessoas_updated_at_trigger'
        ) THEN
          CREATE TRIGGER update_pessoas_updated_at_trigger
          BEFORE UPDATE ON pessoas
          FOR EACH ROW
          EXECUTE FUNCTION update_pessoas_updated_at();
        END IF;
      END$$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover trigger
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_pessoas_updated_at_trigger ON pessoas`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_pessoas_updated_at()`);
    
    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pessoas_nome`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pessoas_unidade_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pessoas_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pessoas_tipo_cadastro`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pessoas_cpf`);
    
    // Remover tabela
    await queryRunner.query(`DROP TABLE IF EXISTS pessoas`);
    
    // Remover enums
    await queryRunner.query(`DROP TYPE IF EXISTS pessoas_genero_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS pessoas_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS pessoas_tipo_cadastro_enum`);
  }
}
