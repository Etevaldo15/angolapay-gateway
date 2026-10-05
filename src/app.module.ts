import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Infraestrutura
import { KafkaModule } from './infrastructure/kafka/kafka.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { MetricsModule } from './infrastructure/metrics/metrics.module';

// Módulos de Domínio/Aplicação
import { PaymentsModule } from './modules/payments/payments.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { AuthModule } from './modules/auth/auth.module'; // <-- ADICIONADO
import { MerchantsModule } from './modules/merchants/merchants.module'; // <-- ADICIONADO

// Shared
import { CorrelationIdMiddleware } from './shared/middleware/correlation-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(), // Ativa @Interval, @Cron
    KafkaModule,
    RedisModule,
    MetricsModule,
    AuthModule,
    MerchantsModule,
    PaymentsModule,
    WebhooksModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
