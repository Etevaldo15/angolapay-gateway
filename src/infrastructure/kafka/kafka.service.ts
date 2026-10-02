import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, RecordMetadata } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;

  constructor(private readonly configService: ConfigService) {
    this.kafka = new Kafka({
      clientId: 'angolapay-gateway',
      brokers: [
        this.configService.get<string>('KAFKA_BROKERS') || 'localhost:9092',
      ],
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
    this.logger.log('Kafka Producer connected');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    this.logger.log('Kafka Producer disconnected');
  }

  async sendMessage(
    topic: string,
    key: string,
    value: string,
    headers?: Record<string, string>, // Suporte a Headers para adicionarmos DLQ
  ): Promise<RecordMetadata[]> {
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
