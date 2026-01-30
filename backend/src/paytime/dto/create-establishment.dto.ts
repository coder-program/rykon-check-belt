import { IsString, IsEmail, IsOptional, IsNumber, IsBoolean, IsEnum, ValidateNested, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';
import { Type } from 'class-transformer';

enum EstablishmentType {
  BUSINESS = 'BUSINESS',
  INDIVIDUAL = 'INDIVIDUAL',
}

enum FormatType {
  LTDA = 'LTDA',
  SA = 'SA',
  ME = 'ME',
  MEI = 'MEI',
  EI = 'EI',
  EIRELI = 'EIRELI',
  SLU = 'SLU',
  ESI = 'ESI',
  SS = 'SS',
  SC = 'SC',
  SPE = 'SPE',
}

class ResponsibleDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(11)
  @MaxLength(11)
  @Matches(/^\d{11}$/, { message: 'CPF deve ter 11 dígitos' })
  document: string;

  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(11)
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data deve estar no formato YYYY-MM-DD' })
  birthdate: string;
}

class AddressDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(8)
  @Matches(/^\d{8}$/, { message: 'CEP deve ter 8 dígitos' })
  zip_code: string;

  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  number: string;

  @IsString()
  @IsOptional()
  complement?: string;

  @IsString()
  @IsNotEmpty()
  neighborhood: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(2)
  @Matches(/^[A-Z]{2}$/, { message: 'Estado deve ser sigla com 2 letras maiúsculas' })
  state: string;
}

export class CreateEstablishmentDto {
  @IsEnum(EstablishmentType)
  @IsNotEmpty()
  type: EstablishmentType;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{11}$|^\d{14}$/, { message: 'Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos' })
  document: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(11)
  phone_number: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(7)
  @MaxLength(7)
  @Matches(/^\d{7}$/, { message: 'CNAE deve ter 7 dígitos' })
  cnae: string;

  @IsEnum(FormatType)
  @IsNotEmpty()
  format: FormatType;

  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data deve estar no formato YYYY-MM-DD' })
  birthdate?: string;

  @IsNumber()
  @IsOptional()
  revenue?: number;

  @IsNumber()
  @IsOptional()
  gmv?: number;

  @IsNumber()
  @IsOptional()
  activity_id?: number;

  @IsNumber()
  @IsOptional()
  representative_id?: number;

  @IsBoolean()
  @IsOptional()
  visited?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;

  @ValidateNested()
  @Type(() => ResponsibleDto)
  @IsNotEmpty()
  responsible: ResponsibleDto;

  @ValidateNested()
  @Type(() => AddressDto)
  @IsNotEmpty()
  address: AddressDto;
}
