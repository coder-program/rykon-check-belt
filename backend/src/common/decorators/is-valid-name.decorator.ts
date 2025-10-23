import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsValidName(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidName',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;

          // Permite apenas letras (incluindo acentos), espaços, hífens e apostrofos
          const nameRegex = /^[a-zA-ZÀ-ÿĀ-žА-я\s\-']+$/;
          return nameRegex.test(value.trim());
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} deve conter apenas letras e espaços`;
        },
      },
    });
  };
}
