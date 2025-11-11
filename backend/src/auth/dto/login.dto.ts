import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Email ou username do usuário para autenticação',
    example: 'admin@teamcruz.com ou admin.user',
  })
  @IsString()
  @IsNotEmpty()
  emailOrUsername: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: '123456',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
