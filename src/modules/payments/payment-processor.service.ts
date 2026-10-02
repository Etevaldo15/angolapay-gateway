/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaymentProviderFactory } from '../../infrastructure/providers/provider.factory';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentProcessorService {
  private readonly logger = new Logger(PaymentProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: PaymentProviderFactory,
  ) {}

  async processCreatedPayment(data: {
    paymentId: string;
    merchantId: string;
    amount: number;
    paymentMethod: string;
  }): Promise<void> {
    this.logger.log(
      `[Processor] Initiating payment with provider for ID: ${data.paymentId}`,
    );

    try {
      const provider = this.providerFactory.getProvider(data.paymentMethod);

      const providerResponse = await provider.createPayment({
        paymentId: data.paymentId,
        amount: data.amount,
        currency: 'AOA',
        description: `Pagamento para merchant ${data.merchantId}`,
      });

      const eventId = uuidv4();

      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: data.paymentId },
          data: {
            status: 'PENDING',
            providerReference: providerResponse.providerReference,
          },
        });

        await tx.outboxEvent.create({
          data: {
            id: eventId,
            paymentId: data.paymentId,
            eventType: 'payment.pending',
            payload: JSON.stringify({
              eventType: 'payment.pending',
              paymentId: data.paymentId,
              merchantId: data.merchantId,
              providerReference: providerResponse.providerReference,
              metadata: providerResponse.metadata,
              expiresAt: providerResponse.expiresAt.toISOString(),
              timestamp: new Date().toISOString(),
            }),
            published: false,
          },
        });
      });

      this.logger.log(
        `[Processor] Payment ${data.paymentId} moved to PENDING.`,
      );
    } catch (error: any) {
      this.logger.error(
        `[Processor] Error processing payment ${data.paymentId}: ${error.message}`,
      );

      // 1. Erros Transientes (Rede, Timeout): Relançar para o Kafka fazer retry nativo
      if (this.isTransientError(error)) {
        this.logger.warn(
          `[Processor] Transient error for ${data.paymentId}. Deferring to Kafka retry.`,
        );
        throw error;
      }

      // 2. Erros de Negócio: Marcar como FAILED e emitir evento para o Outbox
      this.logger.error(
        `[Processor] Business logic failure for ${data.paymentId}. Marking as FAILED.`,
      );

      const failedEventId = uuidv4();

      // Transação atómica para garantir consistência mesmo na falha
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: data.paymentId },
          data: { status: 'FAILED' },
        });

        await tx.outboxEvent.create({
          data: {
            id: failedEventId,
            paymentId: data.paymentId,
            eventType: 'payment.failed',
            payload: JSON.stringify({
              eventType: 'payment.failed',
              paymentId: data.paymentId,
              merchantId: data.merchantId,
              reason: error.message || 'Unknown provider error',
              timestamp: new Date().toISOString(),
            }),
            published: false,
          },
        });
      });

      // Não relançamos o erro aqui, pois já tratámos a falha de negócio de forma definitiva.
      // O Kafka fará o commit do offset e a mensagem não será reprocessada.
    }
  }

  private isTransientError(error: any): boolean {
    const transientCodes = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ENOTFOUND',
    ];
    const errorMessage = (error.message || '').toUpperCase();
    return (
      transientCodes.some((code) => errorMessage.includes(code)) ||
      error.code === 'ETIMEDOUT'
    );
  }
}
