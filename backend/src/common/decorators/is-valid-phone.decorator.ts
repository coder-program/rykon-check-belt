import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsValidPhoneConstraint implements ValidatorConstraintInterface {
  validate(phone: string, args: ValidationArguments) {
    if (!phone) return true; // Campo pode ser opcional, validação de obrigatório é feita por @IsNotEmpty

    // Remove tudo que não é dígito
    const cleaned = phone.replace(/\D/g, '');

    // Verifica se tem 10 ou 11 dígitos
    if (cleaned.length !== 10 && cleaned.length !== 11) {
      return false;
    }

    // Se tem 11 dígitos, deve ser celular (terceiro dígito deve ser 9)
    if (cleaned.length === 11 && cleaned[2] !== '9') {
      return false;
    }

    // Verifica se não são todos os dígitos iguais
    const allSame = cleaned.split('').every((digit) => digit === cleaned[0]);
    if (allSame) {
      return false;
    }

    // Verifica DDD válido (11 a 99)
    const ddd = parseInt(cleaned.substring(0, 2));
    if (ddd < 11 || ddd > 99) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const phone = args.value;
    if (!phone) return 'Telefone é obrigatório';

    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length < 10) {
      return 'Telefone deve ter pelo menos 10 dígitos (DDD + número)';
    }

    if (cleaned.length > 11) {
      return 'Telefone deve ter no máximo 11 dígitos';
    }

    if (cleaned.length === 11 && cleaned[2] !== '9') {
      return 'Número de celular deve começar com 9 após o DDD';
    }

    const allSame = cleaned.split('').every((digit) => digit === cleaned[0]);
    if (allSame) {
      return 'Telefone não pode ter todos os dígitos iguais';
    }

    const ddd = parseInt(cleaned.substring(0, 2));
    if (ddd < 11 || ddd > 99) {
      return 'DDD inválido (deve estar entre 11 e 99)';
    }

    return 'Telefone inválido';
  }
}

export function IsValidPhone(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidPhoneConstraint,
    });
  };
}
