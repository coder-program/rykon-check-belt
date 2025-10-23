import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendSupportEmailDto {
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @IsString({ message: 'Mensagem deve ser um texto' })
  @IsNotEmpty({ message: 'Mensagem é obrigatória' })
  @MaxLength(2000, { message: 'Mensagem muito longa (máximo 2000 caracteres)' })
  message: string;
}
