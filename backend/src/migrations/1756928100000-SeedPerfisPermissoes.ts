import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedPerfisPermissoes1756928100000 implements MigrationInterface {
  name = 'SeedPerfisPermissoes1756928100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar níveis de permissão
    await queryRunner.query(`
      INSERT INTO teamcruz.niveis_permissao (id, codigo, nome, descricao, cor, ordem)
      VALUES 
        (uuid_generate_v4(), 'READ', 'Leitura', 'Permissão para visualizar', '#28a745', 1),
        (uuid_generate_v4(), 'WRITE', 'Escrita', 'Permissão para criar e editar', '#ffc107', 2),
        (uuid_generate_v4(), 'DELETE', 'Exclusão', 'Permissão para excluir', '#dc3545', 3),
        (uuid_generate_v4(), 'ADMIN', 'Administração', 'Permissão total', '#6f42c1', 4)
      ON CONFLICT (codigo) DO NOTHING
    `);

    // 2. Criar tipos de permissão
    await queryRunner.query(`
      INSERT INTO teamcruz.tipos_permissao (id, codigo, nome, descricao, ordem)
      VALUES
        (uuid_generate_v4(), 'FRANQUIAS', 'Franquias', 'Gestão de franquias', 1),
        (uuid_generate_v4(), 'UNIDADES', 'Unidades', 'Gestão de unidades/academias', 2),
        (uuid_generate_v4(), 'ALUNOS', 'Alunos', 'Gestão de alunos', 3),
        (uuid_generate_v4(), 'PROFESSORES', 'Professores', 'Gestão de professores', 4),
        (uuid_generate_v4(), 'FINANCEIRO', 'Financeiro', 'Gestão financeira', 5),
        (uuid_generate_v4(), 'USUARIOS', 'Usuários', 'Gestão de usuários do sistema', 6),
        (uuid_generate_v4(), 'RELATORIOS', 'Relatórios', 'Acesso a relatórios', 7),
        (uuid_generate_v4(), 'CONFIGURACOES', 'Configurações', 'Configurações do sistema', 8)
      ON CONFLICT (codigo) DO NOTHING
    `);

    // 3. Criar perfis
    const perfilMaster = await queryRunner.query(`
      INSERT INTO teamcruz.perfis (id, nome, descricao, ativo)
      VALUES (uuid_generate_v4(), 'master', 'Administrador master do sistema', true)
      ON CONFLICT (nome) DO UPDATE SET descricao = EXCLUDED.descricao
      RETURNING id
    `);

    const perfilFranqueado = await queryRunner.query(`
      INSERT INTO teamcruz.perfis (id, nome, descricao, ativo)
      VALUES (uuid_generate_v4(), 'franqueado', 'Proprietário de franquia', true)
      ON CONFLICT (nome) DO UPDATE SET descricao = EXCLUDED.descricao
      RETURNING id
    `);

    const perfilGerente = await queryRunner.query(`
      INSERT INTO teamcruz.perfis (id, nome, descricao, ativo)
      VALUES (uuid_generate_v4(), 'gerente_unidade', 'Gerente de unidade/academia', true)
      ON CONFLICT (nome) DO UPDATE SET descricao = EXCLUDED.descricao
      RETURNING id
    `);

    const perfilInstrutor = await queryRunner.query(`
      INSERT INTO teamcruz.perfis (id, nome, descricao, ativo)
      VALUES (uuid_generate_v4(), 'instrutor', 'Instrutor/Professor de jiu-jitsu', true)
      ON CONFLICT (nome) DO UPDATE SET descricao = EXCLUDED.descricao
      RETURNING id
    `);

    const perfilAluno = await queryRunner.query(`
      INSERT INTO teamcruz.perfis (id, nome, descricao, ativo)
      VALUES (uuid_generate_v4(), 'aluno', 'Aluno de jiu-jitsu', true)
      ON CONFLICT (nome) DO UPDATE SET descricao = EXCLUDED.descricao
      RETURNING id
    `);

    // 4. Criar permissões e vincular aos perfis
    // Primeiro, vamos criar todas as permissões
    await queryRunner.query(`
      -- Permissões de Franquias
      INSERT INTO teamcruz.permissoes (id, codigo, nome, descricao, tipo_id, nivel_id, modulo, ativo)
      SELECT 
        uuid_generate_v4(),
        CONCAT('FRANQUIAS_', np.codigo),
        CONCAT('Franquias - ', np.nome),
        CONCAT('Permissão de ', LOWER(np.nome), ' para franquias'),
        tp.id,
        np.id,
        'FRANQUIAS',
        true
      FROM teamcruz.tipos_permissao tp
      CROSS JOIN teamcruz.niveis_permissao np
      WHERE tp.codigo = 'FRANQUIAS'
      ON CONFLICT (codigo) DO NOTHING;

      -- Permissões de Unidades
      INSERT INTO teamcruz.permissoes (id, codigo, nome, descricao, tipo_id, nivel_id, modulo, ativo)
      SELECT 
        uuid_generate_v4(),
        CONCAT('UNIDADES_', np.codigo),
        CONCAT('Unidades - ', np.nome),
        CONCAT('Permissão de ', LOWER(np.nome), ' para unidades'),
        tp.id,
        np.id,
        'UNIDADES',
        true
      FROM teamcruz.tipos_permissao tp
      CROSS JOIN teamcruz.niveis_permissao np
      WHERE tp.codigo = 'UNIDADES'
      ON CONFLICT (codigo) DO NOTHING;

      -- Permissões de Alunos
      INSERT INTO teamcruz.permissoes (id, codigo, nome, descricao, tipo_id, nivel_id, modulo, ativo)
      SELECT 
        uuid_generate_v4(),
        CONCAT('ALUNOS_', np.codigo),
        CONCAT('Alunos - ', np.nome),
        CONCAT('Permissão de ', LOWER(np.nome), ' para alunos'),
        tp.id,
        np.id,
        'ALUNOS',
        true
      FROM teamcruz.tipos_permissao tp
      CROSS JOIN teamcruz.niveis_permissao np
      WHERE tp.codigo = 'ALUNOS'
      ON CONFLICT (codigo) DO NOTHING;

      -- Permissões de Professores
      INSERT INTO teamcruz.permissoes (id, codigo, nome, descricao, tipo_id, nivel_id, modulo, ativo)
      SELECT 
        uuid_generate_v4(),
        CONCAT('PROFESSORES_', np.codigo),
        CONCAT('Professores - ', np.nome),
        CONCAT('Permissão de ', LOWER(np.nome), ' para professores'),
        tp.id,
        np.id,
        'PROFESSORES',
        true
      FROM teamcruz.tipos_permissao tp
      CROSS JOIN teamcruz.niveis_permissao np
      WHERE tp.codigo = 'PROFESSORES'
      ON CONFLICT (codigo) DO NOTHING;

      -- Permissões Financeiras
      INSERT INTO teamcruz.permissoes (id, codigo, nome, descricao, tipo_id, nivel_id, modulo, ativo)
      SELECT 
        uuid_generate_v4(),
        CONCAT('FINANCEIRO_', np.codigo),
        CONCAT('Financeiro - ', np.nome),
        CONCAT('Permissão de ', LOWER(np.nome), ' para financeiro'),
        tp.id,
        np.id,
        'FINANCEIRO',
        true
      FROM teamcruz.tipos_permissao tp
      CROSS JOIN teamcruz.niveis_permissao np
      WHERE tp.codigo = 'FINANCEIRO'
      ON CONFLICT (codigo) DO NOTHING;

      -- Permissões de Usuários
      INSERT INTO teamcruz.permissoes (id, codigo, nome, descricao, tipo_id, nivel_id, modulo, ativo)
      SELECT 
        uuid_generate_v4(),
        CONCAT('USUARIOS_', np.codigo),
        CONCAT('Usuários - ', np.nome),
        CONCAT('Permissão de ', LOWER(np.nome), ' para usuários'),
        tp.id,
        np.id,
        'USUARIOS',
        true
      FROM teamcruz.tipos_permissao tp
      CROSS JOIN teamcruz.niveis_permissao np
      WHERE tp.codigo = 'USUARIOS'
      ON CONFLICT (codigo) DO NOTHING;

      -- Permissões de Relatórios (apenas READ)
      INSERT INTO teamcruz.permissoes (id, codigo, nome, descricao, tipo_id, nivel_id, modulo, ativo)
      SELECT 
        uuid_generate_v4(),
        CONCAT('RELATORIOS_', np.codigo),
        CONCAT('Relatórios - ', np.nome),
        CONCAT('Permissão de ', LOWER(np.nome), ' para relatórios'),
        tp.id,
        np.id,
        'RELATORIOS',
        true
      FROM teamcruz.tipos_permissao tp
      CROSS JOIN teamcruz.niveis_permissao np
      WHERE tp.codigo = 'RELATORIOS' AND np.codigo = 'READ'
      ON CONFLICT (codigo) DO NOTHING;

      -- Permissões de Configurações
      INSERT INTO teamcruz.permissoes (id, codigo, nome, descricao, tipo_id, nivel_id, modulo, ativo)
      SELECT 
        uuid_generate_v4(),
        CONCAT('CONFIGURACOES_', np.codigo),
        CONCAT('Configurações - ', np.nome),
        CONCAT('Permissão de ', LOWER(np.nome), ' para configurações'),
        tp.id,
        np.id,
        'CONFIGURACOES',
        true
      FROM teamcruz.tipos_permissao tp
      CROSS JOIN teamcruz.niveis_permissao np
      WHERE tp.codigo = 'CONFIGURACOES'
      ON CONFLICT (codigo) DO NOTHING;
    `);

    // 5. Vincular permissões aos perfis

    // Master - tem TODAS as permissões
    await queryRunner.query(`
      INSERT INTO teamcruz.perfil_permissoes (perfil_id, permissao_id)
      SELECT 
        (SELECT id FROM teamcruz.perfis WHERE nome = 'master' LIMIT 1),
        p.id
      FROM teamcruz.permissoes p
      ON CONFLICT DO NOTHING
    `);

    // Franqueado - gerencia suas unidades e alunos, vê relatórios
    await queryRunner.query(`
      INSERT INTO teamcruz.perfil_permissoes (perfil_id, permissao_id)
      SELECT 
        (SELECT id FROM teamcruz.perfis WHERE nome = 'franqueado' LIMIT 1),
        p.id
      FROM teamcruz.permissoes p
      WHERE p.codigo IN (
        'UNIDADES_READ', 'UNIDADES_WRITE', 'UNIDADES_DELETE',
        'ALUNOS_READ', 'ALUNOS_WRITE',
        'PROFESSORES_READ', 'PROFESSORES_WRITE',
        'FINANCEIRO_READ', 'FINANCEIRO_WRITE',
        'RELATORIOS_READ',
        'FRANQUIAS_READ' -- Só pode ver franquias, não editar
      )
      ON CONFLICT DO NOTHING
    `);

    // Gerente de Unidade - gerencia a unidade e alunos
    await queryRunner.query(`
      INSERT INTO teamcruz.perfil_permissoes (perfil_id, permissao_id)
      SELECT 
        (SELECT id FROM teamcruz.perfis WHERE nome = 'gerente_unidade' LIMIT 1),
        p.id
      FROM teamcruz.permissoes p
      WHERE p.codigo IN (
        'UNIDADES_READ', 'UNIDADES_WRITE', -- Pode editar dados operacionais da unidade
        'ALUNOS_READ', 'ALUNOS_WRITE',
        'PROFESSORES_READ',
        'FINANCEIRO_READ',
        'RELATORIOS_READ'
      )
      ON CONFLICT DO NOTHING
    `);

    // Instrutor - gerencia alunos e aulas
    await queryRunner.query(`
      INSERT INTO teamcruz.perfil_permissoes (perfil_id, permissao_id)
      SELECT 
        (SELECT id FROM teamcruz.perfis WHERE nome = 'instrutor' LIMIT 1),
        p.id
      FROM teamcruz.permissoes p
      WHERE p.codigo IN (
        'ALUNOS_READ', 'ALUNOS_WRITE',
        'UNIDADES_READ' -- Só visualiza unidade
      )
      ON CONFLICT DO NOTHING
    `);

    // Aluno - apenas visualiza seus próprios dados
    await queryRunner.query(`
      INSERT INTO teamcruz.perfil_permissoes (perfil_id, permissao_id)
      SELECT 
        (SELECT id FROM teamcruz.perfis WHERE nome = 'aluno' LIMIT 1),
        p.id
      FROM teamcruz.permissoes p
      WHERE p.codigo IN (
        'ALUNOS_READ' -- Só seus próprios dados (filtrado na aplicação)
      )
      ON CONFLICT DO NOTHING
    `);

    // 6. Criar usuário master padrão (se não existir)
    const hashedPassword = '$2b$10$YourHashedPasswordHere'; // Você deve gerar um hash real
    await queryRunner.query(`
      INSERT INTO teamcruz.usuarios (id, username, email, password, nome, ativo)
      VALUES (
        uuid_generate_v4(), 
        'admin', 
        'admin@teamcruz.com', 
        '$2b$10$kqWjr5K7Jm8gIE7BGT4QEuQPxH3GhM9z8s6A0NbD8UrlYmGSU.9/y', -- senha: admin123
        'Administrador Master',
        true
      )
      ON CONFLICT (username) DO NOTHING
    `);

    // Vincular usuário admin ao perfil master
    await queryRunner.query(`
      INSERT INTO teamcruz.usuario_perfis (usuario_id, perfil_id)
      SELECT 
        u.id,
        p.id
      FROM teamcruz.usuarios u
      CROSS JOIN teamcruz.perfis p
      WHERE u.username = 'admin' AND p.nome = 'master'
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover vínculos
    await queryRunner.query(
      `DELETE FROM teamcruz.usuario_perfis WHERE usuario_id IN (SELECT id FROM teamcruz.usuarios WHERE username = 'admin')`,
    );
    await queryRunner.query(`DELETE FROM teamcruz.perfil_permissoes`);

    // Remover dados seed
    await queryRunner.query(
      `DELETE FROM teamcruz.usuarios WHERE username = 'admin'`,
    );
    await queryRunner.query(`DELETE FROM teamcruz.permissoes`);
    await queryRunner.query(
      `DELETE FROM teamcruz.perfis WHERE nome IN ('master', 'franqueado', 'gerente_unidade', 'instrutor', 'aluno')`,
    );
    await queryRunner.query(`DELETE FROM teamcruz.tipos_permissao`);
    await queryRunner.query(`DELETE FROM teamcruz.niveis_permissao`);
  }
}
