/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateClient(clientId: string, clientSecret: string): Promise<any> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { clientId },
    });

    if (!merchant || !merchant.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(
      clientSecret,
      merchant.clientSecretHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return merchant;
  }

  async login(loginDto: LoginDto) {
    const merchant = await this.validateClient(
      loginDto.clientId,
      loginDto.clientSecret,
    );

    const payload = {
      sub: merchant.id,
      merchantId: merchant.id,
      clientId: merchant.clientId,
      scopes: merchant.scopes,
    };

    this.logger.log(`Merchant ${merchant.clientId} authenticated successfully`);

    return {
      access_token: await this.jwtService.signAsync(payload),
      token_type: 'Bearer',
      expires_in: 3600, // 1 hora em segundos
      merchant_id: merchant.id,
      scopes: merchant.scopes,
    };
  }
}
