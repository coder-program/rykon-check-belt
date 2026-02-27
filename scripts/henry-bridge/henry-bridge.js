/**
 * Henry TCP Bridge - Rykon Check Belt
 * 
 * Este script roda como SERVIDOR TCP no PC local (192.168.100.61).
 * A catraca Henry se conecta NESTE servidor quando reconhece uma biometria.
 * 
 * Arquitetura:
 *   [Catraca Henry] ---conecta---> [Este servidor no PC :3000] ---HTTPS---> [Backend Railway]
 * 
 * Na catraca está configurado:
 *   Endereço Servidor: 192.168.100.061  ← aponta para este PC
 *   TCP Mode: Modo Servidor             ← a catraca tem seu próprio servidor TCP
 *   Biometria online: Habilitada        ← envia eventos online para o endereço do servidor
 */

const net = require('net');
const https = require('https');
const http = require('http');

// ============================================================
// CONFIGURAÇÃO - EDITE AQUI
// ============================================================
const CONFIG = {
  // Porta onde este servidor vai escutar (catraca vai conectar aqui)
  servidor: {
    porta: 3000,
  },

  // URL do backend no Railway
  backend: {
    url: 'https://rykon-check-belt-production.up.railway.app',
    endpoint: '/api/catraca/webhook',
    api_key: 'chave_secreta_henry8x_itapevi',
  },

  // ID da unidade no sistema
  unidade_id: '8863d9de-b350-4c8f-a930-726b1df3261f',

  // Timeout para chamar o backend (ms)
  backend_timeout_ms: 4000,
};
// ============================================================

// Formato padrão Henry: %IIIIIIIII[%CCC[%RRRRRRRRRRRRRRRRRRRR[%DD/%MM/%AAAA %hh:%mm:%ss[%O[%S}%FFF[%TT[%o
// Exemplo:              000000594[000[               000001[19/02/2026 17:31:56[1[1}000[03[1
//
// Tokens:
//  I = índice do evento
//  C = código de acesso
//  R/U = matrícula do usuário
//  D/M/A = data
//  h/m/s = hora
//  O = direção (1=entrada, 2=saída)
//  S = acesso (1=liberado, 0=negado)
//  F = função
//  T = tipo de entrada
//  o = flag online (1=já foi validado online, 0=offline)

function parseHenryEvent(linha) {
  try {
    // Remove espaços e quebras de linha
    linha = linha.trim();
    if (!linha) return null;

    // Separador principal é '['
    const partes = linha.split('[');
    if (partes.length < 6) return null;

    const index = partes[0]?.trim();
    const codigo = partes[1]?.trim();
    const matricula = partes[2]?.trim(); // pode ter espaços na frente
    const dataHora = partes[3]?.trim();
    const direcao = partes[4]?.trim();
    
    // Parte 5 pode ser "1}000" (acesso + função separados por '}')
    const acessoFuncao = partes[5]?.split('}');
    const acesso = acessoFuncao?.[0]?.trim();
    const funcao = acessoFuncao?.[1]?.trim();

    const tipoOnline = partes[6]?.split('[');

    return {
      index: index?.replace(/^0+/, '') || '0',
      codigo,
      matricula: matricula?.trim(),
      dataHora,
      direcao: direcao === '1' ? 'ENTRADA' : direcao === '2' ? 'SAIDA' : direcao,
      acesso: acesso === '1' ? 'LIBERADO' : acesso === '0' ? 'NEGADO' : acesso,
      funcao,
      raw: linha,
    };
  } catch (err) {
    return { raw: linha, erro: err.message };
  }
}

let tentativasConexao = 0;
let eventosProcessados = 0;
let clientesConectados = 0;

function log(msg, meta) {
  const ts = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  if (meta) {
    console.log(`[${ts}] ${msg}`, meta);
  } else {
    console.log(`[${ts}] ${msg}`);
  }
}

function sep() {
  console.log('-------------------------------------------------------');
}

