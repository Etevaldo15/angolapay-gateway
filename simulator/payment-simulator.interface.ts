export enum PaymentSimulatorStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  PAID = 'PAID',
  SETTLED = 'SETTLED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export interface PendingPayment {
  providerReference: string;
  provider: string;
  amount: number;
  expiresAt: Date;
  status: PaymentSimulatorStatus;
  createdAt: Date;
}

export interface PaymentSimulator {
  /**
   * Regista um pagamento pendente no simulador
   */
  registerPendingPayment(params: {
    providerReference: string;
    amount: number;
    expiresAt: Date;
  }): Promise<void>;

  /**
   * Consulta o estado de um pagamento
   */
  getPaymentStatus(
    providerReference: string,
  ): Promise<PaymentSimulatorStatus | null>;

  /**
   * Simula a autorização/pagamento de um pagamento
   */
  authorizePayment(providerReference: string): Promise<boolean>;

  /**
   * Cancela um pagamento pendente
   */
  cancelPayment(providerReference: string): Promise<boolean>;

  /**
   * Lista todos os pagamentos pendentes
   */
  listPendingPayments(): PendingPayment[];
}
