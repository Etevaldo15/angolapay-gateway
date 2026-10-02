/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MerchantsService {
  private readonly logger = new Logger(MerchantsService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(private readonly prisma: PrismaService) {}

  async createMerchant(dto: CreateMerchantDto) {
    const existingMerchant = await this.prisma.merchant.findUnique({
      where: { email: dto.email },
    });

    if (existingMerchant) {
      throw new ConflictException('Já existe um comerciante com este email');
    }

    const clientId = this.generateClientId(dto.name);
    const clientSecret = this.generateClientSecret();
    const clientSecretHash = await bcrypt.hash(clientSecret, this.SALT_ROUNDS);

    const merchant = await this.prisma.merchant.create({
      data: {
        name: dto.name,
        email: dto.email,
        clientId,
        clientSecretHash,
        scopes: dto.scopes || ['payments:read'],
      },
    });

    this.logger.log(`Merchant created: ${merchant.clientId}`);

    // Retorna o secret APENAS uma vez!
    return {
      id: merchant.id,
      name: merchant.name,
      email: merchant.email,
      clientId: merchant.clientId,
      clientSecret,
      scopes: merchant.scopes,
      createdAt: merchant.createdAt,
    };
  }

  async listMerchants() {
    return this.prisma.merchant.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        clientId: true,
        scopes: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async rotateSecret(merchantId: string) {
    const newSecret = this.generateClientSecret();
    const newSecretHash = await bcrypt.hash(newSecret, this.SALT_ROUNDS);

    await this.prisma.merchant.update({
      where: { id: merchantId },
      data: { clientSecretHash: newSecretHash },
    });

    this.logger.log(`Secret rotated for merchant: ${merchantId}`);

    return {
      message: 'Secret rotacionado com sucesso',
      newSecret, // Mostrado apenas uma vez!
    };
  }

  private generateClientId(name: string): string {
    const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `${sanitized}_${uuidv4().substring(0, 8)}`;
  }

  private generateClientSecret(): string {
    return `sk_live_${uuidv4().replace(/-/g, '')}${uuidv4().replace(/-/g, '')}`;
  }
}
