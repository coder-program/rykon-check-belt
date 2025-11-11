const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'techrykon@gmail.com',
    pass: 'pdurdvdjnkrfekph', // Senha de app do Gmail (nova)
  },
  debug: true, // Ativa logs detalhados
  logger: true, // Mostra todas as comunicações SMTP
});

async function testEmail() {
  try {
    console.log('🔍 Testando conexão SMTP...');

    // Verifica conexão
    await transporter.verify();
    console.log('✅ Conexão SMTP OK!');

    console.log('\n📧 Enviando email de teste...');

    // Envia email de teste
    const info = await transporter.sendMail({
      from: '"Team Cruz Test" <techrykon@gmail.com>',
      to: 'techrykon@gmail.com',
      subject: 'Teste de Email - Team Cruz',
      html: `
        <h1>Teste de Email</h1>
        <p>Se você recebeu este email, a configuração SMTP está funcionando! 🎉</p>
        <p>Data: ${new Date().toLocaleString('pt-BR')}</p>
      `,
    });

    console.log('✅ Email enviado com sucesso!');
    console.log('📬 Message ID:', info.messageId);
    console.log('\n✅ Verifique sua caixa de entrada: techrykon@gmail.com');
  } catch (error) {
    console.error('❌ Erro:', error.message);

    if (error.code === 'EAUTH') {
      console.log('\n⚠️  ERRO DE AUTENTICAÇÃO!');
      console.log('Possíveis causas:');
      console.log('1. Senha de app incorreta');
      console.log('2. Verificação em 2 etapas não ativada');
      console.log('3. Senha de app foi revogada');
      console.log('\n🔧 Solução:');
      console.log('1. Acesse: https://myaccount.google.com/apppasswords');
      console.log('2. Gere uma nova senha de app');
      console.log('3. Atualize no arquivo .env');
    }
  }
}

testEmail();
