import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { OutboxWorker } from './outbox.worker';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaymentsController } from './payments.controller';
import { PaymentProcessorService } from './payment-processor.service';
import { PaymentKafkaConsumerService } from 'src/infrastructure/kafka/payment.consumer.service';
import { ProvidersModule } from 'src/infrastructure/providers/providers.module';

@Module({
  imports: [ProvidersModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PrismaService,
    OutboxWorker,
    PaymentProcessorService,
    PaymentKafkaConsumerService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
