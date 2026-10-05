/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
import { MetricsService } from '../../infrastructure/metrics/metrics.service'; // <-- 1. IMPORTADO
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly expressSimulator: ExpressSimulatorService,
    private readonly referenceSimulator: ReferenceSimulatorService,
    private readonly eKwanzaSimulator: EKwanzaSimulatorService,
    private readonly metricsService: MetricsService,
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
    const startTime = Date.now();

    this.logger.log(
      `[${dto.providerReference}] Recebido webhook do provedor: ${dto.providerName}`,
    );

    // 1. Consultar o simulador para validar se o pagamento foi realmente autorizado
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

    const eventId = uuidv4();
    const finalStatus =
      dto.status === ProviderWebhookStatus.SUCCESS ? 'SUCCESS' : 'FAILED';

    // 2. Transação Atómica: Atualizar BD + Criar Evento Outbox
    try {
      await this.prisma.$transaction(async (tx) => {
        // A. Atualizar o pagamento (usando findFirst + update por ID se providerReference não for @unique,
        // ou direto se já tiveres aplicado o @unique no schema)
        const existingPayment = await tx.payment.findFirst({
          where: { providerReference: dto.providerReference },
        });

        if (!existingPayment) {
          throw new NotFoundException(
            `Pagamento com referência ${dto.providerReference} não encontrado.`,
          );
        }

        await tx.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: finalStatus,
            updatedAt: new Date(),
          },
        });

        // B. Criar evento de sucesso (ou falha) no Outbox
        await tx.outboxEvent.create({
          data: {
            id: eventId,
            paymentId: existingPayment.id,
            eventType:
              dto.status === ProviderWebhookStatus.SUCCESS
                ? 'payment.succeeded'
                : 'payment.failed',
            payload: JSON.stringify({
              eventType:
                dto.status === ProviderWebhookStatus.SUCCESS
                  ? 'payment.succeeded'
                  : 'payment.failed',
              paymentId: existingPayment.id,
              merchantId: existingPayment.merchantId,
              providerReference: dto.providerReference,
              externalTransactionId: dto.externalTransactionId,
              timestamp: new Date().toISOString(),
            }),
            published: false,
          },
        });
      });

      // 3. REGISTA A MÉTRICA DE NEGÓCIO (SÓ SE A TRANSAÇÃO ACIMA FOI 100% BEM-SUCEDIDA)
      // Se o $transaction lançar um erro, a execução salta para o catch e esta linha NUNCA é atingida.
      this.metricsService.incrementPaymentProcessed(
        dto.providerName,
        finalStatus,
      );

      // 4 Metrica de Duração
      const durationInSeconds = (Date.now() - startTime) / 1000;
      this.metricsService.observeWebhookDuration(
        dto.providerName,
        finalStatus,
        durationInSeconds,
      );

      this.logger.log(
        `[${dto.providerReference}] Processado com sucesso. Status alterado para ${finalStatus}. Evento Outbox criado.`,
      );
    } catch (error: any) {
      // Se falhar, também queres medir e contar como falha
      const durationInSeconds = (Date.now() - startTime) / 1000;
      this.metricsService.observeWebhookDuration(
        dto.providerName,
        'ERROR',
        durationInSeconds,
      );

      this.logger.error(
        `[${dto.providerReference}] Falha ao processar webhook: ${error.message}`,
      );
      // Re-lança o erro para que o controller possa devolver 500 ou tratar conforme a política de retry
      throw error;
    }
  }
}
