import { Global, Module } from '@nestjs/common';
import { ReferenceSimulatorService } from './reference-simulator.service';

@Global()
@Module({
  providers: [ReferenceSimulatorService],
  exports: [ReferenceSimulatorService],
})
export class ReferenceSimulatorModule {}
