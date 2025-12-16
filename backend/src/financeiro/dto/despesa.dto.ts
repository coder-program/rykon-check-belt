import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsDateString,
  IsString,
  IsOptional,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import {
  CategoriaDespesa,
  RecorrenciaDespesa,
  StatusDespesa,
} from '../entities/despesa.entity';

// Validador customizado para garantir que a data está no ano vigente
function IsCurrentYear(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isCurrentYear',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return true; // Se não tem valor, deixa passar (é opcional)

          const dataSelecionada = new Date(value);
          const anoAtual = new Date().getFullYear();
          const anoSelecionado = dataSelecionada.getFullYear();

          // Verificar se é do ano atual
          if (anoSelecionado !== anoAtual) {
            return false;
          }

          // Verificar se não é futura
          if (dataSelecionada > new Date()) {
            return false;
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return 'A data de pagamento deve ser do ano vigente e não pode ser futura';
        },
      },
    });
  };
}

export class CreateDespesaDto {
  @IsUUID()
  unidade_id: string;

  @IsEnum(CategoriaDespesa)
  categoria: CategoriaDespesa;

  @IsString()
  descricao: string;

  @IsNumber()
  valor: number;

  @IsDateString()
  @IsCurrentYear({
    message: 'A data de vencimento deve ser do ano vigente',
  })
  data_vencimento: string;

  @IsOptional()
  @IsEnum(RecorrenciaDespesa)
  recorrencia?: RecorrenciaDespesa;

  @IsOptional()
  @IsString()
  fornecedor?: string;

  @IsOptional()
  @IsString()
  numero_documento?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class UpdateDespesaDto {
  @IsOptional()
  @IsEnum(CategoriaDespesa)
  categoria?: CategoriaDespesa;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsNumber()
  valor?: number;

  @IsOptional()
  @IsDateString()
  @IsCurrentYear({
    message: 'A data de vencimento deve ser do ano vigente',
  })
  data_vencimento?: string;

  @IsOptional()
  @IsEnum(RecorrenciaDespesa)
  recorrencia?: RecorrenciaDespesa;

  @IsOptional()
  @IsEnum(StatusDespesa)
  status?: StatusDespesa;

  @IsOptional()
  @IsString()
  fornecedor?: string;

  @IsOptional()
  @IsString()
  numero_documento?: string;

  @IsOptional()
  @IsString()
  anexo?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class BaixarDespesaDto {
  @IsOptional()
  @IsDateString()
  @IsCurrentYear({
    message:
      'A data de pagamento deve ser do ano vigente e não pode ser futura',
  })
  data_pagamento?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
