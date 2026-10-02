/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createPayment(
    merchantId: string,
    dto: CreatePaymentDto,
    idempotencyKey: string,
    correlationId: string,
  ) {
    this.logger.log(
      `[${correlationId}] Iniciando criação de pagamento para merchant: ${merchantId}`,
    );

    const existingPayment = await this.prisma.payment.findUnique({
      where: { idempotencyKey },
    });

    if (existingPayment) {
      this.logger.log(
        `[${correlationId}] Pagamento idempotente encontrado. Retornando existente.`,
      );
      return existingPayment;
    }

    const paymentId = uuidv4();
    const eventId = uuidv4();

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            id: paymentId,
            merchantId,
            externalReference: dto.externalReference,
            idempotencyKey,
            amount: dto.amount,
            currency: dto.currency,
            paymentMethod: dto.paymentMethod,
            status: 'CREATED',
          },
        });

        await tx.outboxEvent.create({
          data: {
            id: eventId,
            paymentId: payment.id,
            eventType: 'payment.created',
            payload: JSON.stringify({
              correlationId,
              eventType: 'payment.created',
              paymentId: payment.id,
              merchantId,
              amount: dto.amount,
              paymentMethod: dto.paymentMethod,
              timestamp: new Date().toISOString(),
            }),
            published: false,
          },
        });

        return payment;
      });

      this.logger.log(
        `[${correlationId}] Pagamento ${paymentId} criado com sucesso.`,
      );
      return result;
    } catch (error: any) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        const retryPayment = await this.prisma.payment.findUnique({
          where: { idempotencyKey },
        });
        if (retryPayment) return retryPayment;
      }

      this.logger.error(
        `[${correlationId}] Falha ao criar pagamento: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Falha ao processar a transação de pagamento.',
      );
    }
  }
}
