import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Client ID do comerciante',
    example: 'loja_do_ze_app',
  })
  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @ApiProperty({
    description: 'Client Secret do comerciante',
    example: 'sk_live_xK9mP2nQ...',
  })
  @IsString()
  @IsNotEmpty()
  clientSecret!: string;
}
