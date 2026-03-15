#!/usr/bin/env node
/**
 * IDFACE Bridge - Rykon Check Belt
 *
 * Roda num PC local na mesma rede da academia.
 * Faz polling na API REST da catraca IDFACE (Control iD / ZKTeco iDFace),
 * detecta novos acessos e envia o CPF para o backend Railway.
 *
 * Arquitetura:
 *   [Catraca IDFACE] <--polling REST-- [Este script no PC local] --HTTPS--> [Backend Railway]
 *
 * NÃO precisa configurar nada na catraca — ela só precisa ser acessível na rede local.
 *
 * Uso:
 *   node idface-bridge.js
 */

const http = require('http');
const https = require('https');

// ============================================================
// CONFIGURAÇÃO — edite aqui conforme necessário
// ============================================================
const CONFIG = {
  // Dados da catraca IDFACE (rede local)
  catraca: {
    ip: '192.168.100.129',
    porta: 80,
    usuario: 'admin',
    senha: 'admin',
    // Intervalo de polling em ms (3 segundos é seguro)
    intervalo_polling_ms: 3000,
  },

  // Backend — local ou produção
  // Para testar local:   BACKEND_URL=http://localhost:8080 node idface-bridge.js
  // Para produção:       BACKEND_URL=https://rykon-check-belt-production.up.railway.app node idface-bridge.js
  backend: {
    url: process.env.BACKEND_URL || 'https://rykon-check-belt-production.up.railway.app',
    endpoint: '/api/catraca/webhook',
    api_key: undefined, // não há api_key configurada nesta unidade
    timeout_ms: 6000,
  },

  // Unidade no sistema
  unidade_id: '8863d9de-b350-4c8f-a930-726b1df3261f', // Team Cruz Itapevi
};
// ============================================================

let sessionId = null;             // session da API do IDFACE
let ultimoEventoId = null;        // ID do último evento processado
let eventosEnviados = 0;
let errosConsecutivos = 0;

function log(msg) {
  const ts = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  console.log(`[${ts}] ${msg}`);
}

function sep() {
  console.log('-'.repeat(60));
}

// ─── API IDFACE (Control iD REST) ────────────────────────────────────────────

/**
 * Faz uma requisição HTTP POST para a API REST da catraca.
 * qs = query string adicional (ex: 'session=XXX') — obrigatório para load_objects.fcgi
 */
function reqCatraca(path, body, qs) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const fullPath = qs ? `${path}?${qs}` : path;
    const options = {
      hostname: CONFIG.catraca.ip,
      port: CONFIG.catraca.porta,
      path: fullPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ _raw: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout na catraca'));
    });

    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * Login na API Control iD (iDFace).
 * POST /login.fcgi  {"login":"admin","password":"admin"}  →  {"session":"XXX"}
 */
async function loginCatraca() {
  log(`🔑 Fazendo login na catraca ${CONFIG.catraca.ip}:${CONFIG.catraca.porta}...`);

  const r = await reqCatraca('/login.fcgi', {
    login: CONFIG.catraca.usuario,
    password: CONFIG.catraca.senha,
  });

  if (r.session) {
    log(`✅ Login OK — session: ${r.session}`);
    return r.session;
  }

  throw new Error(`Login falhou. Resposta: ${JSON.stringify(r)}`);
}

/**
 * Busca novos eventos de acesso do Control iD iDFace.
 * Usa load_objects.fcgi com tabela 'access_logs' e filtra por id > ultimoEventoId.
 * A session deve ser passada como query param (?session=XXX).
 *
 * Campo user_id no access_log = CPF do aluno (11 dígitos).
 */
