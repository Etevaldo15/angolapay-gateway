import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { AdminGuard } from './guards/admin.guard';

@ApiTags('Comerciantes')
@Controller('api/v1/merchants')
@UseGuards(AdminGuard)
@ApiHeader({
  name: 'x-admin-api-key',
  required: true,
  description: 'Admin API Key',
})
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria um novo comerciante (Admin only)' })
  @ApiResponse({ status: 201, description: 'Comerciante criado com sucesso' })
  @ApiResponse({ status: 409, description: 'Email já existe' })
  async createMerchant(@Body() dto: CreateMerchantDto) {
    return this.merchantsService.createMerchant(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista todos os comerciantes (Admin only)' })
  @ApiResponse({ status: 200, description: 'Lista de comerciantes' })
  async listMerchants() {
    return this.merchantsService.listMerchants();
  }

  @Post(':id/rotate-secret')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotaciona o secret de um comerciante (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Secret rotacionado' })
  async rotateSecret(@Param('id') id: string) {
    return this.merchantsService.rotateSecret(id);
  }
}
