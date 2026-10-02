/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, EachMessagePayload, IHeaders } from 'kafkajs';
import { PaymentProcessorService } from '../../modules/payments/payment-processor.service';
import { KafkaService } from './kafka.service';

@Injectable()
export class PaymentKafkaConsumerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PaymentKafkaConsumerService.name);
  private readonly TOPIC = 'angolapay-payments';
  private readonly DLQ_TOPIC = 'angolapay-payments-dlq';
  private readonly GROUP_ID = 'angolapay-payment-processor-group';
  private readonly MAX_RETRIES = 3;

  private kafka: Kafka;
  private consumer: Consumer;

  constructor(
    private readonly configService: ConfigService,
    private readonly processor: PaymentProcessorService,
    private readonly kafkaProducer: KafkaService,
  ) {
    this.kafka = new Kafka({
      clientId: 'angolapay-gateway-consumer',
      brokers: [
        this.configService.get<string>('KAFKA_BROKERS') || 'localhost:9092',
      ],
    });
    this.consumer = this.kafka.consumer({ groupId: this.GROUP_ID });
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.TOPIC, fromBeginning: false });

    this.logger.log(
      `Kafka Consumer connected and subscribed to: ${this.TOPIC}`,
    );

    await this.consumer.run({
      eachMessage: async ({ message }: EachMessagePayload) => {
        try {
          const payloadString = message.value?.toString();
          if (!payloadString) {
            this.logger.warn('Received empty message value');
            return;
          }

          const payload = JSON.parse(payloadString);

          if (payload.eventType === 'payment.created') {
            await this.handlePaymentCreated(
              payloadString,
              message.key?.toString() || '',
              message.headers, // Passamos os headers brutos do KafkaJS
            );
          }
        } catch (error: any) {
          this.logger.error(
            `[Consumer] Fatal error in eachMessage loop: ${error.message}`,
          );
        }
      },
    });
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
    this.logger.log('Kafka Consumer disconnected');
  }

  /**
   * Converte os headers brutos do KafkaJS (que podem ser Buffer, string, etc.)
   * num Record<string, string> limpo para reutilização.
   */
  private normalizeHeaders(
    rawHeaders: IHeaders | undefined,
  ): Record<string, string> {
    const normalized: Record<string, string> = {};
    if (!rawHeaders) return normalized;

    for (const [key, value] of Object.entries(rawHeaders)) {
      if (value !== undefined && value !== null) {
        // Se for Buffer, convertemos para string. Caso contrário, garantimos que é string.
        normalized[key] = Buffer.isBuffer(value)
          ? value.toString('utf8')
          : String(value);
      }
    }
    return normalized;
  }

  private async handlePaymentCreated(
    messageValue: string,
    messageKey: string,
    rawHeaders: IHeaders | undefined,
  ) {
    // 1. Normalizar headers para evitar erros de tipo do TypeScript
    const headers = this.normalizeHeaders(rawHeaders);

    const payload = JSON.parse(messageValue);
    const retryCount = parseInt(headers['x-retry-count'] || '0', 10);

    this.logger.log(
      `[Consumer] Processing ${payload.eventType} for ${payload.paymentId} (Attempt: ${retryCount + 1})`,
    );

    try {
      await this.processor.processCreatedPayment({
        paymentId: payload.paymentId,
        merchantId: payload.merchantId,
        amount: payload.amount,
        paymentMethod: payload.paymentMethod,
      });

      this.logger.log(
        `[Consumer] Successfully processed payment ${payload.paymentId}`,
      );
      // Se chegar aqui, o Kafkajs faz o commit do offset automaticamente.
    } catch (error: any) {
      this.logger.error(
        `[Consumer] Failed to process payment ${payload.paymentId}: ${error.message}`,
      );

      // LÓGICA DE DLQ E RETRY CONTROLADO
      if (retryCount >= this.MAX_RETRIES) {
        this.logger.error(
          `[Consumer] Max retries (${this.MAX_RETRIES}) reached for ${payload.paymentId}. Moving to DLQ.`,
        );

        // Envia para a Dead Letter Queue com o motivo da falha
        await this.kafkaProducer.sendMessage(
          this.DLQ_TOPIC,
          messageKey,
          messageValue,
          {
            ...headers,
            'x-failure-reason': error.message,
            'x-failed-at': new Date().toISOString(),
          },
        );
        // Não fazemos throw. O Kafkajs vai fazer o commit do offset, removendo a mensagem do fluxo principal.
      } else {
        this.logger.warn(
          `[Consumer] Retrying payment ${payload.paymentId}. Attempt ${retryCount + 2} of ${this.MAX_RETRIES}`,
        );

        // Reenvia para o tópico principal com o contador incrementado
        await this.kafkaProducer.sendMessage(
          this.TOPIC,
          messageKey,
          messageValue,
          {
            ...headers,
            'x-retry-count': (retryCount + 1).toString(),
          },
        );
        // Não fazemos throw. Fazemos o commit da mensagem atual, e o sistema processará a nova mensagem em breve.
      }
    }
  }
}