async function buscarEventosControlId(session, ultimoId) {
  const qs = 'session=' + encodeURIComponent(session);

  let body;
  if (ultimoId !== null && ultimoId !== undefined) {
    // Filtra apenas eventos com id > ultimoId
    body = {
      object: 'access_logs',
      where: [{ field: 'id', operator: '>', value: Number(ultimoId) }],
    };
  } else {
    // Primeira chamada — busca tudo para encontrar o maior id (serão ignorados)
    body = { object: 'access_logs' };
  }

  const r = await reqCatraca('/load_objects.fcgi', body, qs);

  if (r.error) {
    // Sessão expirou ou sem permissão → força novo login
    if (String(r.error).toLowerCase().includes('session') ||
        String(r.error).toLowerCase().includes('access level') ||
        String(r.error).toLowerCase().includes('invalid')) {
      throw new Error('Sessão expirada ou sem permissão: ' + r.error);
    }
    log(`⚠️ Erro ao buscar access_logs: ${r.error}`);
    return [];
  }

  return Array.isArray(r.access_logs) ? r.access_logs : [];
}

/**
 * Extrai o CPF de um evento access_log do Control iD.
 * O campo user_id contém o CPF como número inteiro (11 dígitos).
 */
function extrairCpf(evento) {
  if (evento.user_id) {
    const cpfStr = String(evento.user_id);
    if (cpfStr.length === 11) return cpfStr;
    // pode vir com menos dígitos se tiver zero à esquerda
    if (cpfStr.length > 0 && cpfStr.length <= 11) return cpfStr.padStart(11, '0');
  }
  return null;
}

function extrairNome(evento) {
  return evento.name || evento.user_name || null;
}

function extrairTimestamp(evento) {
  if (evento.time) {
    // time é Unix timestamp
    return new Date(evento.time * 1000).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  }
  return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

// ─── BACKEND RAILWAY ──────────────────────────────────────────────────────────

function chamarBackend(cpf, nome, dispositivo_id) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      cpf,
      unidade_id: CONFIG.unidade_id,
      dispositivo_id: dispositivo_id || `IDFACE_${CONFIG.catraca.ip}`,
      timestamp: new Date().toISOString(),
      ...(CONFIG.backend.api_key ? { api_key: CONFIG.backend.api_key } : {}),
    });

    const urlCompleta = CONFIG.backend.url + CONFIG.backend.endpoint;
    const isHttps = urlCompleta.startsWith('https://');
    const urlObj = new URL(urlCompleta);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: CONFIG.backend.timeout_ms,
      rejectUnauthorized: false,
    };

    const lib = isHttps ? https : http;
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (_) {
          resolve({ success: false, _raw: data });
        }
      });
    });

    req.on('error', (err) => {
      log(`❌ Erro ao chamar backend: ${err.message}`);
      resolve({ success: false, liberar_catraca: false });
    });
    req.on('timeout', () => {
      req.destroy();
      log(`⏱️ Timeout ao chamar backend`);
      resolve({ success: false, liberar_catraca: false });
    });

    req.write(payload);
    req.end();
  });
}

// ─── LOOP PRINCIPAL ───────────────────────────────────────────────────────────

