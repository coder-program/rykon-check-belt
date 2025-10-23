import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsDateString,
  Matches,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsValidName } from '../../common/decorators/is-valid-name.decorator';

export class RegisterDto {
  @ApiProperty({ example: 'João da Silva' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @IsValidName()
  nome: string;

  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '00000000000' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{11}$/, {
    message: 'CPF deve conter exatamente 11 dígitos numéricos',
  })
  cpf: string;

  @ApiProperty({ example: 'senha123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: '(11) 99999-9999' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\(\d{2}\) \d{4,5}-\d{4}$/, {
    message: 'Telefone deve estar no formato (99) 99999-9999',
  })
  telefone: string;

  @ApiProperty({ example: '1990-01-01' })
  @IsDateString()
  @IsNotEmpty()
  data_nascimento: string;

  @ApiProperty({
    example: 'uuid-do-perfil',
    required: false,
    description: 'ID do perfil (padrão: aluno)',
  })
  @IsOptional()
  @IsUUID()
  perfil_id?: string;

  @ApiProperty({
    example: 'uuid-da-unidade',
    required: false,
    description: 'ID da unidade (obrigatório para ALUNO e RESPONSAVEL)',
  })
  @IsOptional()
  @IsUUID()
  unidade_id?: string;
}
