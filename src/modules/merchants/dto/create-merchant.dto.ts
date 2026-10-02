import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsArray, IsOptional } from 'class-validator';

export class CreateMerchantDto {
  @ApiProperty({ description: 'Nome do comerciante', example: 'Loja XPTO' })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Email do comerciante',
    example: 'ze@lojadoze.ao',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description: 'Scopes de permissão',
    example: ['payments:write', 'payments:read'],
    default: ['payments:read'],
  })
  @IsArray()
  @IsOptional()
  scopes?: string[];
}
