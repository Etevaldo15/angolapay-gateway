import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  ProviderWebhookDto,
  ProviderWebhookStatus,
  ProviderName,
} from './dto/provider-webhook.dto';
import { ExpressSimulatorService } from '../../../simulator/express/express-simulator.service';
import { ReferenceSimulatorService } from '../../../simulator/reference/reference-simulator.service';
import { EKwanzaSimulatorService } from '../../../simulator/e-kwanza/e-kwanza-simulator.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly expressSimulator: ExpressSimulatorService,
    private readonly referenceSimulator: ReferenceSimulatorService,
    private readonly eKwanzaSimulator: EKwanzaSimulatorService,
  ) {}

  private getSimulator(providerName: ProviderName) {
    switch (providerName) {
      case ProviderName.MULTICAIXA_EXPRESS:
        return this.expressSimulator;
      case ProviderName.REFERENCE:
        return this.referenceSimulator;
      case ProviderName.E_KWANZA:
        return this.eKwanzaSimulator;
      default:
        throw new BadRequestException('Provider desconhecido');
    }
  }

  async handleProviderWebhook(dto: ProviderWebhookDto): Promise<void> {
    this.logger.log(
      `Recebido webhook do provedor: ${dto.providerName} para referência ${dto.providerReference}`,
    );

    // 1. Consultar o simulador para validar se o pagamento foi realmente autorizado por lá
    const simulator = this.getSimulator(dto.providerName);

    if (dto.status === ProviderWebhookStatus.SUCCESS) {
      const isAuthorized = await simulator.authorizePayment(
        dto.providerReference,
      );
      if (!isAuthorized) {
        throw new BadRequestException(
          `Falha na validação do simulador para a referência ${dto.providerReference}`,
        );
      }
    }

    // 2. Transação Atómica: Atualizar BD + Criar Evento Outbox
    const eventId = uuidv4();
    const finalStatus =
      dto.status === ProviderWebhookStatus.SUCCESS ? 'SUCCESS' : 'FAILED';

    await this.prisma.$transaction(async (tx) => {
      // A. Atualizar o pagamento
      const updatedPayment = await tx.payment.update({
        where: { providerReference: dto.providerReference },
        data: {
          status: finalStatus,
          updatedAt: new Date(),
        },
      });

      if (!updatedPayment) {
        throw new NotFoundException(
          `Pagamento com referência ${dto.providerReference} não encontrado.`,
        );
      }

      // B. Criar evento de sucesso (ou falha) no Outbox
      await tx.outboxEvent.create({
        data: {
          id: eventId,
          paymentId: updatedPayment.id,
          eventType:
            dto.status === ProviderWebhookStatus.SUCCESS
              ? 'payment.succeeded'
              : 'payment.failed',
          payload: JSON.stringify({
            eventType:
              dto.status === ProviderWebhookStatus.SUCCESS
                ? 'payment.succeeded'
                : 'payment.failed',
            paymentId: updatedPayment.id,
            merchantId: updatedPayment.merchantId,
            providerReference: dto.providerReference,
            externalTransactionId: dto.externalTransactionId,
            timestamp: new Date().toISOString(),
          }),
          published: false,
        },
      });
    });

    this.logger.log(
      `Pagamento ${dto.providerReference} processado com sucesso. Status alterado para ${finalStatus}. Evento Outbox criado.`,
    );
  }
}
