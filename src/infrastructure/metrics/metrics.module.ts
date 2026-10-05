import { Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service';
import {
  PAYMENT_PROCESSED_COUNTER,
  WEBHOOK_PROCESSING_DURATION,
} from './metrics.constants';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/api/v1/metrics',
      defaultMetrics: { enabled: true }, // Ativar metricas de RAM, CPU...
    }),
  ],
  providers: [
    MetricsService,
    makeCounterProvider({
      name: PAYMENT_PROCESSED_COUNTER,
      help: 'Total de pagamentos processados pelo gateway',
      labelNames: ['payment_method', 'status'],
    }),
    makeHistogramProvider({
      name: WEBHOOK_PROCESSING_DURATION,
      help: 'Tempo de processamento do webhook do provedor em segundos',
      labelNames: ['payment_method', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5], // Buckets em segundos (100ms, 500ms, 1s, 2s, 5s)
    }),
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
