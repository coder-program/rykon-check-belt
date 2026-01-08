import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConfiguracoesOperacionaisUnidades1736259100000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar campos de configurações operacionais na tabela unidades
    await queryRunner.query(`
      ALTER TABLE teamcruz.unidades 
      ADD COLUMN capacidade_max_alunos INTEGER DEFAULT NULL,
      ADD COLUMN valor_plano_padrao DECIMAL(10,2) DEFAULT NULL,
      ADD COLUMN qtde_instrutores INTEGER DEFAULT NULL
    `);

    // Adicionar comentários nas colunas
    await queryRunner.query(`
      COMMENT ON COLUMN teamcruz.unidades.capacidade_max_alunos IS 'Capacidade máxima de alunos na unidade';
      COMMENT ON COLUMN teamcruz.unidades.valor_plano_padrao IS 'Valor da mensalidade padrão (plano padrão) da unidade';
      COMMENT ON COLUMN teamcruz.unidades.qtde_instrutores IS 'Quantidade de instrutores/professores da unidade';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover os campos adicionados
    await queryRunner.query(`
      ALTER TABLE teamcruz.unidades 
      DROP COLUMN IF EXISTS capacidade_max_alunos,
      DROP COLUMN IF EXISTS valor_plano_padrao,
      DROP COLUMN IF EXISTS qtde_instrutores
    `);
  }
}
