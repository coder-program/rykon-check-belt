import { MigrationInterface, QueryRunner } from 'typeorm';

export class MoverTabelasUsuariosParaTeamcruz1756928000000
  implements MigrationInterface
{
  name = 'MoverTabelasUsuariosParaTeamcruz1756928000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se as tabelas já estão no schema teamcruz
    const result = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'teamcruz'
      AND table_name IN ('usuarios', 'perfis', 'permissoes', 'tipos_permissao', 'niveis_permissao')
    `);

    if (result[0].count > 0) {
      // Apenas garantir que o search_path está configurado
      // await queryRunner.query(
      //   `ALTER DATABASE teamcruz SET search_path TO teamcruz, public`,
      // );
      return;
    }

    // Se as tabelas estiverem no schema public, mover para teamcruz
    // Primeiro, as tabelas sem dependências
    const publicTables = await queryRunner.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('niveis_permissao', 'tipos_permissao', 'usuarios', 'perfis',
                         'permissoes', 'perfil_permissoes', 'usuario_perfis', 'audit_logs')
    `);

    for (const table of publicTables) {
      await queryRunner.query(
        `ALTER TABLE public.${table.table_name} SET SCHEMA teamcruz`,
      );
    }

    // Atualizar search_path para incluir teamcruz por padrão
    await queryRunner.query(
      `ALTER DATABASE teamcruz_db SET search_path TO teamcruz, public`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverter - mover tabelas de volta para public
    await queryRunner.query(
      `ALTER TABLE teamcruz.usuario_perfis SET SCHEMA public`,
    );
    await queryRunner.query(
      `ALTER TABLE teamcruz.perfil_permissoes SET SCHEMA public`,
    );
    await queryRunner.query(
      `ALTER TABLE teamcruz.permissoes SET SCHEMA public`,
    );
    await queryRunner.query(
      `ALTER TABLE teamcruz.password_reset_tokens SET SCHEMA public`,
    );
    await queryRunner.query(`ALTER TABLE teamcruz.perfis SET SCHEMA public`);
    await queryRunner.query(`ALTER TABLE teamcruz.usuarios SET SCHEMA public`);
    await queryRunner.query(
      `ALTER TABLE teamcruz.tipos_permissao SET SCHEMA public`,
    );
    await queryRunner.query(
      `ALTER TABLE teamcruz.niveis_permissao SET SCHEMA public`,
    );
    await queryRunner.query(
      `ALTER TABLE teamcruz.audit_logs SET SCHEMA public`,
    );

    await queryRunner.query(
      `ALTER DATABASE teamcruz_db SET search_path TO public`,
    );
  }
}
