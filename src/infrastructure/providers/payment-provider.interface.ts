export enum PaymentProviderStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  PAID = 'PAID',
  SETTLED = 'SETTLED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export interface PaymentProviderResponse {
  providerReference: string; // Referência única do provedor (ex: nº da referência, QR code ID)
  status: PaymentProviderStatus;
  expiresAt: Date; // Quando o pagamento expira
  metadata?: Record<string, any>; // Dados específicos do método (ex: URL do QR, entidade)
}

export interface PaymentProvider {
  readonly providerName: string;

  /**
   * Inicia um pagamento no provedor
   * @returns Dados para o cliente completar o pagamento (QR, referência, link)
   */
  createPayment(params: {
    paymentId: string;
    amount: number;
    currency: string;
    description?: string;
  }): Promise<PaymentProviderResponse>;

  /**
   * Consulta o estado atual do pagamento no provedor
   */
  checkStatus(providerReference: string): Promise<PaymentProviderStatus>;

  /**
   * Cancela um pagamento pendente (se o provedor permitir)
   */
  cancelPayment(providerReference: string): Promise<boolean>;
}
