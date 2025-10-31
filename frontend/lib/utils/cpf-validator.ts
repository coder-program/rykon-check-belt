/**
 * Validador de CPF brasileiro
 * Verifica se o CPF está em formato válido e se os dígitos verificadores estão corretos
 */

export function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, "");
  return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

export function isValidCPF(cpf: string): boolean {
  const cleanedCPF = cleanCPF(cpf);

  // CPF deve ter exatamente 11 dígitos
  if (cleanedCPF.length !== 11) {
    return false;
  }

  // Verifica se todos os dígitos são iguais (CPFs inválidos conhecidos)
  if (/^(\d)\1{10}$/.test(cleanedCPF)) {
    return false;
  }

  // Validação dos dígitos verificadores
  let sum = 0;
  let remainder;

  // Validação do primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanedCPF.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  if (remainder !== parseInt(cleanedCPF.substring(9, 10))) {
    return false;
  }

  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanedCPF.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  if (remainder !== parseInt(cleanedCPF.substring(10, 11))) {
    return false;
  }

  return true;
}

export function getCPFValidationMessage(cpf: string): string | null {
  const cleanedCPF = cleanCPF(cpf);

  if (!cpf.trim()) {
    return "CPF é obrigatório";
  }

  if (cleanedCPF.length < 11) {
    return "CPF deve conter 11 dígitos";
  }

  if (cleanedCPF.length > 11) {
    return "CPF não pode ter mais de 11 dígitos";
  }

  if (/^(\d)\1{10}$/.test(cleanedCPF)) {
    return "CPF não pode ter todos os dígitos iguais";
  }

  if (!isValidCPF(cpf)) {
    return "CPF inválido - verifique os dígitos";
  }

  return null; // CPF válido
}
