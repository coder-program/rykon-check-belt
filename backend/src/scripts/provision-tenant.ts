/**
 * Script de provisionamento de novo tenant.
 *
 * Uso:
 *   npx ts-node -r tsconfig-paths/register src/scripts/provision-tenant.ts <slug> "<nome>" [admin-email] [admin-senha]
 *
 * Exemplos:
 *   # Só estrutura (cria DB mas não cria usuário)
 *   npx ts-node -r tsconfig-paths/register src/scripts/provision-tenant.ts rykonfit "Rykon Fit"
 *
 *   # Estrutura + usuário admin já vinculado ao perfil master
 *   npx ts-node -r tsconfig-paths/register src/scripts/provision-tenant.ts rykonfit "Rykon Fit" admin@rykonfit.com.br MinhaSenh@123
 */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
dotenv.config();

async function provisionTenant(
  slug: string,
  nome: string,
  adminEmail?: string,
  adminSenha?: string,
): Promise<void> {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl:
      process.env.DB_HOST && !['localhost', '127.0.0.1'].includes(process.env.DB_HOST)
        ? { rejectUnauthorized: false }
        : false,
  });

  await ds.initialize();

  // Sanitiza o slug para usar como nome de schema PostgreSQL
  const schemaName = slug.toLowerCase().replace(/[^a-z0-9_]/g, '_');

  console.log(`\n🚀 Iniciando provisionamento do tenant '${slug}'...`);
  console.log(`   Nome: ${nome}`);
  console.log(`   Schema: ${schemaName}\n`);

  try {
    // ── 1. Verificar se tenant já existe ──────────────────────────────────────
    const exists = await ds.query(
      `SELECT id FROM public.tenants WHERE slug = $1`,
      [schemaName],
    );
    if (exists.length > 0) {
      console.log(`⚠️  Tenant '${schemaName}' já existe. Reativando...`);
      await ds.query(
        `UPDATE public.tenants SET ativo = true, nome = $1 WHERE slug = $2`,
        [nome, schemaName],
      );
    }

    // ── 2. Criar schema ──────────────────────────────────────────────────────
    console.log(`[1/5] Criando schema '${schemaName}'...`);
    await ds.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

    // ── 3. Copiar ENUMs do schema teamcruz ANTES das tabelas ─────────────────
    // Obrigatório: LIKE ... INCLUDING ALL copia referências ao tipo sem recriar
    // o enum no novo schema, causando dependência cross-schema.
    console.log(`[2/6] Copiando tipos (enums) do schema 'teamcruz'...`);
    const enums: { typname: string; enumlabels: string }[] = await ds.query(`
      SELECT t.typname, string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) AS enumlabels
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'teamcruz'
      GROUP BY t.typname
    `);
    for (const { typname, enumlabels } of enums) {
      const labels = enumlabels.split(',').map(l => `'${l}'`).join(', ');
      await ds.query(`
        DO $$ BEGIN
          CREATE TYPE "${schemaName}"."${typname}" AS ENUM (${labels});
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
      `);
      process.stdout.write(`   ✓ enum: ${typname}\n`);
    }

    // ── 4. Copiar estrutura do schema teamcruz ────────────────────────────────
    console.log(`[3/6] Copiando estrutura das tabelas do schema 'teamcruz'...`);
    const tables: { tablename: string }[] = await ds.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'teamcruz' ORDER BY tablename`,
    );

    for (const { tablename } of tables) {
      await ds.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}"."${tablename}" 
        (LIKE teamcruz."${tablename}" INCLUDING ALL)
      `);
      process.stdout.write(`   ✓ ${tablename}\n`);
    }

    // ── 4b. Corrigir colunas com tipos cross-schema ───────────────────────────
    // LIKE ... INCLUDING ALL copia o OID do tipo diretamente.
    // Colunas que referenciam teamcruz.XXX precisam ser alteradas para usar o
    // tipo local que criamos no passo [2/6].
    const crossCols: { table_name: string; column_name: string; typname: string; col_default: string | null }[] =
      await ds.query(`
        SELECT
          c.relname   AS table_name,
          a.attname   AS column_name,
          t.typname,
          pg_get_expr(ad.adbin, ad.adrelid) AS col_default
        FROM pg_attribute a
        JOIN pg_class     c  ON c.oid = a.attrelid
        JOIN pg_namespace cn ON cn.oid = c.relnamespace AND cn.nspname = $1
        JOIN pg_type      t  ON t.oid = a.atttypid
        JOIN pg_namespace tn ON tn.oid = t.typnamespace AND tn.nspname = 'teamcruz'
        LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
        WHERE a.attnum > 0 AND NOT a.attisdropped
      `, [schemaName]);

    for (const { table_name, column_name, typname, col_default } of crossCols) {
      // ALTER TYPE — use local enum instead of teamcruz one
      await ds.query(`
        ALTER TABLE "${schemaName}"."${table_name}"
          ALTER COLUMN "${column_name}" TYPE "${schemaName}"."${typname}"
          USING "${column_name}"::text::"${schemaName}"."${typname}"
      `);
      // Fix default if it referenced the old teamcruz enum
      if (col_default) {
        const fixedDefault = col_default.replace(
          /::teamcruz\."?[\w]+"?/g,
          `::${schemaName}."${typname}"`,
        );
        await ds.query(`
          ALTER TABLE "${schemaName}"."${table_name}"
            ALTER COLUMN "${column_name}" SET DEFAULT ${fixedDefault}
        `);
      }
      process.stdout.write(`   ✓ fixed ${table_name}.${column_name} → ${schemaName}.${typname}\n`);
    }

    // ── 5. Copiar sequences (para IDs auto-increment) ─────────────────────────
    console.log(`[4/6] Copiando sequences...`);
    const sequences: { sequence_name: string }[] = await ds.query(`
      SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'teamcruz'
    `);
    for (const { sequence_name } of sequences) {
      await ds.query(`
        CREATE SEQUENCE IF NOT EXISTS "${schemaName}"."${sequence_name}"
      `);
    }

    // ── 5b. Criar função update_updated_at_column no novo schema ─────────────
    await ds.query(`
      CREATE OR REPLACE FUNCTION "${schemaName}".update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    process.stdout.write(`   ✓ function update_updated_at_column\n`);

    // ── 5c. Recriar triggers para todas as tabelas com updated_at ─────────────
    // LIKE ... INCLUDING ALL não copia triggers — precisamos criá-los manualmente.
    const triggeredTables: { event_object_table: string; trigger_name: string }[] = await ds.query(`
      SELECT DISTINCT event_object_table, trigger_name
      FROM information_schema.triggers
      WHERE trigger_schema = 'teamcruz'
        AND action_statement LIKE '%update_updated_at_column%'
      ORDER BY event_object_table
    `);
    for (const { event_object_table, trigger_name } of triggeredTables) {
      await ds.query(`
        DROP TRIGGER IF EXISTS "${trigger_name}" ON "${schemaName}"."${event_object_table}"
      `);
      await ds.query(`
        CREATE TRIGGER "${trigger_name}"
          BEFORE UPDATE ON "${schemaName}"."${event_object_table}"
          FOR EACH ROW EXECUTE FUNCTION "${schemaName}".update_updated_at_column()
      `);
      process.stdout.write(`   ✓ trigger ${trigger_name} → ${event_object_table}\n`);
    }

    // ── 5d. Recriar FK constraints apontando para tabelas do novo schema ───────
    // LIKE ... INCLUDING ALL não copia FK constraints.
    const fkRows: { table_name: string; constraint_name: string; column_name: string; foreign_table: string; foreign_column: string; delete_rule: string }[] =
      await ds.query(`
        SELECT
          tc.table_name,
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name  AS foreign_table,
          ccu.column_name AS foreign_column,
          rc.delete_rule
        FROM information_schema.table_constraints     tc
        JOIN information_schema.key_column_usage      kcu ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints rc  ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.table_schema
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = rc.unique_constraint_name AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema    = 'teamcruz'
          AND ccu.table_schema   = 'teamcruz'
        ORDER BY tc.table_name, tc.constraint_name
      `);
    for (const { table_name, constraint_name, column_name, foreign_table, foreign_column, delete_rule } of fkRows) {
      const onDelete = delete_rule === 'NO ACTION' ? '' : ` ON DELETE ${delete_rule}`;
      await ds.query(`
        ALTER TABLE "${schemaName}"."${table_name}"
          DROP CONSTRAINT IF EXISTS "${constraint_name}"
      `);
      await ds.query(`
        ALTER TABLE "${schemaName}"."${table_name}"
          ADD CONSTRAINT "${constraint_name}"
          FOREIGN KEY ("${column_name}")
          REFERENCES "${schemaName}"."${foreign_table}"("${foreign_column}")${onDelete}
      `);
      process.stdout.write(`   ✓ FK ${table_name}.${column_name} → ${foreign_table}.${foreign_column}\n`);
    }

    // ── 6. Registrar em public.tenants ────────────────────────────────────────
    console.log(`[5/6] Registrando tenant em public.tenants...`);
    await ds.query(
      `
      INSERT INTO public.tenants (slug, nome, schema_name, plano, ativo, max_alunos, max_unidades)
      VALUES ($1, $2, $3, 'basico', true, 1000, 5)
      ON CONFLICT (slug) DO UPDATE SET nome = $2, ativo = true
      `,
      [schemaName, nome, schemaName],
    );

    // ── 7. Seed: copiar faixa_def do teamcruz ────────────────────────────────
    console.log(`[6/7] Inserindo seed de faixas...`);
    await ds.query(`SET search_path TO "${schemaName}", public`);
    await ds.query(`
      INSERT INTO "${schemaName}".faixa_def
      SELECT * FROM teamcruz.faixa_def
      ON CONFLICT DO NOTHING
    `);

    // ── 8. Seed: copiar perfis e permissões do teamcruz ───────────────────────
    console.log(`[7/7] Inserindo seed de perfis e permissões...`);
    await ds.query(`
      INSERT INTO "${schemaName}".niveis_permissao (id, codigo, nome, descricao, cor, ordem)
      SELECT id, codigo, nome, descricao, cor, ordem FROM teamcruz.niveis_permissao
      ON CONFLICT DO NOTHING
    `);
    await ds.query(`
      INSERT INTO "${schemaName}".tipos_permissao (id, codigo, nome, descricao, ordem)
      SELECT id, codigo, nome, descricao, ordem FROM teamcruz.tipos_permissao
      ON CONFLICT DO NOTHING
    `);
    await ds.query(`
      INSERT INTO "${schemaName}".perfis (id, nome, descricao, ativo)
      SELECT id, nome, descricao, ativo FROM teamcruz.perfis
      ON CONFLICT DO NOTHING
    `);
    await ds.query(`
      INSERT INTO "${schemaName}".permissoes (id, codigo, nome, descricao, tipo_id, nivel_id, modulo, ativo)
      SELECT id, codigo, nome, descricao, tipo_id, nivel_id, modulo, ativo FROM teamcruz.permissoes
      ON CONFLICT DO NOTHING
    `);
    await ds.query(`
      INSERT INTO "${schemaName}".perfil_permissoes (perfil_id, permissao_id)
      SELECT perfil_id, permissao_id FROM teamcruz.perfil_permissoes
      ON CONFLICT DO NOTHING
    `);
    console.log(`   ✓ niveis_permissao, tipos_permissao, perfis, permissoes, perfil_permissoes`);

    // ── 9. Criar usuário admin (opcional) ────────────────────────────────────
    if (adminEmail && adminSenha) {
      console.log(`\n[+] Criando usuário admin '${adminEmail}'...`);

      const masterPerfil = await ds.query(
        `SELECT id FROM "${schemaName}".perfis WHERE LOWER(nome) = 'master' LIMIT 1`,
      );
      if (!masterPerfil || masterPerfil.length === 0) {
        throw new Error(`Perfil master não encontrado em '${schemaName}'.perfis após seed.`);
      }
      const masterPerfilId = masterPerfil[0].id;

      const passwordHash = await bcrypt.hash(adminSenha, 10);
      const usernameFromEmail = adminEmail.split('@')[0].replace(/[^a-z0-9._]/gi, '');

      const newUser = await ds.query(
        `INSERT INTO "${schemaName}".usuarios
           (id, username, email, password, nome, ativo, cadastro_completo, created_at, updated_at)
         VALUES
           (uuid_generate_v4(), $1, $2, $3, $4, true, true, NOW(), NOW())
         ON CONFLICT (email) DO UPDATE
           SET password = EXCLUDED.password, ativo = true
         RETURNING id, email`,
        [usernameFromEmail, adminEmail, passwordHash, `Admin ${nome}`],
      );
      const userId = newUser[0].id;

      await ds.query(
        `INSERT INTO "${schemaName}".usuario_perfis (usuario_id, perfil_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [userId, masterPerfilId],
      );

      console.log(`   ✓ Usuário '${adminEmail}' criado e vinculado ao perfil master.`);
      console.log(`   ✓ Login: email=${adminEmail} | senha=<a que você passou>`);
    }

    console.log(`\n✅ Tenant '${schemaName}' (${nome}) provisionado com sucesso!`);

    if (!adminEmail) {
      console.log(`\n📋 Próximo passo obrigatório — criar usuário admin:`);
      console.log(`   npx ts-node src/scripts/provision-tenant.ts ${schemaName} "${nome}" <admin-email> <admin-senha>`);
      console.log(`   OU use o script auxiliar após criar via API:`);
      console.log(`   npx ts-node src/scripts/link-admin-to-master.ts ${schemaName} <email>`);
    }
    console.log(`\n🌐 Acesso: ${schemaName}.rykon.com.br  |  Header: X-Tenant-ID: ${schemaName}\n`);
  } catch (error) {
    console.error(`\n❌ Erro ao provisionar tenant:`, error);
    throw error;
  } finally {
    await ds.destroy();
  }
}

