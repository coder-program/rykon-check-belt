import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
  ValidationPipe as NestValidationPipe,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';

@Injectable()
export class CustomValidationPipe
  extends NestValidationPipe
  implements PipeTransform<any>
{
  constructor() {
    super({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const translatedErrors = this.translateErrors(errors);
        return new BadRequestException({
          message: 'Dados de entrada inválidos',
          errors: translatedErrors,
        });
      },
    });
  }

  private translateErrors(errors: ValidationError[]): any[] {
    return errors.map((error) => {
      const translatedConstraints: { [key: string]: string } = {};

      if (error.constraints) {
        Object.keys(error.constraints).forEach((key) => {
          translatedConstraints[key] = this.translateConstraint(
            key,
            error.constraints![key],
            error.property,
          );
        });
      }

      return {
        property: error.property,
        value: error.value,
        constraints: translatedConstraints,
        children: error.children
          ? this.translateErrors(error.children)
          : undefined,
      };
    });
  }

  private translateConstraint(
    constraint: string,
    message: string,
    property: string,
  ): string {
    // Traduções específicas por tipo de constraint
    const translations: { [key: string]: string } = {
      // Length constraints
      isLength: `${property} deve ter entre $constraint1 e $constraint2 caracteres`,
      minLength: `${property} deve ter pelo menos $constraint1 caracteres`,
      maxLength: `${property} deve ter no máximo $constraint1 caracteres`,

      // String constraints
      isString: `${property} deve ser uma string`,
      isNotEmpty: `${property} não pode estar vazio`,
      isOptional: `${property} é opcional`,

      // Number constraints
      isInt: `${property} deve ser um número inteiro`,
      isNumber: `${property} deve ser um número`,
      min: `${property} deve ser maior ou igual a $constraint1`,
      max: `${property} deve ser menor ou igual a $constraint1`,

      // Email constraint
      isEmail: `${property} deve ser um email válido`,

      // Enum constraint
      isEnum: `${property} deve ser um dos seguintes valores: $constraint1`,

      // Pattern/Matches constraint
      matches: this.getMatchesMessage(property, message),

      // URL constraint
      isUrl: `${property} deve ser uma URL válida`,

      // Boolean constraint
      isBoolean: `${property} deve ser um valor booleano`,

      // Object constraint
      isObject: `${property} deve ser um objeto`,

      // Array constraint
      isArray: `${property} deve ser um array`,
    };

    // Se já tem uma mensagem personalizada em português, usa ela
    if (message && message.includes('deve')) {
      return message;
    }

    // Tenta encontrar uma tradução
    const translation = translations[constraint];
    if (translation) {
      // Substitui os placeholders pelos valores reais se existirem
      return this.replacePlaceholders(translation, message);
    }

    // Se não encontrou tradução, retorna a mensagem original ou uma padrão
    return message || `${property} tem um valor inválido`;
  }

  private getMatchesMessage(property: string, originalMessage: string): string {
    // Traduções específicas para diferentes padrões
    const propertyTranslations: { [key: string]: string } = {
      cnpj: 'CNPJ deve conter exatamente 14 dígitos',
      cpf: 'CPF deve conter exatamente 11 dígitos',
      responsavel_cpf: 'CPF deve conter exatamente 11 dígitos',
      inscricao_estadual: 'Inscrição estadual deve conter apenas números',
      inscricao_municipal: 'Inscrição municipal deve conter apenas números',
      nome: 'Nome deve conter apenas letras, espaços e caracteres especiais permitidos',
      razao_social:
        'Razão social deve conter apenas letras, espaços e caracteres especiais permitidos',
      nome_fantasia:
        'Nome fantasia deve conter apenas letras, espaços e caracteres especiais permitidos',
      responsavel_nome:
        'Nome do responsável deve conter apenas letras, espaços e caracteres especiais permitidos',
      responsavel_cargo:
        'Cargo deve conter apenas letras, espaços e caracteres especiais permitidos',
    };

    return (
      propertyTranslations[property] ||
      `${property} não atende ao formato esperado`
    );
  }

  private replacePlaceholders(
    template: string,
    originalMessage: string,
  ): string {
    // Extrai números da mensagem original para substituir placeholders
    const numbers = originalMessage.match(/\d+/g);
    let result = template;

    if (numbers) {
      numbers.forEach((num, index) => {
        result = result.replace(`$constraint${index + 1}`, num);
      });
    }

    return result;
  }
}
