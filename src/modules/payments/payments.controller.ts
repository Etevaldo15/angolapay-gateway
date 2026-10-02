import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  Req,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScopesGuard } from '../auth/guards/scopes.guard';
import { RequireScopes } from '../auth/decorators/scopes.decorator';
import type { RequestWithCorrelation } from '../../shared/middleware/correlation-id.middleware';

// Definimos a interface estendida para incluir o user do JWT
interface AuthenticatedRequest extends RequestWithCorrelation {
  user: {
    merchantId: string;
    clientId: string;
    scopes: string[];
  };
}

@ApiTags('Pagamentos')
@Controller('api/v1/payments')
@UseGuards(JwtAuthGuard, ScopesGuard) // Protege a rota com JWT e valida Scopes
@ApiBearerAuth('access-token')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(201)
  @RequireScopes('payments:write') // Exige que o token tenha este scope específico
  @ApiOperation({ summary: 'Cria um novo pedido de pagamento' })
  @ApiHeader({
    name: 'x-correlation-id',
    required: false,
    description:
      'ID para tracing distribuído (gerado automaticamente se omitido)',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description:
      'UUID v4 gerado pelo cliente para garantir idempotência em retries de rede',
  })
  @ApiResponse({ status: 201, description: 'Pagamento criado com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou Idempotency-Key em falta',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado ou token inválido',
  })
  @ApiResponse({
    status: 403,
    description: 'Scope insuficiente (ex: falta payments:write)',
  })
  async createPayment(
    @Body() dto: CreatePaymentDto,
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Req() req: AuthenticatedRequest,
  ) {
    // 1. Validação estrita do Idempotency-Key
    if (!idempotencyKey) {
      throw new BadRequestException(
        'O header "Idempotency-Key" é obrigatório para criar um pagamento.',
      );
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(idempotencyKey)) {
      throw new BadRequestException(
        'O "Idempotency-Key" deve ser um UUID v4 válido.',
      );
    }

    // 2. O merchantId agora vem do token JWT validado (100% confiável)
    const merchantId = req.user.merchantId;

    // 3. Chama o serviço com os dados seguros
    return this.paymentsService.createPayment(
      merchantId,
      dto,
      idempotencyKey,
      req.correlationId,
    );
  }
}
