import { Global, Module } from '@nestjs/common';
import { MulticaixaExpressAdapter } from './multicaixa-express.adapter';
import { ReferencePaymentAdapter } from './reference.adapter';
import { EKwanzaAdapter } from './e-kwanza.adapter';
import { ExpressSimulatorModule } from '../../../simulator/express/express-simulator.module';
import { ReferenceSimulatorModule } from '../../../simulator/reference/reference-simulator.module';
import { EKwanzaSimulatorModule } from '../../../simulator/e-kwanza/e-kwanza-simulator.module';
import { PaymentProviderFactory } from './provider.factory';

@Global()
@Module({
  imports: [
    ExpressSimulatorModule,
    ReferenceSimulatorModule,
    EKwanzaSimulatorModule,
  ],
  providers: [
    MulticaixaExpressAdapter,
    ReferencePaymentAdapter,
    EKwanzaAdapter,
    PaymentProviderFactory,
  ],
  exports: [
    PaymentProviderFactory,
    MulticaixaExpressAdapter,
    ReferencePaymentAdapter,
    EKwanzaAdapter,
  ],
})
export class ProvidersModule {}
