import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentProviderResponse,
  PaymentProviderStatus,
} from './payment-provider.interface';
import { EKwanzaSimulatorService } from '../../../simulator/e-kwanza/e-kwanza-simulator.service';
import { mapSimulatorStatusToProviderStatus } from './status.mapper';

@Injectable()
export class EKwanzaAdapter implements PaymentProvider {
  private readonly logger = new Logger(EKwanzaAdapter.name);
  readonly providerName = 'E_KWANZA';

  constructor(private readonly simulator: EKwanzaSimulatorService) {}

  async createPayment(params: {
    paymentId: string;
    amount: number;
    currency: string;
    description?: string;
  }): Promise<PaymentProviderResponse> {
    this.logger.log(`[é-Kwanza] Initiating wallet payment ${params.paymentId}`);

    // Simula delay de rede
    await this.simulator.simulateNetworkDelay(250, 700);

    // Gera um transaction ID único
    const transactionId = `EKW-${Date.now()}-${params.paymentId.substring(0, 8)}`;

    // Link de autorização (simula o deep link da wallet)
    const authorizationUrl = `https://ekwanza.bna.ao/pay/${transactionId}`;

    // Expira em 15 minutos (comportamento real da wallet)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Regista no simulador
    await this.simulator.registerPendingPayment({
      providerReference: transactionId,
      amount: params.amount,
      expiresAt,
    });

    this.logger.log(
      `[é-Kwanza] Payment ${params.paymentId} created with transaction ID: ${transactionId}`,
    );

    return {
      providerReference: transactionId,
      status: PaymentProviderStatus.PENDING,
      expiresAt,
      metadata: {
        authorizationUrl,
        transactionId,
        instruction: 'Open é-Kwanza app and authorize payment',
      },
    };
  }

  async checkStatus(providerReference: string): Promise<PaymentProviderStatus> {
    this.logger.debug(`[é-Kwanza] Checking status for ${providerReference}`);

    await this.simulator.simulateNetworkDelay(100, 300);

    const status = await this.simulator.getPaymentStatus(providerReference);

    if (!status) {
      return PaymentProviderStatus.EXPIRED;
    }

    return mapSimulatorStatusToProviderStatus(status);
  }

  async cancelPayment(providerReference: string): Promise<boolean> {
    this.logger.log(`[é-Kwanza] Cancelling payment ${providerReference}`);

    await this.simulator.simulateNetworkDelay(100, 300);

    return await this.simulator.cancelPayment(providerReference);
  }
}
