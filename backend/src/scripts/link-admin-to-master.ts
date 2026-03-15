/**
 * Script: link-admin-to-master.ts
 * Diagnostica e vincula usuários ao perfil master em um schema tenant.
 *
 * Uso:
 *   cd backend
 *   npx ts-node -r tsconfig-paths/register src/scripts/link-admin-to-master.ts <schema> [usuario_id_ou_email]
 *
 * Exemplos:
 *   # Listar todos os usuários sem perfil (modo diagnóstico)
 *   npx ts-node -r tsconfig-paths/register src/scripts/link-admin-to-master.ts rykon
 *
 *   # Vincular usuário específico por email ao perfil master
 *   npx ts-node -r tsconfig-paths/register src/scripts/link-admin-to-master.ts rykon admin@rykon.com.br
 *
 *   # Vincular por ID
 *   npx ts-node -r tsconfig-paths/register src/scripts/link-admin-to-master.ts rykon uuid-aqui
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

const SCHEMA = process.argv[2];
const IDENTIFIER = process.argv[3]; // email ou UUID

if (!SCHEMA) {
  console.error('\n❌ Uso: npx ts-node src/scripts/link-admin-to-master.ts <schema> [email_ou_uuid]');
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
  await ds.query(`SET search_path TO "${SCHEMA}", public`);

  try {
    // ── Buscar perfil master ──────────────────────────────────────────────────
    const masterPerfil = await ds.query(
      `SELECT id, nome FROM "${SCHEMA}".perfis WHERE LOWER(nome) = 'master' LIMIT 1`,
    );

    if (!masterPerfil || masterPerfil.length === 0) {
      console.error(`\n❌ Perfil master não encontrado em '${SCHEMA}'.perfis`);
      console.error(`   Execute primeiro: npx ts-node src/scripts/fix-rykon-enums.ts ${SCHEMA}`);
      process.exit(1);
    }

    const masterPerfilId = masterPerfil[0].id;
    console.log(`\n🔑 Perfil master: ${masterPerfilId}`);

    // ── Modo diagnóstico: listar todos os usuários do schema ─────────────────
    const usuarios = await ds.query(`
      SELECT
        u.id,
        u.username,
        u.email,
        u.ativo,
        u.created_at,
        COALESCE(
          json_agg(p.nome ORDER BY p.nome) FILTER (WHERE p.id IS NOT NULL),
          '[]'::json
        ) AS perfis
      FROM "${SCHEMA}".usuarios u
      LEFT JOIN "${SCHEMA}".usuario_perfis up ON up.usuario_id = u.id
      LEFT JOIN "${SCHEMA}".perfis p ON p.id = up.perfil_id
      GROUP BY u.id, u.username, u.email, u.ativo, u.created_at
      ORDER BY u.created_at
    `);

    console.log(`\n📋 Usuários em '${SCHEMA}' (${usuarios.length} total):\n`);
    console.table(
      usuarios.map((u: any) => ({
        email: u.email,
        username: u.username,
        ativo: u.ativo,
        perfis: Array.isArray(u.perfis) ? u.perfis.join(', ') : u.perfis,
        id: u.id,
      })),
    );

    // ── Se um identificador foi passado, vincular ao master ───────────────────
    if (!IDENTIFIER) {
      console.log(`\n💡 Para vincular um usuário ao perfil master, passe o email ou UUID como segundo argumento:`);
      console.log(`   npx ts-node src/scripts/link-admin-to-master.ts ${SCHEMA} <email_ou_uuid>\n`);
      return;
    }

    // Detectar se é UUID ou email
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let usuario: any;

    if (uuidRegex.test(IDENTIFIER)) {
      const result = await ds.query(
        `SELECT id, username, email FROM "${SCHEMA}".usuarios WHERE id = $1 LIMIT 1`,
        [IDENTIFIER],
      );
      usuario = result[0];
    } else {
      const result = await ds.query(
        `SELECT id, username, email FROM "${SCHEMA}".usuarios WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [IDENTIFIER],
      );
      usuario = result[0];
    }

    if (!usuario) {
      console.error(`\n❌ Usuário não encontrado: ${IDENTIFIER}`);
      process.exit(1);
    }

    console.log(`\n🔗 Vinculando '${usuario.email}' ao perfil master...`);

    await ds.query(
      `INSERT INTO "${SCHEMA}".usuario_perfis (usuario_id, perfil_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [usuario.id, masterPerfilId],
    );

    // Garantir que está ativo
    await ds.query(
      `UPDATE "${SCHEMA}".usuarios SET ativo = true WHERE id = $1`,
      [usuario.id],
    );

    console.log(`✅ Usuário '${usuario.email}' vinculado ao perfil master e ativado em '${SCHEMA}'.\n`);
    console.log(`⚠️  O usuário precisa fazer login novamente para o JWT ser renovado com os novos perfis.\n`);
  } catch (err) {
    console.error('\n❌ Erro:', err);
    throw err;
  } finally {
    await ds.destroy();
  }
}

run().catch(() => process.exit(1));
