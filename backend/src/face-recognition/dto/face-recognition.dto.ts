import { IsNotEmpty, IsOptional, IsString, IsNumber, IsArray, IsLatitude, IsLongitude } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFaceEmbeddingDto {
  @ApiProperty({ description: 'ID do aluno (opcional)' })
  @IsOptional()
  @IsString()
  alunoId?: string;

  @ApiProperty({ description: 'ID do professor (opcional)' })
  @IsOptional()
  @IsString()
  professorId?: string;

  @ApiProperty({ description: 'Imagem em base64' })
  @IsNotEmpty()
  @IsString()
  imageBase64: string;

  @ApiProperty({ description: 'Descriptor facial (array de números)' })
  @IsNotEmpty()
  @IsArray()
  faceDescriptor: number[];

  @ApiProperty({ description: 'Nível de confiança da detecção facial' })
  @IsNotEmpty()
  @IsNumber()
  confidence: number;
}

export class FaceCheckInDto {
  @ApiProperty({ description: 'Imagem em base64 para reconhecimento' })
  @IsNotEmpty()
  @IsString()
  imageBase64: string;

  @ApiProperty({ description: 'ID da unidade' })
  @IsNotEmpty()
  @IsString()
  unidadeId: string;

  @ApiProperty({ description: 'Latitude do dispositivo' })
  @IsNotEmpty()
  @IsLatitude()
  latitude: number;

  @ApiProperty({ description: 'Longitude do dispositivo' })
  @IsNotEmpty()
  @IsLongitude()
  longitude: number;

  @ApiProperty({ description: 'Descriptor facial extraído no frontend' })
  @IsNotEmpty()
  @IsArray()
  faceDescriptor: number[];
}