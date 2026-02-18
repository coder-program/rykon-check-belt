import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsIn, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBankAccountDto {
  @ApiProperty({ description: 'ID da unidade', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  unidadeId: string;

  @ApiProperty({ description: 'Código do banco (ex: 341=Itaú, 001=BB, 104=CEF)', example: '341' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  bancoCodigo: string;

  @ApiProperty({ description: 'Nome do banco', example: 'Itaú Unibanco' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bancoNome: string;

  @ApiProperty({ description: 'Número da agência', example: '1234' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  agencia: string;

  @ApiPropertyOptional({ description: 'Dígito da agência', example: '5' })
  @IsString()
  @IsOptional()
  @MaxLength(2)
  agenciaDigito?: string;

  @ApiProperty({ description: 'Número da conta', example: '12345-6' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  conta: string;

  @ApiProperty({ description: 'Dígito da conta', example: '6' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2)
  contaDigito: string;

  @ApiProperty({ description: 'Tipo da conta', enum: ['CORRENTE', 'POUPANCA'], example: 'CORRENTE' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['CORRENTE', 'POUPANCA'])
  tipo: 'CORRENTE' | 'POUPANCA';

  @ApiProperty({ description: 'Nome do titular', example: 'João da Silva' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  titularNome: string;

  @ApiProperty({ description: 'CPF ou CNPJ do titular', example: '123.456.789-00' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(18)
  @Matches(/^[0-9]{3}\.?[0-9]{3}\.?[0-9]{3}-?[0-9]{2}$|^[0-9]{2}\.?[0-9]{3}\.?[0-9]{3}\/?[0-9]{4}-?[0-9]{2}$/, {
    message: 'CPF ou CNPJ inválido',
  })
  titularCpfCnpj: string;

  @ApiPropertyOptional({ description: 'Marcar como conta principal', default: false })
  @IsBoolean()
  @IsOptional()
  principal?: boolean;
}

export class UpdateBankAccountDto {
  @ApiPropertyOptional({ description: 'Código do banco', example: '341' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  bancoCodigo?: string;

  @ApiPropertyOptional({ description: 'Nome do banco', example: 'Itaú Unibanco' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  bancoNome?: string;

  @ApiPropertyOptional({ description: 'Número da agência', example: '1234' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  agencia?: string;

  @ApiPropertyOptional({ description: 'Dígito da agência', example: '5' })
  @IsString()
  @IsOptional()
  @MaxLength(2)
  agenciaDigito?: string;

  @ApiPropertyOptional({ description: 'Número da conta', example: '12345-6' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  conta?: string;

  @ApiPropertyOptional({ description: 'Dígito da conta', example: '6' })
  @IsString()
  @IsOptional()
  @MaxLength(2)
  contaDigito?: string;

  @ApiPropertyOptional({ description: 'Tipo da conta', enum: ['CORRENTE', 'POUPANCA'] })
  @IsString()
  @IsOptional()
  @IsIn(['CORRENTE', 'POUPANCA'])
  tipo?: 'CORRENTE' | 'POUPANCA';

  @ApiPropertyOptional({ description: 'Nome do titular', example: 'João da Silva' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  titularNome?: string;

  @ApiPropertyOptional({ description: 'CPF ou CNPJ do titular', example: '123.456.789-00' })
  @IsString()
  @IsOptional()
  @MaxLength(18)
  titularCpfCnpj?: string;

  @ApiPropertyOptional({ description: 'Marcar como conta principal' })
  @IsBoolean()
  @IsOptional()
  principal?: boolean;

  @ApiPropertyOptional({ description: 'Ativar ou desativar conta' })
  @IsBoolean()
  @IsOptional()
  ativo?: boolean;
}
