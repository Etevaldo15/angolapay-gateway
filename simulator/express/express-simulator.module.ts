import { Global, Module } from '@nestjs/common';
import { ExpressSimulatorService } from './express-simulator.service';

@Global()
@Module({
  providers: [ExpressSimulatorService],
  exports: [ExpressSimulatorService],
})
export class ExpressSimulatorModule {}
