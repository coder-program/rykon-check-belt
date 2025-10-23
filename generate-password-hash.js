const bcrypt = require("bcrypt");

const password = "teamcruz@rykon2025";
const saltRounds = 10;

// Gerar o hash
bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error("Erro ao gerar hash:", err);
    return;
  }

  // Verificar se o hash está correto
  bcrypt.compare(password, hash, (err, result) => {
    if (err) {
      console.error("Erro ao verificar:", err);
      return;
    }
  });
});
