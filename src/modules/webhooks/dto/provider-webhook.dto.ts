import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum ProviderName {
  MULTICAIXA_EXPRESS = 'MULTICAIXA_EXPRESS',
  REFERENCE = 'REFERENCE',
  E_KWANZA = 'E_KWANZA',
}

export enum ProviderWebhookStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export class ProviderWebhookDto {
  @ApiProperty({
    description:
      'A referência única gerada pelo nosso sistema e enviada ao provedor (ex: ID do QR Code ou Referência Multicaixa)',
    example: 'MCX-1790697629052-8d7a9750',
  })
  @IsString()
  providerReference!: string;

  @ApiProperty({
    enum: ProviderName,
    description: 'O nome do provedor que está a enviar a notificação',
    example: ProviderName.MULTICAIXA_EXPRESS,
  })
  @IsEnum(ProviderName)
  providerName!: ProviderName;

  @ApiProperty({
    enum: ProviderWebhookStatus,
    description: 'O estado final da transação no lado do provedor',
    example: ProviderWebhookStatus.SUCCESS,
  })
  @IsEnum(ProviderWebhookStatus)
  status!: ProviderWebhookStatus;

  @ApiPropertyOptional({
    description:
      'ID da transação no sistema externo do provedor (opcional, mas comum em webhooks reais)',
    example: 'EXT-TX-987654321',
  })
  @IsString()
  @IsOptional()
  externalTransactionId?: string;
}
