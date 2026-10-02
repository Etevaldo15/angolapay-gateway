/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { KafkaService } from '../../infrastructure/kafka/kafka.service';

@Injectable()
export class OutboxWorker {
  private readonly logger = new Logger(OutboxWorker.name);
  private readonly TOPIC = 'angolapay-payments';
  private isProcessing = false; // Evita sobreposição de execuções

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafka: KafkaService,
  ) {}

  // Executa a cada 5 segundos
  @Interval(5000)
  async processOutboxEvents(): Promise<void> {
    // Proteção contra sobreposição: se ainda estiver a processar o ciclo anterior, ignora
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 1. Buscar eventos não publicados (lote pequeno para controlo)
      const events = await this.prisma.outboxEvent.findMany({
        where: { published: false },
        take: 10,
        orderBy: { createdAt: 'asc' },
      });

      if (events.length === 0) return;

      this.logger.debug(`Processing ${events.length} outbox event(s)`);

      // 2. Para cada evento: publicar no Kafka e marcar como publicado
      for (const event of events) {
        try {
          await this.kafka.sendMessage(
            this.TOPIC,
            event.paymentId, // key = paymentId (garante ordenação por pagamento)
            event.payload,
          );

          // 3. Só marca como publicado APÓS confirmação do Kafka
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: { published: true },
          });

          this.logger.log(`Event ${event.id} published successfully`);
        } catch (error: any) {
          // Se falhar, não marca como publicado. Será tentado novamente no próximo ciclo.
          this.logger.error(
            `Failed to publish event ${event.id}: ${error.message}`,
            error.stack,
          );
          // Continua para o próximo evento (não bloqueia a fila toda)
        }
      }
    } catch (error: any) {
      this.logger.error(
        `Outbox worker cycle failed: ${error.message}`,
        error.stack,
      );
    } finally {
      this.isProcessing = false;
    }
  }
}
