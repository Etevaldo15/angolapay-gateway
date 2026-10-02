/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../src/infrastructure/redis/redis.service';
import {
  PaymentSimulator,
  PaymentSimulatorStatus,
  PendingPayment,
} from '../payment-simulator.interface';

@Injectable()
export class ReferenceSimulatorService implements PaymentSimulator {
  private readonly logger = new Logger(ReferenceSimulatorService.name);
  private readonly providerName = 'REFERENCE';
  private readonly KEY_PREFIX = 'simulator:reference:';
  private readonly TTL_SECONDS = 24 * 60 * 60; // 24 horas (comportamento real)

  constructor(private readonly redis: RedisService) {}

  async simulateNetworkDelay(
    minMs: number = 300,
    maxMs: number = 1000,
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

    const ttlMs = params.expiresAt.getTime() - Date.now();
    const ttlSeconds = Math.max(Math.floor(ttlMs / 1000), 1);

    await this.redis.set(key, JSON.stringify(paymentData), ttlSeconds);

    this.logger.debug(
      `[Reference Simulator] Registered pending payment in Redis: ${params.providerReference} (TTL: ${ttlSeconds}s)`,
    );
  }

  async getPaymentStatus(
    providerReference: string,
  ): Promise<PaymentSimulatorStatus | null> {
    await this.simulateNetworkDelay(100, 300);

    const key = `${this.KEY_PREFIX}${providerReference}`;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    const payment: PendingPayment = JSON.parse(data);
    payment.expiresAt = new Date(payment.expiresAt);

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
        `[Reference Simulator] Payment ${providerReference} not found or expired`,
      );
      return false;
    }

    const payment: PendingPayment = JSON.parse(data);
    payment.expiresAt = new Date(payment.expiresAt);

    if (new Date() > payment.expiresAt) {
      await this.redis.del(key);
      return false;
    }

    if (payment.status !== PaymentSimulatorStatus.PENDING) {
      return false;
    }

    payment.status = PaymentSimulatorStatus.PAID; // Referência usa PAID

    const ttlMs = payment.expiresAt.getTime() - Date.now();
    const ttlSeconds = Math.max(Math.floor(ttlMs / 1000), 1);

    await this.redis.set(key, JSON.stringify(payment), ttlSeconds);

    this.logger.log(
      `[Reference Simulator] Payment ${providerReference} paid via ATM/homebanking`,
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
      return false;
    }

    payment.status = PaymentSimulatorStatus.CANCELLED;

    const ttlMs = payment.expiresAt.getTime() - Date.now();
    const ttlSeconds = Math.max(Math.floor(ttlMs / 1000), 1);

    await this.redis.set(key, JSON.stringify(payment), ttlSeconds);

    this.logger.log(
      `[Reference Simulator] Payment ${providerReference} cancelled`,
    );

    return true;
  }

  listPendingPayments(): PendingPayment[] {
    return [];
  }
}
