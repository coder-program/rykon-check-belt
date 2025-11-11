import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoverCamposEnderecoAlunos1756927700000
  implements MigrationInterface
{
  name = 'RemoverCamposEnderecoAlunos1756927700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se a tabela alunos existe antes de tentar alterar
    const hasTable = await queryRunner.hasTable('alunos');
    if (!hasTable) {
      return;
    }

    // Remover colunas de endereço antigas da tabela alunos
    const columns = ['endereco', 'cep', 'estado', 'cidade_nome'];

    for (const columnName of columns) {
      const hasColumn = await queryRunner.hasColumn('alunos', columnName);
      if (hasColumn) {
        await queryRunner.dropColumn('alunos', columnName);
      }
    }

    // Também remover campos relacionados se existirem
    const optionalColumns = ['logradouro', 'numero', 'complemento', 'bairro'];

    for (const columnName of optionalColumns) {
      const hasColumn = await queryRunner.hasColumn('alunos', columnName);
      if (hasColumn) {
        await queryRunner.dropColumn('alunos', columnName);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recriar as colunas caso precise fazer rollback
    const hasTable = await queryRunner.hasTable('alunos');
    if (!hasTable) {
      return;
    }

    // Recriar colunas básicas de endereço
    await queryRunner.query(
      `ALTER TABLE alunos ADD COLUMN IF NOT EXISTS endereco TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE alunos ADD COLUMN IF NOT EXISTS cep VARCHAR(10)`,
    );
    await queryRunner.query(
      `ALTER TABLE alunos ADD COLUMN IF NOT EXISTS estado VARCHAR(2)`,
    );
    await queryRunner.query(
      `ALTER TABLE alunos ADD COLUMN IF NOT EXISTS cidade_nome VARCHAR(100)`,
    );

    console.log('Colunas de endereço restauradas na tabela alunos');
  }
}
