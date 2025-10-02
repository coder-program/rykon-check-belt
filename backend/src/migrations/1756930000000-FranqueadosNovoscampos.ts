import { MigrationInterface, QueryRunner } from 'typeorm';

export class FranqueadosNovoscampos1756930000000
  implements MigrationInterface
{
  name = 'FranqueadosNovoscampos1756930000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar novos campos à tabela franqueados
    await queryRunner.query(`
      ALTER TABLE teamcruz.franqueados
      ADD COLUMN IF NOT EXISTS razao_social VARCHAR(200),
      ADD COLUMN IF NOT EXISTS nome_fantasia VARCHAR(150),
      ADD COLUMN IF NOT EXISTS inscricao_estadual VARCHAR(20),
      ADD COLUMN IF NOT EXISTS inscricao_municipal VARCHAR(20),
      ADD COLUMN IF NOT EXISTS telefone_fixo VARCHAR(20),
      ADD COLUMN IF NOT EXISTS telefone_celular VARCHAR(20),
      ADD COLUMN IF NOT EXISTS website VARCHAR(200),
      ADD COLUMN IF NOT EXISTS redes_sociais JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS responsavel_nome VARCHAR(150),
      ADD COLUMN IF NOT EXISTS responsavel_cpf VARCHAR(14),
      ADD COLUMN IF NOT EXISTS responsavel_cargo VARCHAR(100),
      ADD COLUMN IF NOT EXISTS responsavel_email VARCHAR(120),
      ADD COLUMN IF NOT EXISTS responsavel_telefone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS ano_fundacao INTEGER,
      ADD COLUMN IF NOT EXISTS missao TEXT,
      ADD COLUMN IF NOT EXISTS visao TEXT,
      ADD COLUMN IF NOT EXISTS valores TEXT,
      ADD COLUMN IF NOT EXISTS historico TEXT,
      ADD COLUMN IF NOT EXISTS logotipo_url VARCHAR(500),
      ADD COLUMN IF NOT EXISTS situacao VARCHAR(20) DEFAULT 'EM_HOMOLOGACAO',
      ADD COLUMN IF NOT EXISTS endereco_id UUID REFERENCES teamcruz.enderecos(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS id_matriz UUID REFERENCES teamcruz.franqueados(id) ON DELETE SET NULL
    `);

    // Atualizar email para ser nullable
    await queryRunner.query(`
      ALTER TABLE teamcruz.franqueados
      ALTER COLUMN email DROP NOT NULL
    `);

    // Adicionar constraint de unique no CPF do responsável (se houver)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ix_franqueados_responsavel_cpf_unique 
      ON teamcruz.franqueados (responsavel_cpf) 
      WHERE responsavel_cpf IS NOT NULL
    `);

    // Adicionar índices para melhor performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_franqueados_situacao 
      ON teamcruz.franqueados (situacao)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_franqueados_endereco 
      ON teamcruz.franqueados (endereco_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_franqueados_id_matriz 
      ON teamcruz.franqueados (id_matriz)
    `);

    // Adicionar constraint de check para situação
    await queryRunner.query(`
      ALTER TABLE teamcruz.franqueados
      ADD CONSTRAINT chk_franqueados_situacao 
      CHECK (situacao IN ('ATIVA', 'INATIVA', 'EM_HOMOLOGACAO'))
    `);

    // Comentários nas colunas
    await queryRunner.query(`
      COMMENT ON COLUMN teamcruz.franqueados.razao_social IS 'Razão social da franquia (obrigatório)';
      COMMENT ON COLUMN teamcruz.franqueados.nome_fantasia IS 'Nome fantasia da franquia (opcional)';
      COMMENT ON COLUMN teamcruz.franqueados.inscricao_estadual IS 'Inscrição estadual (opcional)';
      COMMENT ON COLUMN teamcruz.franqueados.inscricao_municipal IS 'Inscrição municipal (opcional)';
      COMMENT ON COLUMN teamcruz.franqueados.telefone_celular IS 'Telefone celular/WhatsApp institucional';
      COMMENT ON COLUMN teamcruz.franqueados.redes_sociais IS 'JSON com links das redes sociais (instagram, facebook, youtube, etc)';
      COMMENT ON COLUMN teamcruz.franqueados.responsavel_nome IS 'Nome completo do responsável legal';
      COMMENT ON COLUMN teamcruz.franqueados.responsavel_cpf IS 'CPF do responsável legal (único por franquia)';
      COMMENT ON COLUMN teamcruz.franqueados.responsavel_cargo IS 'Cargo/função do responsável (ex: Diretor, Mestre, Gestor)';
      COMMENT ON COLUMN teamcruz.franqueados.ano_fundacao IS 'Ano de fundação da franquia';
      COMMENT ON COLUMN teamcruz.franqueados.missao IS 'Missão da franquia';
      COMMENT ON COLUMN teamcruz.franqueados.visao IS 'Visão da franquia';
      COMMENT ON COLUMN teamcruz.franqueados.valores IS 'Valores da franquia';
      COMMENT ON COLUMN teamcruz.franqueados.historico IS 'Histórico/descrição da franquia';
      COMMENT ON COLUMN teamcruz.franqueados.logotipo_url IS 'URL do logotipo da franquia';
      COMMENT ON COLUMN teamcruz.franqueados.situacao IS 'Situação da franquia: ATIVA, INATIVA ou EM_HOMOLOGACAO';
      COMMENT ON COLUMN teamcruz.franqueados.endereco_id IS 'Referência ao endereço principal da franquia';
      COMMENT ON COLUMN teamcruz.franqueados.id_matriz IS 'ID da franquia matriz. Se NULL = é matriz, se preenchido = é filial';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover constraint
    await queryRunner.query(`
      ALTER TABLE teamcruz.franqueados
      DROP CONSTRAINT IF EXISTS chk_franqueados_situacao
    `);

    // Remover índices
    await queryRunner.query(
      `DROP INDEX IF EXISTS teamcruz.ix_franqueados_responsavel_cpf_unique`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS teamcruz.ix_franqueados_situacao`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS teamcruz.ix_franqueados_endereco`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS teamcruz.ix_franqueados_id_matriz`,
    );

    // Remover colunas
    await queryRunner.query(`
      ALTER TABLE teamcruz.franqueados
      DROP COLUMN IF EXISTS razao_social,
      DROP COLUMN IF EXISTS nome_fantasia,
      DROP COLUMN IF EXISTS inscricao_estadual,
      DROP COLUMN IF EXISTS inscricao_municipal,
      DROP COLUMN IF EXISTS telefone_fixo,
      DROP COLUMN IF EXISTS telefone_celular,
      DROP COLUMN IF EXISTS website,
      DROP COLUMN IF EXISTS redes_sociais,
      DROP COLUMN IF EXISTS responsavel_nome,
      DROP COLUMN IF EXISTS responsavel_cpf,
      DROP COLUMN IF EXISTS responsavel_cargo,
      DROP COLUMN IF EXISTS responsavel_email,
      DROP COLUMN IF EXISTS responsavel_telefone,
      DROP COLUMN IF EXISTS ano_fundacao,
      DROP COLUMN IF EXISTS missao,
      DROP COLUMN IF EXISTS visao,
      DROP COLUMN IF EXISTS valores,
      DROP COLUMN IF EXISTS historico,
      DROP COLUMN IF EXISTS logotipo_url,
      DROP COLUMN IF EXISTS situacao,
      DROP COLUMN IF EXISTS endereco_id,
      DROP COLUMN IF EXISTS id_matriz
    `);

    // Restaurar email como NOT NULL
    await queryRunner.query(`
      ALTER TABLE teamcruz.franqueados
      ALTER COLUMN email SET NOT NULL
    `);
  }
}
