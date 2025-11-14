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
    // Verifica conexão
    await transporter.verify();

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
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testEmail();
