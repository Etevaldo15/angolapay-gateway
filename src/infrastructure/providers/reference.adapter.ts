import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentProviderResponse,
  PaymentProviderStatus,
} from './payment-provider.interface';
import { ReferenceSimulatorService } from '../../../simulator/reference/reference-simulator.service';
import { mapSimulatorStatusToProviderStatus } from './status.mapper';

@Injectable()
export class ReferencePaymentAdapter implements PaymentProvider {
  private readonly logger = new Logger(ReferencePaymentAdapter.name);
  readonly providerName = 'REFERENCE';

  constructor(private readonly simulator: ReferenceSimulatorService) {}

  async createPayment(params: {
    paymentId: string;
    amount: number;
    currency: string;
    description?: string;
  }): Promise<PaymentProviderResponse> {
    this.logger.log(
      `[Reference] Generating reference for payment ${params.paymentId}`,
    );

    // Simula delay de rede
    await this.simulator.simulateNetworkDelay(300, 1000);

    // Gera referência de 9 dígitos (comportamento real da Referência Multicaixa)
    const reference = this.generateReferenceNumber();

    // Entidade (código do comerciante, fixo por comerciante)
    const entity = '90001'; // Simula uma entidade real

    // Expira em 24 horas (comportamento real)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Regista no simulador
    await this.simulator.registerPendingPayment({
      providerReference: reference,
      amount: params.amount,
      expiresAt,
    });

    this.logger.log(
      `[Reference] Generated reference ${reference} for amount ${params.amount}`,
    );

    return {
      providerReference: reference,
      status: PaymentProviderStatus.PENDING,
      expiresAt,
      metadata: {
        reference,
        entity,
        amount: params.amount,
        instruction: `Pay at any Multicaixa ATM or home banking using reference ${reference} and entity ${entity}`,
      },
    };
  }

  async checkStatus(providerReference: string): Promise<PaymentProviderStatus> {
    this.logger.debug(
      `[Reference] Checking status for reference ${providerReference}`,
    );

    await this.simulator.simulateNetworkDelay(100, 300);

    const status = await this.simulator.getPaymentStatus(providerReference);

    if (!status) {
      return PaymentProviderStatus.EXPIRED;
    }

    return mapSimulatorStatusToProviderStatus(status);
  }

  async cancelPayment(providerReference: string): Promise<boolean> {
    this.logger.log(`[Reference] Cancelling reference ${providerReference}`);

    await this.simulator.simulateNetworkDelay(100, 300);

    return await this.simulator.cancelPayment(providerReference);
  }

  /**
   * Gera uma referência de 9 dígitos (comportamento real)
   */
  private generateReferenceNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `${timestamp}${random}`;
  }
}
