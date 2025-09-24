import { MigrationInterface, QueryRunner } from 'typeorm';

export class MoverTabelasUsuariosParaTeamcruz1756928000000
  implements MigrationInterface
{
  name = 'MoverTabelasUsuariosParaTeamcruz1756928000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Mover tabelas de usuários para schema teamcruz
    // Importante: mover na ordem correta respeitando as foreign keys

    // Primeiro, as tabelas sem dependências
    await queryRunner.query(
      `ALTER TABLE public.niveis_permissao SET SCHEMA teamcruz`,
    );
    await queryRunner.query(
      `ALTER TABLE public.tipos_permissao SET SCHEMA teamcruz`,
    );
    await queryRunner.query(`ALTER TABLE public.usuarios SET SCHEMA teamcruz`);
    await queryRunner.query(`ALTER TABLE public.perfis SET SCHEMA teamcruz`);
    // password_reset_tokens não existe, vamos pular

    // Depois, as tabelas com foreign keys
    await queryRunner.query(
      `ALTER TABLE public.permissoes SET SCHEMA teamcruz`,
    );
    await queryRunner.query(
      `ALTER TABLE public.perfil_permissoes SET SCHEMA teamcruz`,
    );
    await queryRunner.query(
      `ALTER TABLE public.usuario_perfis SET SCHEMA teamcruz`,
    );

    // Mover audit_logs para teamcruz também
    await queryRunner.query(
      `ALTER TABLE public.audit_logs SET SCHEMA teamcruz`,
    );

    // Endereços e vinculos_endereco já estão em teamcruz, não precisamos mover

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
