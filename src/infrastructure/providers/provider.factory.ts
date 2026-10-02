import { Injectable } from '@nestjs/common';
import { PaymentProvider } from './payment-provider.interface';
import { MulticaixaExpressAdapter } from './multicaixa-express.adapter';
import { ReferencePaymentAdapter } from './reference.adapter';
import { EKwanzaAdapter } from './e-kwanza.adapter';

@Injectable()
export class PaymentProviderFactory {
  constructor(
    private readonly expressAdapter: MulticaixaExpressAdapter,
    private readonly referenceAdapter: ReferencePaymentAdapter,
    private readonly eKwanzaAdapter: EKwanzaAdapter,
  ) {}

  getProvider(method: string): PaymentProvider {
    switch (method) {
      case 'MULTICAIXA_EXPRESS':
        return this.expressAdapter;
      case 'REFERENCE':
        return this.referenceAdapter;
      case 'E_KWANZA':
        return this.eKwanzaAdapter;
      default:
        throw new Error(`Unknown payment method: ${method}`);
    }
  }
}
