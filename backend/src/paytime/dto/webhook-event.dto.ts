import { IsString, IsNotEmpty, IsObject, IsDateString } from 'class-validator';

export class WebhookEventDto {
  @IsString()
  @IsNotEmpty()
  event: string;

  @IsDateString()
  event_date: string;

  @IsObject()
  data: any;
}
