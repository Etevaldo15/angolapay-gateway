import { Module } from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import { MerchantsController } from './merchants.controller';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Module({
  controllers: [MerchantsController],
  providers: [MerchantsService, PrismaService],
  exports: [MerchantsService],
})
export class MerchantsModule {}
