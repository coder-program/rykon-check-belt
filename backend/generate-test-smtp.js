// Script para gerar credenciais SMTP de teste (Ethereal Email)
// Execute: node generate-test-smtp.js

const nodemailer = require('nodemailer');

nodemailer.createTestAccount((err, account) => {
  if (err) {
    console.error('❌ Erro ao gerar credenciais:', err);
    process.exit(1);
  }
});
