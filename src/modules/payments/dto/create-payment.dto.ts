import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsEnum,
  Min,
  Length,
  IsOptional,
} from 'class-validator';

export enum PaymentMethod {
  MULTICAIXA_EXPRESS = 'MULTICAIXA_EXPRESS',
  REFERENCE = 'REFERENCE',
  E_KWANZA = 'E_KWANZA',
}

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Referência do pedido no sistema do comerciante',
    example: 'ORDER-12345',
  })
  @IsString()
  @Length(5, 100)
  externalReference!: string;

  @ApiProperty({
    description: 'Valor do pagamento em cêntimos ou unidades',
    example: 5000,
  })
  @IsNumber()
  @Min(100)
  amount!: number;

  @ApiPropertyOptional({ description: 'Moeda', default: 'AOA' })
  @IsString()
  @IsOptional()
  currency: string = 'AOA';

  @ApiProperty({
    enum: PaymentMethod,
    description: 'Método de pagamento escolhido',
  })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;
}
