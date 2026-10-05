/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Admin, logLevel } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private admin: Admin;

  // Tópicos da aplicação (IaC - Infrastruture as Code)
  private readonly TOPICS = [
    {
      topic: 'angolapay-payments',
      numPartitions: 3, // 3 partições para paralelismo real em produção
      replicationFactor: 1, // Todo: Ajustar para 3 em clusters Kafka de produção
    },
    {
      topic: 'angolapay-payments-dlq',
      numPartitions: 1, // DLQ processada sequencialmente
      replicationFactor: 1,
    },
  ];

  constructor(private readonly configService: ConfigService) {
    this.kafka = new Kafka({
      clientId: 'angolapay-gateway',
      brokers: [
        this.configService.get<string>('KAFKA_BROKERS') || 'localhost:9092',
      ],
      // Em produção, queremos apenas erros críticos para não explodir o sistema de logs
      logLevel: logLevel.ERROR,
    });
    this.producer = this.kafka.producer();
    this.admin = this.kafka.admin();
  }

  async onModuleInit() {
    try {
      await this.admin.connect();
      await this.producer.connect();

      // Fail Fast: Se não conseguir garantir os tópicos, a app não deve iniciar
      await this.ensureTopicsExist();

      this.logger.log('Kafka Producer and Admin connected successfully.');
    } catch (error: any) {
      // Lança o erro para o NestJS falhar o startup (Fail Fast)
      this.logger.error(
        'CRITICAL: Failed to initialize Kafka. Application will not start.',
        error.message,
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    await this.admin.disconnect();
    this.logger.log('Kafka connections closed.');
  }

  private async ensureTopicsExist() {
    const existingTopics = await this.admin.listTopics();
    const topicsToCreate = this.TOPICS.filter(
      (t) => !existingTopics.includes(t.topic),
    );

    if (topicsToCreate.length > 0) {
      this.logger.log(
        `Provisioning missing Kafka topics: ${topicsToCreate.map((t) => t.topic).join(', ')}`,
      );
      await this.admin.createTopics({
        topics: topicsToCreate,
        waitForLeaders: true, // Garante que as partições estão prontas antes de continuar
      });
    } else {
      this.logger.log('All required Kafka topics are already provisioned.');
    }
  }

  async sendMessage(
    topic: string,
    key: string,
    value: string,
    headers?: Record<string, string>,
  ): Promise<any> {
    return await this.producer.send({
      topic,
      messages: [
        {
          key,
          value,
          headers,
          timestamp: Date.now().toString(),
        },
      ],
    });
  }
}
