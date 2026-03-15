/**
 * Script: fix-tenant-enums.ts
 * Corrige todos os tipos cross-schema em qualquer tenant provisionado com o script antigo
 * (LIKE ... INCLUDING ALL sem enums locais → colunas apontavam para teamcruz.XXX_enum).
 *
 * Uso:
 *   cd backend
 *   npx ts-node -r tsconfig-paths/register src/scripts/fix-rykon-enums.ts <schema>
 *
 * Exemplos:
 *   npx ts-node -r tsconfig-paths/register src/scripts/fix-rykon-enums.ts rykon
 *   npx ts-node -r tsconfig-paths/register src/scripts/fix-rykon-enums.ts g13
 *   npx ts-node -r tsconfig-paths/register src/scripts/fix-rykon-enums.ts grace_barra
 *   npx ts-node -r tsconfig-paths/register src/scripts/fix-rykon-enums.ts templo
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

const SCHEMA = process.argv[2];
if (!SCHEMA) {
  console.error('\n❌ Uso: npx ts-node src/scripts/fix-rykon-enums.ts <schema>');
  console.error('   Exemplo: npx ts-node src/scripts/fix-rykon-enums.ts rykon\n');
  process.exit(1);
}

async function run(): Promise<void> {
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
  console.log(`\n🔧 Corrigindo enums cross-schema em '${SCHEMA}'...\n`);

  try {
    // ── 1. Criar ENUMs locais ──────────────────────────────────────────────────
    console.log('[1/5] Criando enums locais...');
    const enums: Array<{ name: string; values: string[] }> = [
      { name: 'audit_action_enum',        values: ['CREATE','UPDATE','DELETE','LOGIN','LOGOUT','ACCESS'] },
      { name: 'categoria_faixa_enum',     values: ['ADULTO','INFANTIL','MESTRE'] },
      { name: 'genero_enum',              values: ['MASCULINO','FEMININO','OUTRO'] },
      { name: 'origem_grau_enum',         values: ['MANUAL','AUTOMATICO','IMPORTACAO'] },
      { name: 'situacao_franqueado_enum', values: ['ATIVA','INATIVA','EM_HOMOLOGACAO'] },
      { name: 'status_aluno_enum',        values: ['ATIVO','INATIVO','SUSPENSO','CANCELADO'] },
      { name: 'status_cadastro_enum',     values: ['ATIVO','INATIVO','EM_AVALIACAO','SUSPENSO','AFASTADO'] },
      { name: 'status_unidade_enum',      values: ['HOMOLOGACAO','ATIVA','INATIVA','SUSPENSA'] },
      { name: 'tipo_cadastro_enum',       values: ['ALUNO','PROFESSOR'] },
    ];

    for (const { name, values } of enums) {
      const labels = values.map(v => `'${v}'`).join(', ');
      await ds.query(`
        DO $$ BEGIN
          CREATE TYPE "${SCHEMA}"."${name}" AS ENUM (${labels});
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
      `);
      console.log(`   ✓ ${name}`);
    }

    // ── 2. Migrar colunas ─────────────────────────────────────────────────────
    console.log('\n[2/5] Migrando colunas...');
    const columns: Array<{ table: string; column: string; type: string; default?: string }> = [
      { table: 'aluno_faixa_grau', column: 'origem',        type: 'origem_grau_enum',         default: "'MANUAL'" },
      { table: 'alunos',           column: 'genero',        type: 'genero_enum' },
      { table: 'alunos',           column: 'status',        type: 'status_aluno_enum',         default: "'ATIVO'" },
      { table: 'audit_logs',       column: 'action',        type: 'audit_action_enum' },
      { table: 'faixa_def',        column: 'categoria',     type: 'categoria_faixa_enum',      default: "'ADULTO'" },
      { table: 'franqueados',      column: 'situacao',      type: 'situacao_franqueado_enum',  default: "'ATIVA'" },
      { table: 'historico_graus',  column: 'origem_grau',   type: 'origem_grau_enum',          default: "'AUTOMATICO'" },
      { table: 'professores',      column: 'tipo_cadastro', type: 'tipo_cadastro_enum' },
      { table: 'professores',      column: 'genero',        type: 'genero_enum' },
      { table: 'professores',      column: 'status',        type: 'status_cadastro_enum',      default: "'ATIVO'" },
      { table: 'unidades',         column: 'status',        type: 'status_unidade_enum',       default: "'HOMOLOGACAO'" },
    ];

    for (const { table, column, type, default: def } of columns) {
      await ds.query(`ALTER TABLE "${SCHEMA}"."${table}" ALTER COLUMN "${column}" DROP DEFAULT`);
      await ds.query(`
        ALTER TABLE "${SCHEMA}"."${table}"
          ALTER COLUMN "${column}" TYPE "${SCHEMA}"."${type}"
          USING "${column}"::text::"${SCHEMA}"."${type}"
      `);
      if (def) {
        await ds.query(`
          ALTER TABLE "${SCHEMA}"."${table}"
            ALTER COLUMN "${column}" SET DEFAULT ${def}::"${SCHEMA}"."${type}"
        `);
      }
      console.log(`   ✓ ${table}.${column} → ${type}`);
    }

    // ── 3. Função update_updated_at_column ────────────────────────────────────
    console.log('\n[3/5] Criando função update_updated_at_column...');
    await ds.query(`
      CREATE OR REPLACE FUNCTION "${SCHEMA}".update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('   ✓ function update_updated_at_column');

    // ── 4. Triggers ───────────────────────────────────────────────────────────
    console.log('\n[4/5] Recriando triggers...');
    const triggeredTables = ['unidades', 'franqueados', 'professores', 'alunos'];
    for (const table of triggeredTables) {
      const triggerName = `update_${table}_updated_at`;
      await ds.query(`DROP TRIGGER IF EXISTS "${triggerName}" ON "${SCHEMA}"."${table}"`);
      await ds.query(`
        CREATE TRIGGER "${triggerName}"
          BEFORE UPDATE ON "${SCHEMA}"."${table}"
          FOR EACH ROW EXECUTE FUNCTION "${SCHEMA}".update_updated_at_column()
      `);
      console.log(`   ✓ trigger ${triggerName}`);
    }

    // ── 5. FK constraints ─────────────────────────────────────────────────────
    console.log('\n[5/5] Recriando FK constraints de unidades...');
    await ds.query(`ALTER TABLE "${SCHEMA}".unidades DROP CONSTRAINT IF EXISTS fk_unidades_endereco`);
    await ds.query(`ALTER TABLE "${SCHEMA}".unidades DROP CONSTRAINT IF EXISTS fk_unidades_franqueado`);
    await ds.query(`ALTER TABLE "${SCHEMA}".unidades ADD CONSTRAINT fk_unidades_endereco   FOREIGN KEY (endereco_id)   REFERENCES "${SCHEMA}".enderecos(id)`);
    await ds.query(`ALTER TABLE "${SCHEMA}".unidades ADD CONSTRAINT fk_unidades_franqueado FOREIGN KEY (franqueado_id) REFERENCES "${SCHEMA}".franqueados(id) ON DELETE CASCADE`);
    console.log('   ✓ fk_unidades_endereco');
    console.log('   ✓ fk_unidades_franqueado');

    // ── 6. Seed de perfis e permissões (copia de teamcruz) ────────────────────
    console.log('\n[6/6] Seedando perfis e permissões a partir de teamcruz...');

    // 6a. niveis_permissao
    await ds.query(`
      INSERT INTO "${SCHEMA}".niveis_permissao (id, codigo, nome, descricao, cor, ordem)
      SELECT id, codigo, nome, descricao, cor, ordem
      FROM teamcruz.niveis_permissao
      ON CONFLICT DO NOTHING
    `);
    console.log('   ✓ niveis_permissao');

    // 6b. tipos_permissao
    await ds.query(`
      INSERT INTO "${SCHEMA}".tipos_permissao (id, codigo, nome, descricao, ordem)
      SELECT id, codigo, nome, descricao, ordem
      FROM teamcruz.tipos_permissao
      ON CONFLICT DO NOTHING
    `);
    console.log('   ✓ tipos_permissao');

    // 6c. perfis
    await ds.query(`
      INSERT INTO "${SCHEMA}".perfis (id, nome, descricao, ativo)
      SELECT id, nome, descricao, ativo
      FROM teamcruz.perfis
      ON CONFLICT DO NOTHING
    `);
    console.log('   ✓ perfis');

    // 6d. permissoes (depende de niveis_permissao e tipos_permissao)
    await ds.query(`
      INSERT INTO "${SCHEMA}".permissoes (id, codigo, nome, descricao, tipo_id, nivel_id, modulo, ativo)
      SELECT id, codigo, nome, descricao, tipo_id, nivel_id, modulo, ativo
      FROM teamcruz.permissoes
      ON CONFLICT DO NOTHING
    `);
    console.log('   ✓ permissoes');

    // 6e. perfil_permissoes
    await ds.query(`
      INSERT INTO "${SCHEMA}".perfil_permissoes (perfil_id, permissao_id)
      SELECT perfil_id, permissao_id
      FROM teamcruz.perfil_permissoes
      ON CONFLICT DO NOTHING
    `);
    console.log('   ✓ perfil_permissoes');

    // ── Verificação ───────────────────────────────────────────────────────────
    const remaining = await ds.query(`
      SELECT c.relname AS table_name, a.attname AS column_name, t.typname, tn.nspname AS type_schema
      FROM pg_attribute a
      JOIN pg_class     c  ON c.oid = a.attrelid
      JOIN pg_namespace cn ON cn.oid = c.relnamespace AND cn.nspname = $1
      JOIN pg_type      t  ON t.oid = a.atttypid
      JOIN pg_namespace tn ON tn.oid = t.typnamespace
      WHERE a.attnum > 0 AND NOT a.attisdropped
        AND tn.nspname NOT IN ($1, 'pg_catalog', 'public')
    `, [SCHEMA]);

    if (remaining.length === 0) {
      console.log(`\n✅ Concluído! Nenhuma dependência cross-schema restante em '${SCHEMA}'.`);
    } else {
      console.warn(`\n⚠️  Ainda existem ${remaining.length} colunas com tipos cross-schema:`);
      console.table(remaining);
    }
  } catch (err) {
    console.error('\n❌ Erro:', err);
    throw err;
  } finally {
    await ds.destroy();
  }
}

run().catch(() => process.exit(1));
