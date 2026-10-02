import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
// Importamos os simuladores que já estão na raiz
import { ExpressSimulatorModule } from '../../../simulator/express/express-simulator.module';
import { ReferenceSimulatorModule } from '../../../simulator/reference/reference-simulator.module';
import { EKwanzaSimulatorModule } from '../../../simulator/e-kwanza/e-kwanza-simulator.module';

@Module({
  imports: [
    ExpressSimulatorModule,
    ReferenceSimulatorModule,
    EKwanzaSimulatorModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService, PrismaService],
})
export class WebhooksModule {}
