/**
 * Simulador da Catraca Henry - Teste Local
 * 
 * Este script simula a catraca enviando um evento para o bridge.
 * Rode PRIMEIRO o henry-bridge.js, depois rode este script.
 * 
 * Uso:
 *   node testar-local.js           → testa matrícula 000001 (padrão)
 *   node testar-local.js 325417    → testa matrícula específica
 */

const net = require('net');

// Matrícula a testar (pode passar como argumento: node testar-local.js 325417)
const matricula = process.argv[2] || '000001';

// Porta onde o bridge está escutando
const PORTA = 3000;
const HOST = '127.0.0.1';

// Formato Henry: índice[codigo[matricula           [DD/MM/AAAA hh:mm:ss[direcao[acesso}funcao[tipo[online
function gerarEventoHenry(mat) {
  const agora = new Date();
  const d = String(agora.getDate()).padStart(2, '0');
  const m = String(agora.getMonth() + 1).padStart(2, '0');
  const a = agora.getFullYear();
  const h = String(agora.getHours()).padStart(2, '0');
  const min = String(agora.getMinutes()).padStart(2, '0');
  const s = String(agora.getSeconds()).padStart(2, '0');

  const indice = '000001597';
  const codigo = '000';
  const matFormatada = mat.padStart(20, ' ');
  const dataHora = `${d}/${m}/${a} ${h}:${min}:${s}`;
  const direcao = '1'; // 1 = entrada
  const acesso = '1'; // 1 = liberado
  const funcao = '000';
  const tipo = '03';
  const online = '0';

  return `${indice}[${codigo}[${matFormatada}[${dataHora}[${direcao}[${acesso}}${funcao}[${tipo}[${online}\n`;
}

const evento = gerarEventoHenry(matricula);

console.log('=======================================================');
console.log('   Simulador de Catraca Henry - Teste Local');
console.log('=======================================================');
console.log(`Conectando no bridge em ${HOST}:${PORTA}...`);
console.log(`Matrícula a testar: ${matricula}`);
console.log(`Evento que será enviado:`);
console.log(`  ${JSON.stringify(evento)}`);
console.log('=======================================================');

const socket = net.connect(PORTA, HOST, () => {
  console.log(`✅ Conectado no bridge!`);
  console.log(`📤 Enviando evento da catraca...`);
  socket.write(evento);
  console.log(`📤 Evento enviado! Aguardando resposta do bridge...`);
});

socket.on('data', (data) => {
  const hex = data.toString('hex');
  console.log('');
  console.log('📨 Resposta do bridge recebida:');
  console.log(`   HEX: ${hex}`);
  if (hex === '01') {
    console.log('   ✅ RESULTADO: LIBERAR CATRACA (0x01)');
  } else if (hex === '00') {
    console.log('   🚫 RESULTADO: BLOQUEAR CATRACA (0x00)');
  } else {
    console.log(`   ❓ RESULTADO DESCONHECIDO: ${hex}`);
  }
  console.log('');
  socket.destroy();
});

socket.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    console.error('');
    console.error('❌ ERRO: Não conseguiu conectar no bridge!');
    console.error('   Certifique-se que o henry-bridge.js está rodando PRIMEIRO.');
    console.error('   Execute: node henry-bridge.js');
  } else {
    console.error(`❌ Erro: ${err.message}`);
  }
});

socket.on('close', () => {
  console.log('Conexão encerrada. Teste finalizado.');
});

// Timeout de segurança
setTimeout(() => {
  console.log('⏱️ Timeout - sem resposta após 6 segundos');
  socket.destroy();
}, 6000);
