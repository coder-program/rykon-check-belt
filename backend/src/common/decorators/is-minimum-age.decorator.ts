import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsMinimumAge(
  minAge: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isMinimumAge',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [minAge],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) {
            // Se não houver data, deixar outras validações tratarem
            return true;
          }

          const [minimumAge] = args.constraints;
          const birthDate = new Date(value);
          const today = new Date();

          // Calcular idade precisa
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();

          if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())
          ) {
            age--;
          }

          return age >= minimumAge;
        },
        defaultMessage(args: ValidationArguments) {
          const [minimumAge] = args.constraints;
          return `A pessoa deve ter pelo menos ${minimumAge} anos de idade`;
        },
      },
    });
  };
}
