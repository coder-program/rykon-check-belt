/**
 * Utilitários de validação para campos de nome
 */

/**
 * Valida se um nome contém apenas letras, espaços e acentos
 */
export function isValidName(name: string): boolean {
  if (!name || name.trim().length === 0) return false;

  // Regex que permite apenas letras (incluindo acentos), espaços e hífens
  const nameRegex = /^[a-zA-ZÀ-ÿĀ-žА-я\s\-']+$/;
  return nameRegex.test(name.trim());
}

/**
 * Sanitiza um nome removendo números e caracteres especiais
 */
export function sanitizeName(name: string): string {
  return name
    .replace(/[0-9!@#$%^&*()_+\=\[\]{};:"\\|,.<>\/?]/g, "") // Remove números e símbolos
    .replace(/\s+/g, " ") // Remove espaços duplos
    .trim(); // Remove espaços no início/fim
}

/**
 * Formata um nome com primeira letra maiúscula em cada palavra
 */
export function formatName(name: string): string {
  return sanitizeName(name)
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Validação completa de nome com mensagem de erro
 */
export function validateName(name: string): {
  isValid: boolean;
  message?: string;
} {
  if (!name || name.trim().length === 0) {
    return { isValid: false, message: "Nome é obrigatório" };
  }

  if (name.trim().length < 2) {
    return { isValid: false, message: "Nome deve ter pelo menos 2 caracteres" };
  }

  if (!isValidName(name)) {
    return {
      isValid: false,
      message: "Nome deve conter apenas letras e espaços",
    };
  }

  if (name.trim().length > 100) {
    return {
      isValid: false,
      message: "Nome deve ter no máximo 100 caracteres",
    };
  }

  return { isValid: true };
}
