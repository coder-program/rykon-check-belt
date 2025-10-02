import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateAlunosTable1738466409000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar enum de gênero se não existir
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE teamcruz.genero_enum AS ENUM ('MASCULINO', 'FEMININO', 'OUTRO');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Criar enum de status se não existir
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE teamcruz.status_aluno_enum AS ENUM ('ATIVO', 'INATIVO', 'SUSPENSO', 'CANCELADO');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 3. Criar enum de faixa se não existir
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE teamcruz.faixa_enum AS ENUM (
          'BRANCA', 'CINZA_BRANCA', 'CINZA', 'CINZA_PRETA',
          'AMARELA_BRANCA', 'AMARELA', 'AMARELA_PRETA',
          'LARANJA_BRANCA', 'LARANJA', 'LARANJA_PRETA',
          'VERDE_BRANCA', 'VERDE', 'VERDE_PRETA',
          'AZUL', 'ROXA', 'MARROM', 'PRETA', 'CORAL', 'VERMELHA'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 4. Adicionar novas colunas
    await queryRunner.query(`
      ALTER TABLE teamcruz.alunos 
      ADD COLUMN IF NOT EXISTS nome_completo varchar(255),
      ADD COLUMN IF NOT EXISTS genero teamcruz.genero_enum,
      ADD COLUMN IF NOT EXISTS nome_contato_emergencia varchar(255),
      ADD COLUMN IF NOT EXISTS endereco_id uuid,
      ADD COLUMN IF NOT EXISTS status teamcruz.status_aluno_enum DEFAULT 'ATIVO',
      ADD COLUMN IF NOT EXISTS faixa_atual teamcruz.faixa_enum DEFAULT 'BRANCA',
      ADD COLUMN IF NOT EXISTS graus int4 DEFAULT 0,
      ADD COLUMN IF NOT EXISTS observacoes_medicas text,
      ADD COLUMN IF NOT EXISTS alergias text,
      ADD COLUMN IF NOT EXISTS medicamentos_uso_continuo text,
      ADD COLUMN IF NOT EXISTS dia_vencimento int4,
      ADD COLUMN IF NOT EXISTS valor_mensalidade decimal(10,2),
      ADD COLUMN IF NOT EXISTS desconto_percentual decimal(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS deleted_at timestamptz
    `);

    // 5. Migrar dados existentes
    await queryRunner.query(`
      UPDATE teamcruz.alunos 
      SET 
        nome_completo = nome,
        genero = CASE 
          WHEN LOWER(nome) LIKE '%a' OR LOWER(nome) LIKE '%ana%' OR LOWER(nome) LIKE '%maria%' THEN 'FEMININO'::teamcruz.genero_enum
          ELSE 'MASCULINO'::teamcruz.genero_enum
        END,
        status = CASE 
          WHEN status_type = 'ATIVO' THEN 'ATIVO'::teamcruz.status_aluno_enum
          WHEN status_type = 'INATIVO' THEN 'INATIVO'::teamcruz.status_aluno_enum
          WHEN status_type = 'SUSPENSO' THEN 'SUSPENSO'::teamcruz.status_aluno_enum
          ELSE 'ATIVO'::teamcruz.status_aluno_enum
        END,
        graus = COALESCE(graus_atual, 0),
        observacoes_medicas = restricoes_medicas,
        alergias = NULL
      WHERE nome_completo IS NULL
    `);

    // 6. Adicionar mapeamento de faixas (da tabela faixas para enum)
    await queryRunner.query(`
      UPDATE teamcruz.alunos a
      SET faixa_atual = CASE f.codigo
        WHEN 'BRANCA' THEN 'BRANCA'::teamcruz.faixa_enum
        WHEN 'CINZA_BRANCA' THEN 'CINZA_BRANCA'::teamcruz.faixa_enum
        WHEN 'CINZA' THEN 'CINZA'::teamcruz.faixa_enum
        WHEN 'CINZA_PRETA' THEN 'CINZA_PRETA'::teamcruz.faixa_enum
        WHEN 'AMARELA_BRANCA' THEN 'AMARELA_BRANCA'::teamcruz.faixa_enum
        WHEN 'AMARELA' THEN 'AMARELA'::teamcruz.faixa_enum
        WHEN 'AMARELA_PRETA' THEN 'AMARELA_PRETA'::teamcruz.faixa_enum
        WHEN 'LARANJA_BRANCA' THEN 'LARANJA_BRANCA'::teamcruz.faixa_enum
        WHEN 'LARANJA' THEN 'LARANJA'::teamcruz.faixa_enum
        WHEN 'LARANJA_PRETA' THEN 'LARANJA_PRETA'::teamcruz.faixa_enum
        WHEN 'VERDE_BRANCA' THEN 'VERDE_BRANCA'::teamcruz.faixa_enum
        WHEN 'VERDE' THEN 'VERDE'::teamcruz.faixa_enum
        WHEN 'VERDE_PRETA' THEN 'VERDE_PRETA'::teamcruz.faixa_enum
        WHEN 'AZUL' THEN 'AZUL'::teamcruz.faixa_enum
        WHEN 'ROXA' THEN 'ROXA'::teamcruz.faixa_enum
        WHEN 'MARROM' THEN 'MARROM'::teamcruz.faixa_enum
        WHEN 'PRETA' THEN 'PRETA'::teamcruz.faixa_enum
        WHEN 'CORAL' THEN 'CORAL'::teamcruz.faixa_enum
        WHEN 'VERMELHA' THEN 'VERMELHA'::teamcruz.faixa_enum
        ELSE 'BRANCA'::teamcruz.faixa_enum
      END
      FROM teamcruz.faixas f
      WHERE a.faixa_atual_id = f.id
    `);

    // 7. Tornar nome_completo NOT NULL
    await queryRunner.query(`
      ALTER TABLE teamcruz.alunos 
      ALTER COLUMN nome_completo SET NOT NULL
    `);

    // 8. Adicionar índices nas novas colunas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_alunos_nome_completo ON teamcruz.alunos(nome_completo);
      CREATE INDEX IF NOT EXISTS idx_alunos_cpf ON teamcruz.alunos(cpf);
      CREATE INDEX IF NOT EXISTS idx_alunos_status_new ON teamcruz.alunos(status);
      CREATE INDEX IF NOT EXISTS idx_alunos_faixa_atual ON teamcruz.alunos(faixa_atual);
    `);

    // 9. Remover constraint antiga de faixa_atual_id
    await queryRunner.query(`
      ALTER TABLE teamcruz.alunos DROP CONSTRAINT IF EXISTS alunos_faixa_atual_id_fkey;
    `);

    // 10. Tornar faixa_atual_id nullable (manter por enquanto para histórico)
    await queryRunner.query(`
      ALTER TABLE teamcruz.alunos ALTER COLUMN faixa_atual_id DROP NOT NULL;
    `);

    // 11. Adicionar unique constraint para CPF se não existir
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE teamcruz.alunos ADD CONSTRAINT alunos_cpf_unique UNIQUE (cpf);
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverter mudanças
    await queryRunner.query(`
      DROP INDEX IF EXISTS teamcruz.idx_alunos_nome_completo;
      DROP INDEX IF EXISTS teamcruz.idx_alunos_cpf;
      DROP INDEX IF EXISTS teamcruz.idx_alunos_status_new;
      DROP INDEX IF EXISTS teamcruz.idx_alunos_faixa_atual;
    `);

    await queryRunner.query(`
      ALTER TABLE teamcruz.alunos 
      DROP COLUMN IF EXISTS nome_completo,
      DROP COLUMN IF EXISTS genero,
      DROP COLUMN IF EXISTS nome_contato_emergencia,
      DROP COLUMN IF EXISTS endereco_id,
      DROP COLUMN IF EXISTS status,
      DROP COLUMN IF EXISTS faixa_atual,
      DROP COLUMN IF EXISTS graus,
      DROP COLUMN IF EXISTS observacoes_medicas,
      DROP COLUMN IF EXISTS alergias,
      DROP COLUMN IF EXISTS medicamentos_uso_continuo,
      DROP COLUMN IF EXISTS dia_vencimento,
      DROP COLUMN IF EXISTS valor_mensalidade,
      DROP COLUMN IF EXISTS desconto_percentual,
      DROP COLUMN IF EXISTS deleted_at
    `);

    await queryRunner.query(`
      ALTER TABLE teamcruz.alunos 
      ADD CONSTRAINT alunos_faixa_atual_id_fkey FOREIGN KEY (faixa_atual_id) REFERENCES teamcruz.faixas(id);
    `);

    await queryRunner.query(`
      ALTER TABLE teamcruz.alunos ALTER COLUMN faixa_atual_id SET NOT NULL;
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS teamcruz.faixa_enum;
      DROP TYPE IF EXISTS teamcruz.status_aluno_enum;
      DROP TYPE IF EXISTS teamcruz.genero_enum;
    `);
  }
}
