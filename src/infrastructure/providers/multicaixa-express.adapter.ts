import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentProviderResponse,
  PaymentProviderStatus,
} from './payment-provider.interface';
import { ExpressSimulatorService } from '../../../simulator/express/express-simulator.service';
import { mapSimulatorStatusToProviderStatus } from './status.mapper';

@Injectable()
export class MulticaixaExpressAdapter implements PaymentProvider {
  private readonly logger = new Logger(MulticaixaExpressAdapter.name);
  readonly providerName = 'MULTICAIXA_EXPRESS';

  constructor(private readonly simulator: ExpressSimulatorService) {}

  async createPayment(params: {
    paymentId: string;
    amount: number;
    currency: string;
    description?: string;
  }): Promise<PaymentProviderResponse> {
    this.logger.log(
      `[MCX Express] Initiating payment ${params.paymentId} for ${params.amount} ${params.currency}`,
    );

    // Simula delay de rede (200-800ms) como numa API real
    await this.simulator.simulateNetworkDelay(200, 800);

    // Gera um "QR Code ID" único (na realidade seria um UUID ou hash)
    const qrCodeId = `MCX-${Date.now()}-${params.paymentId.substring(0, 8)}`;

    // URL do QR Code (simula o endpoint real da EMIS)
    const qrCodeUrl = `https://api.emis.co.ao/express/qr/${qrCodeId}`;

    // Expira em 5 minutos (comportamento real do MCX Express)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Regista no simulador para podermos "autorizar" depois
    await this.simulator.registerPendingPayment({
      providerReference: qrCodeId,
      amount: params.amount,
      expiresAt,
    });

    this.logger.log(
      `[MCX Express] Payment ${params.paymentId} created with QR: ${qrCodeId}`,
    );

    return {
      providerReference: qrCodeId,
      status: PaymentProviderStatus.PENDING,
      expiresAt,
      metadata: {
        qrCodeUrl,
        qrCodeId,
        instruction: 'Scan QR code with Multicaixa Express app',
      },
    };
  }

  async checkStatus(providerReference: string): Promise<PaymentProviderStatus> {
    this.logger.debug(`[MCX Express] Checking status for ${providerReference}`);

    // Simula delay de rede
    await this.simulator.simulateNetworkDelay(100, 300);

    // Consulta o simulador
    const status = await this.simulator.getPaymentStatus(providerReference);

    if (!status) {
      return PaymentProviderStatus.EXPIRED;
    }

    return mapSimulatorStatusToProviderStatus(status);
  }

  async cancelPayment(providerReference: string): Promise<boolean> {
    this.logger.log(`[MCX Express] Cancelling payment ${providerReference}`);

    await this.simulator.simulateNetworkDelay(100, 300);

    return await this.simulator.cancelPayment(providerReference);
  }
}
