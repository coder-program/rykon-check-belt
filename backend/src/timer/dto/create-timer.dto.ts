import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TimerMode } from '../entities/timer-config.entity';

export class CircuitExerciseDto {
  @ApiProperty({ example: 'Burpee' })
  @IsString()
  nome: string;

  @ApiProperty({ example: 40, description: 'Duração em segundos' })
  @IsNumber()
  @Min(1)
  duracaoSegundos: number;

  @ApiProperty({ example: 20, description: 'Descanso em segundos' })
  @IsNumber()
  @Min(0)
  descansoSegundos: number;
}

export class CreateTimerDto {
  @ApiProperty({ example: 'Treino Jiu-Jitsu' })
  @IsString()
  nome: string;

  @ApiProperty({ enum: TimerMode, default: TimerMode.SIMPLE })
  @IsEnum(TimerMode)
  modo: TimerMode;

  @ApiPropertyOptional({ example: 'abc123' })
  @IsOptional()
  @IsString()
  academiaId?: string;

  @ApiPropertyOptional({ example: 300, description: 'Duração total em segundos (modo SIMPLE)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  duracaoSegundos?: number;

  @ApiPropertyOptional({ example: 3, description: 'Número de rounds (modo ROUNDS)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  numRounds?: number;

  @ApiPropertyOptional({ example: 300, description: 'Duração de cada round em segundos' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  duracaoRoundSegundos?: number;

  @ApiPropertyOptional({ example: 60, description: 'Descanso entre rounds em segundos' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duracaoDescansoSegundos?: number;

  @ApiPropertyOptional({ type: [CircuitExerciseDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CircuitExerciseDto)
  exercicios?: CircuitExerciseDto[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
