import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { ProviderWebhookDto } from './dto/provider-webhook.dto';

@Controller('api/v1/webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('provider')
  @HttpCode(HttpStatus.OK) // Provedores esperam 200 OK imediatamente para não fazerem retry desnecessário
  async handleProviderCallback(@Body() dto: ProviderWebhookDto) {
    // Processamos em background ou de forma síncrona rápida.
    // O importante é validar e devolver 200 OK ao provedor.
    await this.webhooksService.handleProviderWebhook(dto);
    return { received: true };
  }
}
