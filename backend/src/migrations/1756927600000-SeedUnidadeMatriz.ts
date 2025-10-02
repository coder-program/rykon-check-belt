import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedUnidadeMatriz1756927600000 implements MigrationInterface {
  name = 'SeedUnidadeMatriz1756927600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar franqueado matriz se não existir
    await queryRunner.query(`
      INSERT INTO teamcruz.franqueados (id, nome, email, telefone, cnpj, data_contrato, taxa_franquia, ativo)
      VALUES (
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'TeamCruz Franchising Ltda',
        'contato@teamcruz.com.br',
        '(11) 4444-5555',
        '12.345.678/0001-90',
        '2020-01-01',
        0.00,
        true
      )
      ON CONFLICT DO NOTHING
    `);

    // Criar unidade matriz (sem endereço por enquanto - será adicionado depois das migrações de endereços)
    await queryRunner.query(`
      INSERT INTO teamcruz.unidades (
        id, franqueado_id, nome, cnpj, status, responsavel_nome, responsavel_cpf, 
        responsavel_papel, responsavel_contato, qtde_tatames, capacidade_max_alunos, 
        valor_plano_padrao, horarios_funcionamento, modalidades
      )
      VALUES (
        '147ac10b-58cc-4372-a567-0e02b2c3d479',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'TeamCruz Barueri - Matriz',
        '12.345.678/0001-91',
        'ATIVA',
        'Professor Responsável',
        '123.456.789-00',
        'PROPRIETARIO',
        '(11) 99999-8888',
        3,
        150,
        180.00,
        '{"seg":"06:00-22:00","ter":"06:00-22:00","qua":"06:00-22:00","qui":"06:00-22:00","sex":"06:00-22:00","sab":"08:00-16:00","dom":"08:00-14:00"}',
        '["INFANTIL","ADULTO","COMPETICAO","FEMININO","NO-GI"]'
      )
      ON CONFLICT (cnpj) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover unidade matriz
    await queryRunner.query(
      `DELETE FROM teamcruz.unidades WHERE id = '147ac10b-58cc-4372-a567-0e02b2c3d479'`,
    );
    await queryRunner.query(
      `DELETE FROM teamcruz.franqueados WHERE id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'`,
    );
  }
}
