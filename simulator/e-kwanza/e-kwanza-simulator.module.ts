import { Global, Module } from '@nestjs/common';
import { EKwanzaSimulatorService } from './e-kwanza-simulator.service';

@Global()
@Module({
  providers: [EKwanzaSimulatorService],
  exports: [EKwanzaSimulatorService],
})
export class EKwanzaSimulatorModule {}
