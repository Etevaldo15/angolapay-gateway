/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../src/infrastructure/redis/redis.service';
import {
  PaymentSimulator,
  PaymentSimulatorStatus,
  PendingPayment,
} from '../payment-simulator.interface';

@Injectable()
export class ExpressSimulatorService implements PaymentSimulator {
  private readonly logger = new Logger(ExpressSimulatorService.name);
  private readonly providerName = 'MULTICAIXA_EXPRESS';
  private readonly KEY_PREFIX = 'simulator:express:';
  private readonly TTL_SECONDS = 5 * 60; // 5 minutos (comportamento real do MCX Express)

  constructor(private readonly redis: RedisService) {}

  async simulateNetworkDelay(
    minMs: number = 200,
    maxMs: number = 800,
  ): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  async registerPendingPayment(params: {
    providerReference: string;
    amount: number;
    expiresAt: Date;
  }): Promise<void> {
    await this.simulateNetworkDelay();

    const key = `${this.KEY_PREFIX}${params.providerReference}`;
    const paymentData: PendingPayment = {
      providerReference: params.providerReference,
      provider: this.providerName,
      amount: params.amount,
      expiresAt: params.expiresAt,
      status: PaymentSimulatorStatus.PENDING,
      createdAt: new Date(),
    };

    // Calcula TTL até a expiração
    const ttlMs = params.expiresAt.getTime() - Date.now();
    const ttlSeconds = Math.max(Math.floor(ttlMs / 1000), 1);

    await this.redis.set(key, JSON.stringify(paymentData), ttlSeconds);

    this.logger.debug(
      `[Express Simulator] Registered pending payment in Redis: ${params.providerReference} (TTL: ${ttlSeconds}s)`,
    );
  }

  async getPaymentStatus(
    providerReference: string,
  ): Promise<PaymentSimulatorStatus | null> {
    await this.simulateNetworkDelay(100, 300);

    const key = `${this.KEY_PREFIX}${providerReference}`;
    const data = await this.redis.get(key);

    if (!data) {
      this.logger.debug(
        `[Express Simulator] Payment ${providerReference} not found or expired`,
      );
      return null;
    }

    const payment: PendingPayment = JSON.parse(data);

    // Verifica se expirou (embora o Redis já deva ter removido)
    if (new Date() > payment.expiresAt) {
      await this.redis.del(key);
      return PaymentSimulatorStatus.EXPIRED;
    }

    return payment.status;
  }

  async authorizePayment(providerReference: string): Promise<boolean> {
    await this.simulateNetworkDelay(100, 300);

    const key = `${this.KEY_PREFIX}${providerReference}`;
    const data = await this.redis.get(key);

    if (!data) {
      this.logger.warn(
        `[Express Simulator] Payment ${providerReference} not found or expired`,
      );
      return false;
    }

    const payment: PendingPayment = JSON.parse(data);

    payment.expiresAt = new Date(payment.expiresAt);

    if (new Date() > payment.expiresAt) {
      await this.redis.del(key);
      this.logger.warn(
        `[Express Simulator] Payment ${providerReference} already expired`,
      );
      return false;
    }

    if (payment.status !== PaymentSimulatorStatus.PENDING) {
      this.logger.warn(
        `[Express Simulator] Cannot authorize payment ${providerReference} with status ${payment.status}`,
      );
      return false;
    }

    payment.status = PaymentSimulatorStatus.AUTHORIZED;

    // Mantém o TTL original
    const ttlMs = payment.expiresAt.getTime() - Date.now();
    const ttlSeconds = Math.max(Math.floor(ttlMs / 1000), 1);

    await this.redis.set(key, JSON.stringify(payment), ttlSeconds);

    this.logger.log(
      `[Express Simulator] Payment ${providerReference} authorized via QR code`,
    );

    return true;
  }

  async cancelPayment(providerReference: string): Promise<boolean> {
    await this.simulateNetworkDelay(100, 300);

    const key = `${this.KEY_PREFIX}${providerReference}`;
    const data = await this.redis.get(key);

    if (!data) {
      return false;
    }

    const payment: PendingPayment = JSON.parse(data);

    payment.expiresAt = new Date(payment.expiresAt);

    if (payment.status !== PaymentSimulatorStatus.PENDING) {
      this.logger.warn(
        `[Express Simulator] Cannot cancel payment ${providerReference} with status ${payment.status}`,
      );
      return false;
    }

    payment.status = PaymentSimulatorStatus.CANCELLED;

    const ttlMs = payment.expiresAt.getTime() - Date.now();
    const ttlSeconds = Math.max(Math.floor(ttlMs / 1000), 1);

    await this.redis.set(key, JSON.stringify(payment), ttlSeconds);

    this.logger.log(
      `[Express Simulator] Payment ${providerReference} cancelled`,
    );

    return true;
  }

  listPendingPayments(): PendingPayment[] {
    // Nota: Esta operação é cara em Redis (requer SCAN).
    // Em produção, não seria usada frequentemente.
    this.logger.warn(
      '[Express Simulator] listPendingPayments is not optimized for Redis',
    );
    return [];
  }
}
