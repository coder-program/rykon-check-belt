import { IsArray, IsNumber, IsBoolean, IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PaytimePlanDto {
  @IsNumber()
  id: number;

  @IsBoolean()
  active: boolean;

  @IsString()
  name: string;
}

export class UpdatePaytimePlansDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaytimePlanDto)
  plans: PaytimePlanDto[];
}