async function processarEventos() {
  try {
    // Login ou reutiliza sessão
    if (!sessionId) {
      sessionId = await loginCatraca();
    }

    // Buscar apenas eventos novos (id > ultimoEventoId)
    const eventos = await buscarEventosControlId(sessionId, ultimoEventoId);

    if (!Array.isArray(eventos) || eventos.length === 0) {
      // A cada 30s mostra que está vivo
      if (Date.now() % 30000 < 3100) log(`⏳ Sem eventos novos — aguardando...`);
      return;
    }

    log(`📋 ${eventos.length} evento(s) na catraca — último ID conhecido: ${ultimoEventoId || 'nenhum'}`);

    for (const evento of eventos) {
      const id = evento.id || null;

      const cpf = extrairCpf(evento);
      const nome = extrairNome(evento);
      const ts = extrairTimestamp(evento);

      if (!cpf || cpf.replace(/\D/g, '').length !== 11) {
        log(`⚠️ Evento sem CPF válido (id=${id}) — RAW: ${JSON.stringify(evento)}`);
        ultimoEventoId = id;
        continue;
      }

      sep();
      log(`🚪 Novo acesso detectado!`);
      log(`   CPF:   ${cpf}`);
      log(`   Nome:  ${nome || '(não informado pela catraca)'}`);
      log(`   ID:    ${id}`);
      log(`   Hora:  ${ts}`);
      log(`🌐 Enviando para o backend...`);

      const resposta = await chamarBackend(cpf, nome, `IDFACE_${CONFIG.catraca.ip}`);

      log(`📨 Resposta do backend:`);
      log(`   success:          ${resposta.success}`);
      log(`   liberar_catraca:  ${resposta.liberar_catraca}`);
      log(`   nome_aluno:       ${resposta.nome_aluno || '(não retornado)'}`);
      log(`   mensagem_display: ${resposta.mensagem_display || ''}`);
      log(`   message:          ${resposta.message || ''}`);

      if (resposta.success) {
        eventosEnviados++;
        log(`✅ CHECK-IN REGISTRADO (total: ${eventosEnviados})`);
      } else {
        log(`🚫 Acesso não registrado: ${resposta.message || ''}`);
      }

      ultimoEventoId = id;
      errosConsecutivos = 0;
    }
  } catch (err) {
    errosConsecutivos++;
    log(`❌ Erro no polling (tentativa ${errosConsecutivos}): ${err.message}`);

    // Sessão expirou ou qualquer erro acumulado → refaz login no próximo ciclo
    if (errosConsecutivos >= 2 || err.message.includes('expirada') || err.message.includes('session') || err.message.includes('permissão')) {
      log(`🔄 Resetando sessão — novo login no próximo ciclo`);
      sessionId = null;
      errosConsecutivos = 0;
    }
  }
}

async function main() {
  sep();
  log('🚪 IDFACE BRIDGE — Rykon Check Belt');
  log(`📡 Catraca: http://${CONFIG.catraca.ip}:${CONFIG.catraca.porta}`);
  log(`🏢 Unidade: ${CONFIG.unidade_id} (Team Cruz Itapevi)`);
  log(`⏱️  Polling a cada ${CONFIG.catraca.intervalo_polling_ms / 1000}s`);
  log(`🌐 Backend: ${CONFIG.backend.url}`);
  sep();

  // Primeiro login
  try {
    sessionId = await loginCatraca();

    // Na inicialização: busca todos os eventos existentes e só registra o maior ID
    // para processar apenas eventos NOVOS a partir de agora
    const eventosAtuais = await buscarEventosControlId(sessionId, null);
    if (eventosAtuais.length > 0) {
      const ids = eventosAtuais.map(e => Number(e.id || 0)).filter(n => n > 0);
      ultimoEventoId = Math.max(...ids);
      log(`⏩ ${eventosAtuais.length} eventos existentes ignorados (último ID: ${ultimoEventoId})`);
    } else {
      ultimoEventoId = 0;
      log(`⏩ Nenhum evento anterior encontrado — monitorando a partir de agora`);
    }
    log(`✅ Bridge iniciada — aguardando acessos...`);
    sep();
  } catch (err) {
    log(`❌ FALHA NO INÍCIO: ${err.message}`);
    log(`   Verifique:`);
    log(`   1. PC está na mesma rede da catraca (192.168.100.x)?`);
    log(`   2. IP da catraca está correto: ${CONFIG.catraca.ip}`);
    log(`   3. Usuário/senha: ${CONFIG.catraca.usuario}/${CONFIG.catraca.senha}`);
    log(`   Tentando novamente em 10s...`);
    setTimeout(main, 10000);
    return;
  }

  // Loop de polling
  setInterval(() => {
    processarEventos().catch((err) => {
      log(`❌ Erro não tratado: ${err.message}`);
    });
  }, CONFIG.catraca.intervalo_polling_ms);
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