function chamarBackend(matricula) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      matricula: matricula,
      unidade_id: CONFIG.unidade_id,
      dispositivo_id: `HENRY_192.168.100.163`,
      api_key: CONFIG.backend.api_key,
      timestamp: new Date().toISOString(),
    });

    const urlCompleta = CONFIG.backend.url + CONFIG.backend.endpoint;
    log(`🌐 Chamando backend: POST ${urlCompleta}`);
    log(`📤 Payload enviado: ${payload}`);

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
      timeout: CONFIG.backend_timeout_ms,
      rejectUnauthorized: false, // Railway pode usar cert auto-assinado na chain
    };

    log(`🔧 Opções HTTP: host=${options.hostname} porta=${options.port} protocolo=${isHttps ? 'HTTPS' : 'HTTP'}`);

    const lib = isHttps ? https : http;
    const req = lib.request(options, (res) => {
      log(`📨 Resposta HTTP status: ${res.statusCode} ${res.statusMessage}`);
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
        log(`📨 Chunk recebido (${chunk.length} bytes)`);
      });
      res.on('end', () => {
        log(`📨 Resposta completa do backend: ${data}`);
        try {
          const json = JSON.parse(data);
          log(`📨 JSON parseado: liberar=${json.liberar_catraca} | msg=${json.mensagem_display || json.message}`);
          resolve(json);
        } catch (e) {
          log(`❌ Erro ao parsear JSON do backend: ${e.message} | raw: ${data}`);
          resolve({ success: false, liberar_catraca: false, mensagem_display: 'ERRO JSON' });
        }
      });
    });

    req.on('error', (err) => {
      log(`❌ Erro na requisição HTTP para o backend: ${err.message}`);
      log(`❌ Código do erro: ${err.code || 'N/A'}`);
      resolve({ success: false, liberar_catraca: false, mensagem_display: 'SEM CONEXAO' });
    });

    req.on('timeout', () => {
      req.destroy();
      log(`⏱️ Timeout (${CONFIG.backend_timeout_ms}ms) ao chamar backend - sem resposta`);
      resolve({ success: false, liberar_catraca: false, mensagem_display: 'TIMEOUT' });
    });

    req.write(payload);
    req.end();
    log(`📤 Requisição enviada, aguardando resposta...`);
  });
}

async function processarLinha(linha, socket) {
  sep();
  log(`📥 Nova linha recebida da catraca:`);
  log(`   RAW: "${linha}"`);

  const evento = parseHenryEvent(linha);
  if (!evento) {
    log(`⚠️ Linha não pôde ser parseada - ignorando`);
    return;
  }

  log(`📋 Evento parseado:`);
  log(`   Índice:   ${evento.index}`);
  log(`   Matrícula: "${evento.matricula}"`);
  log(`   Data/Hora: ${evento.dataHora}`);
  log(`   Direção:  ${evento.direcao}`);
  log(`   Acesso:   ${evento.acesso}`);
  if (evento.erro) log(`   ⚠️ Erro parse: ${evento.erro}`);

  eventosProcessados++;
  log(`📊 Total de eventos processados até agora: ${eventosProcessados}`);

  const matricula = evento.matricula;
  if (!matricula || matricula === '0' || matricula.replace(/0/g, '') === '') {
    log(`⚠️ Matrícula inválida ou vazia: "${matricula}" - respondendo liberar e ignorando`);
    socket.write('\x01');
    return;
  }

  log(`🔍 Consultando backend para matrícula: "${matricula}"`);

  const resposta = await chamarBackend(matricula);

  if (resposta.liberar_catraca) {
    log(`✅ DECISÃO: LIBERAR CATRACA`);
    log(`   Aluno:    ${resposta.nome_aluno || '(não informado)'}`);
    log(`   Display:  ${resposta.mensagem_display || ''}`);
    log(`   Tempo:    ${resposta.tempo_liberacao_segundos || 6}s`);
    log(`📤 Enviando byte 0x01 (LIBERAR) para a catraca...`);
    socket.write('\x01');
    log(`✅ Byte de liberação enviado!`);
  } else {
    log(`🚫 DECISÃO: BLOQUEAR CATRACA`);
    log(`   Motivo: ${resposta.message || resposta.mensagem_display || 'Acesso negado'}`);
    log(`📤 Enviando byte 0x00 (BLOQUEAR) para a catraca...`);
    socket.write('\x00');
    log(`🚫 Byte de bloqueio enviado!`);
  }
  sep();
}

