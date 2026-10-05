import { Inject, Injectable } from '@nestjs/common';
import { getToken } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';
import {
  PAYMENT_PROCESSED_COUNTER,
  WEBHOOK_PROCESSING_DURATION,
} from './metrics.constants';

@Injectable()
export class MetricsService {
  constructor(
    @Inject(getToken(PAYMENT_PROCESSED_COUNTER))
    private readonly paymentProcessedCounter: Counter,

    @Inject(getToken(WEBHOOK_PROCESSING_DURATION))
    private readonly webhookDurationHistogram: Histogram<string>,
  ) {}

  onModuleInit() {
    // Inicializa o contador com 0 para que ele apareça imediatamente no /metrics
    // Usamos 'UNKNOWN' e 'INIT' apenas como placeholders iniciais
    this.paymentProcessedCounter.inc(
      { payment_method: 'UNKNOWN', status: 'INIT' },
      0,
    );
  }

  /**
   * Incrementa o contador de pagamentos processados.
   * @param method O método de pagamento (ex: 'MULTICAIXA_EXPRESS')
   * @param status O status final (ex: 'SUCCESS', 'FAILED', 'PENDING')
   */
  incrementPaymentProcessed(method: string, status: string): void {
    this.paymentProcessedCounter.inc({
      payment_method: method,
      status: status,
    });
  }

  // Regista o tempo decorrido
  observeWebhookDuration(
    method: string,
    status: string,
    durationInSeconds: number,
  ): void {
    this.webhookDurationHistogram.observe(
      { payment_method: method, status },
      durationInSeconds,
    );
  }
}
