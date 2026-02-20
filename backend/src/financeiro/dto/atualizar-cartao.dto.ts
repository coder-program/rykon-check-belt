import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  ValidateNested,
  Matches,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CartaoDto {
  @ApiProperty({
    description: 'Número do cartão (sem espaços)',
    example: '5200000000001005',
  })
  @IsNotEmpty({ message: 'Número do cartão é obrigatório' })
  @IsString()
  @Matches(/^\d{13,19}$/, {
    message: 'Número do cartão inválido (13-19 dígitos)',
  })
  number: string;

  @ApiProperty({
    description: 'Nome impresso no cartão',
    example: 'João da Silva',
  })
  @IsNotEmpty({ message: 'Nome do titular é obrigatório' })
  @IsString()
  @Length(3, 100, {
    message: 'Nome do titular deve ter entre 3 e 100 caracteres',
  })
  holder_name: string;

  @ApiProperty({
    description: 'Mês de expiração (01-12)',
    example: '12',
  })
  @IsNotEmpty({ message: 'Mês de expiração é obrigatório' })
  @IsString()
  @Matches(/^(0[1-9]|1[0-2])$/, {
    message: 'Mês de expiração inválido (formato: 01-12)',
  })
  expiration_month: string;

  @ApiProperty({
    description: 'Ano de expiração (2024-2040)',
    example: '2026',
  })
  @IsNotEmpty({ message: 'Ano de expiração é obrigatório' })
  @IsString()
  @Matches(/^20\d{2}$/, {
    message: 'Ano de expiração inválido (formato: 2024)',
  })
  expiration_year: string;

  @ApiProperty({
    description: 'Código de segurança (CVV)',
    example: '123',
  })
  @IsNotEmpty({ message: 'CVV é obrigatório' })
  @IsString()
  @Matches(/^\d{3,4}$/, {
    message: 'CVV inválido (3 ou 4 dígitos)',
  })
  cvv: string;
}

export class EnderecoCobrancaDto {
  @ApiProperty({
    description: 'Nome da rua',
    example: 'Rua dos Desenvolvedores',
  })
  @IsNotEmpty({ message: 'Nome da rua é obrigatório' })
  @IsString()
  street: string;

  @ApiProperty({
    description: 'Número do endereço',
    example: '123',
  })
  @IsNotEmpty({ message: 'Número é obrigatório' })
  @IsString()
  number: string;

  @ApiProperty({
    description: 'Bairro',
    example: 'Centro',
  })
  @IsNotEmpty({ message: 'Bairro é obrigatório' })
  @IsString()
  neighborhood: string;

  @ApiProperty({
    description: 'Cidade',
    example: 'Vitória',
  })
  @IsNotEmpty({ message: 'Cidade é obrigatória' })
  @IsString()
  city: string;

  @ApiProperty({
    description: 'Estado (UF)',
    example: 'ES',
  })
  @IsNotEmpty({ message: 'Estado é obrigatório' })
  @IsString()
  @Matches(/^[A-Z]{2}$/, {
    message: 'Estado inválido (use UF em maiúsculas, ex: ES)',
  })
  state: string;

  @ApiProperty({
    description: 'CEP (somente números)',
    example: '29000000',
  })
  @IsNotEmpty({ message: 'CEP é obrigatório' })
  @IsString()
  @Matches(/^\d{8}$/, {
    message: 'CEP inválido (8 dígitos sem hífen)',
  })
  zip_code: string;

  @ApiProperty({
    description: 'Complemento (opcional)',
    example: 'Apto 101',
    required: false,
  })
  @IsOptional()
  @IsString()
  complement?: string;
}

export class AtualizarCartaoDto {
  @ApiProperty({
    description: 'Dados do novo cartão',
    type: CartaoDto,
  })
  @IsNotEmpty({ message: 'Dados do cartão são obrigatórios' })
  @ValidateNested()
  @Type(() => CartaoDto)
  card: CartaoDto;

  @ApiProperty({
    description: 'Endereço de cobrança',
    type: EnderecoCobrancaDto,
  })
  @IsNotEmpty({ message: 'Endereço de cobrança é obrigatório' })
  @ValidateNested()
  @Type(() => EnderecoCobrancaDto)
  billing_address: EnderecoCobrancaDto;

  @ApiProperty({
    description: 'Session ID do antifraude (opcional)',
    example: 'session-123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  session_id?: string;

  @ApiProperty({
    description: 'Tipo de antifraude (opcional)',
    example: 'CLEARSALE',
    enum: ['IDPAY', 'THREEDS', 'CLEARSALE'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^(IDPAY|THREEDS|CLEARSALE)$/, {
    message: 'Tipo de antifraude inválido (IDPAY, THREEDS ou CLEARSALE)',
  })
  antifraud_type?: 'IDPAY' | 'THREEDS' | 'CLEARSALE';
}