function iniciarServidor() {
  const server = net.createServer((socket) => {
    clientesConectados++;
    sep();
    log(`✅ CATRACA CONECTOU no servidor!`);
    log(`   IP da catraca: ${socket.remoteAddress}:${socket.remotePort}`);
    log(`   Clientes conectados: ${clientesConectados}`);
    log(`👂 Aguardando eventos biométricos da catraca...`);
    sep();

    let bufferCliente = '';

    socket.on('data', (data) => {
      log(`📡 ---- DADOS RECEBIDOS DA CATRACA ----`);
      log(`📡 Tamanho: ${data.length} bytes`);
      log(`📡 HEX:     ${data.toString('hex')}`);
      log(`📡 UTF8:    ${JSON.stringify(data.toString('utf8'))}`);

      bufferCliente += data.toString('utf8');
      log(`📡 Buffer atual (${bufferCliente.length} chars): ${JSON.stringify(bufferCliente)}`);

      const linhas = bufferCliente.split(/\r?\n/);
      bufferCliente = linhas.pop() || '';

      log(`📡 Linhas completas para processar: ${linhas.filter(l => l.trim()).length}`);
      if (bufferCliente) log(`📡 Buffer restante (incompleto): ${JSON.stringify(bufferCliente)}`);

      for (const linha of linhas) {
        if (linha.trim()) {
          processarLinha(linha, socket).catch((err) => {
            log(`❌ Erro ao processar linha: ${err.message}`);
            log(`❌ Stack: ${err.stack}`);
          });
        }
      }
    });

    socket.on('error', (err) => {
      log(`❌ Erro no socket da catraca: ${err.message} (${err.code || 'N/A'})`);
    });

    socket.on('close', (hadError) => {
      clientesConectados--;
      log(`🔴 Catraca desconectou. hadError=${hadError} | Clientes restantes: ${clientesConectados}`);
    });

    socket.on('end', () => {
      log(`🟡 Catraca encerrou a conexão`);
    });
  });

  server.on('error', (err) => {
    log(`❌ ERRO no servidor TCP: ${err.message}`);
    if (err.code === 'EADDRINUSE') {
      log(`   ℹ️  Porta ${CONFIG.servidor.porta} já está em uso!`);
      log(`   ℹ️  Verifique se outro programa (NextFit?) está usando esta porta.`);
      log(`   ℹ️  Feche o outro programa e reinicie este script.`);
    }
  });

  server.listen(CONFIG.servidor.porta, '0.0.0.0', () => {
    sep();
    log(`🟢 SERVIDOR TCP INICIADO!`);
    log(`   Escutando na porta: ${CONFIG.servidor.porta}`);
    log(`   Endereço: 0.0.0.0:${CONFIG.servidor.porta} (aceita de qualquer IP)`);
    log(`   Na catraca deve estar configurado:`);
    log(`     Endereço Servidor: 192.168.100.61`);
    log(`     Biometria online: Habilitada`);
    log(`⏳ Aguardando a catraca se conectar...`);
    sep();
  });
}

// ============================================================
// INÍCIO
// ============================================================
log(`=======================================================`);
log(`   Henry Bridge - Rykon Check Belt`);
log(`=======================================================`);
log(`Servidor local: porta ${CONFIG.servidor.porta}`);
log(`Backend: ${CONFIG.backend.url}`);
log(`Unidade: ${CONFIG.unidade_id}`);
log(`=======================================================`);

iniciarServidor();
