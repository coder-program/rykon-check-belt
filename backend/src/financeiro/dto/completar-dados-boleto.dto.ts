import { IsString, IsNotEmpty, IsOptional, Length, Matches } from 'class-validator';

export class CompletarDadosBoletoDto {
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @IsString()
  @Length(11, 11, { message: 'CPF deve ter 11 dígitos' })
  @Matches(/^\d+$/, { message: 'CPF deve conter apenas números' })
  cpf: string;

  @IsNotEmpty({ message: 'CEP é obrigatório' })
  @IsString()
  @Length(8, 8, { message: 'CEP deve ter 8 dígitos' })
  @Matches(/^\d+$/, { message: 'CEP deve conter apenas números' })
  cep: string;

  @IsNotEmpty({ message: 'Logradouro é obrigatório' })
  @IsString()
  logradouro: string;

  @IsNotEmpty({ message: 'Número é obrigatório' })
  @IsString()
  numero: string;

  @IsOptional()
  @IsString()
  complemento?: string;

  @IsNotEmpty({ message: 'Bairro é obrigatório' })
  @IsString()
  bairro: string;

  @IsNotEmpty({ message: 'Cidade é obrigatória' })
  @IsString()
  cidade: string;

  @IsNotEmpty({ message: 'Estado é obrigatório' })
  @IsString()
  @Length(2, 2, { message: 'Estado deve ter 2 letras' })
  estado: string;

  @IsNotEmpty({ message: 'ID da fatura é obrigatório' })
  @IsString()
  faturaId: string;
}
