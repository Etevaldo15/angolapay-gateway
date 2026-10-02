import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  merchantId: string;
  clientId: string;
  scopes: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'), // getOrThrow garante que é uma string e falha se não existir no .env
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    if (!payload.merchantId) {
      throw new UnauthorizedException('Token inválido');
    }
    return payload;
  }
}
