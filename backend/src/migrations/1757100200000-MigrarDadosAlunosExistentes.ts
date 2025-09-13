import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrarDadosAlunosExistentes1757100200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Migrar dados existentes de alunos para a nova estrutura
    await queryRunner.query(`
      -- Inserir registros na tabela aluno_faixa para alunos existentes
      INSERT INTO teamcruz.aluno_faixa (aluno_id, faixa_def_id, ativa, dt_inicio, graus_atual, presencas_no_ciclo, presencas_total_fx)
      SELECT 
        p.id AS aluno_id,
        fd.id AS faixa_def_id,
        TRUE AS ativa,
        COALESCE(p.data_matricula, CURRENT_DATE) AS dt_inicio,
        COALESCE(p.grau_atual, 0) AS graus_atual,
        0 AS presencas_no_ciclo,
        0 AS presencas_total_fx
      FROM teamcruz.pessoas p
      INNER JOIN teamcruz.faixa_def fd ON fd.codigo = p.faixa_atual
      WHERE p.tipo_cadastro = 'ALUNO'
        AND p.faixa_atual IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM teamcruz.aluno_faixa af 
          WHERE af.aluno_id = p.id AND af.ativa = TRUE
        )
    `);

    // Calcular presenças totais para cada aluno e atualizar
    // Por enquanto, não temos presenças para contar pois a coluna pessoa_id não existe
    // await queryRunner.query(`
    //   UPDATE teamcruz.aluno_faixa af
    //   SET presencas_total_fx = (
    //     SELECT COUNT(*)
    //     FROM teamcruz.presencas pr
    //     WHERE pr.pessoa_id = af.aluno_id
    //       AND pr.data >= af.dt_inicio
    //   )
    //   WHERE af.ativa = TRUE
    // `);

    // Calcular presenças no ciclo atual (desde o último grau)
    // Para isso, vamos estimar baseado no grau atual
    await queryRunner.query(`
      UPDATE teamcruz.aluno_faixa af
      SET presencas_no_ciclo = 
        CASE 
          WHEN af.graus_atual = 0 THEN af.presencas_total_fx
          ELSE LEAST(
            af.presencas_total_fx - (af.graus_atual * fd.aulas_por_grau),
            fd.aulas_por_grau - 1
          )
        END
      FROM teamcruz.faixa_def fd
      WHERE af.faixa_def_id = fd.id
        AND af.ativa = TRUE
    `);

    // Criar histórico de graus para alunos que já possuem graus
    await queryRunner.query(`
      INSERT INTO teamcruz.aluno_faixa_grau (aluno_faixa_id, grau_num, dt_concessao, observacao, origem)
      SELECT 
        af.id AS aluno_faixa_id,
        generate_series(1, af.graus_atual) AS grau_num,
        af.dt_inicio + INTERVAL '30 days' * generate_series(1, af.graus_atual) AS dt_concessao,
        'Grau migrado do sistema anterior' AS observacao,
        'IMPORTACAO' AS origem
      FROM teamcruz.aluno_faixa af
      WHERE af.ativa = TRUE
        AND af.graus_atual > 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover dados migrados
    await queryRunner.query(`
      DELETE FROM teamcruz.aluno_faixa_grau 
      WHERE origem = 'IMPORTACAO'
    `);

    await queryRunner.query(`
      DELETE FROM teamcruz.aluno_faixa 
      WHERE ativa = TRUE
    `);
  }
}
