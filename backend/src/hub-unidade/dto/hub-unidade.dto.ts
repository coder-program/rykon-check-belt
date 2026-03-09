import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, IsUUID, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// -------------------------- VÍDEOS --------------------------
export class CriarVideoDto {
  @ApiProperty() @IsUUID()  unidade_id!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID()  modalidade_id?: string;
  @ApiProperty() @IsString()  titulo!: string;
  @ApiProperty() @IsString()  url_youtube!: string;
  @ApiPropertyOptional() @IsOptional() @IsString()  descricao?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ativo?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber()  ordem?: number;
}

export class AtualizarVideoDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID()   modalidade_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() titulo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() url_youtube?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descricao?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean()ativo?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() ordem?: number;
}

// -------------------------- RECADOS --------------------------
export class CriarRecadoDto {
  @ApiProperty() @IsUUID()   unidade_id!: string;
  @ApiProperty() @IsString() titulo!: string;
  @ApiProperty() @IsString() mensagem!: string;
}

export class AtualizarRecadoDto {
  @ApiPropertyOptional() @IsOptional() @IsString()  titulo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()  mensagem?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ativo?: boolean;
}

// -------------------------- PRODUTOS --------------------------
export class CriarProdutoDto {
  @ApiProperty() @IsUUID()   unidade_id!: string;
  @ApiProperty() @IsString() nome!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descricao?: string;
  @ApiProperty() @IsNumber() preco!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() url_imagem?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(['LOCAL','GLOBAL']) visibilidade?: 'LOCAL' | 'GLOBAL';
  @ApiPropertyOptional() @IsOptional() @IsBoolean() permite_parcelamento?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) @Max(12) max_parcelas?: number;
  @ApiProperty() @IsNumber() @Min(0) estoque!: number;
}

export class AtualizarProdutoDto {
  @ApiPropertyOptional() @IsOptional() @IsString()  nome?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()  descricao?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber()  preco?: number;
  @ApiPropertyOptional() @IsOptional() @IsString()  url_imagem?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(['LOCAL','GLOBAL']) visibilidade?: 'LOCAL' | 'GLOBAL';
  @ApiPropertyOptional() @IsOptional() @IsBoolean() permite_parcelamento?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber()  max_parcelas?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber()  estoque?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ativo?: boolean;
}

// -------------------------- PEDIDOS --------------------------
export class ItemCarrinhoDto {
  @ApiProperty() @IsUUID()   produto_id!: string;
  @ApiProperty() @IsNumber() @Min(1) quantidade!: number;
}

export class CriarPedidoDto {
  @ApiProperty({ type: [ItemCarrinhoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemCarrinhoDto)
  itens!: ItemCarrinhoDto[];

  @ApiProperty({ enum: ['PIX','BOLETO','CARTAO'] })
  @IsEnum(['PIX','BOLETO','CARTAO'])
  metodo_pagamento!: 'PIX' | 'BOLETO' | 'CARTAO';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1) @Max(12)
  parcelas?: number;
}
