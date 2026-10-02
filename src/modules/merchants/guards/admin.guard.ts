/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const adminKey = request.headers['x-admin-api-key'];
    const expectedKey = this.configService.get<string>('ADMIN_API_KEY');

    if (!adminKey || adminKey !== expectedKey) {
      throw new UnauthorizedException('Acesso negado. Admin API Key inválida.');
    }

    return true;
  }
}
