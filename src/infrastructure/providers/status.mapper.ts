import { PaymentSimulatorStatus } from '../../../simulator/payment-simulator.interface';
import { PaymentProviderStatus } from './payment-provider.interface';

/**
 * Converte o status do simulador para o status do provider
 * Mantém o desacoplamento entre as camadas
 */
export function mapSimulatorStatusToProviderStatus(
  simulatorStatus: PaymentSimulatorStatus,
): PaymentProviderStatus {
  const mapping: Record<PaymentSimulatorStatus, PaymentProviderStatus> = {
    [PaymentSimulatorStatus.PENDING]: PaymentProviderStatus.PENDING,
    [PaymentSimulatorStatus.AUTHORIZED]: PaymentProviderStatus.AUTHORIZED,
    [PaymentSimulatorStatus.PAID]: PaymentProviderStatus.PAID,
    [PaymentSimulatorStatus.SETTLED]: PaymentProviderStatus.SETTLED,
    [PaymentSimulatorStatus.FAILED]: PaymentProviderStatus.FAILED,
    [PaymentSimulatorStatus.EXPIRED]: PaymentProviderStatus.EXPIRED,
    [PaymentSimulatorStatus.CANCELLED]: PaymentProviderStatus.CANCELLED,
  };

  return mapping[simulatorStatus];
}