// Parse arguments: slug, nome (entre aspas), email opcional, senha opcional
// Estratégia: todos os args após o slug que NÃO parecem email compõem o nome;
// o primeiro que contém '@' é o email; o seguinte é a senha.
const args = process.argv.slice(2);
const slug = args[0];

if (!slug) {
  console.error('\n❌ Uso: npx ts-node src/scripts/provision-tenant.ts <slug> "<nome>" [admin-email] [admin-senha]');
  console.error('   Exemplo: npx ts-node src/scripts/provision-tenant.ts rykonfit "Rykon Fit" admin@rykonfit.com.br MinhaSenh@123\n');
  process.exit(1);
}

const emailIndex = args.findIndex((a, i) => i > 0 && a.includes('@'));
const nome = emailIndex === -1
  ? args.slice(1).join(' ')
  : args.slice(1, emailIndex).join(' ');
const adminEmail = emailIndex !== -1 ? args[emailIndex] : undefined;
const adminSenha = emailIndex !== -1 ? args[emailIndex + 1] : undefined;

if (!nome) {
  console.error('\n❌ Nome do tenant é obrigatório.');
  console.error('   Exemplo: npx ts-node src/scripts/provision-tenant.ts rykonfit "Rykon Fit"\n');
  process.exit(1);
}

if (adminEmail && !adminSenha) {
  console.error('\n❌ Se informar o email do admin, informe também a senha.');
  console.error(`   Exemplo: npx ts-node src/scripts/provision-tenant.ts ${slug} "${nome}" ${adminEmail} MinhaSenh@123\n`);
  process.exit(1);
}

provisionTenant(slug, nome, adminEmail, adminSenha).catch((err) => {
  console.error(err);
  process.exit(1);
});
