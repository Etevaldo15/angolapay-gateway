import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RequestWithCorrelation extends Request {
  correlationId: string;
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: RequestWithCorrelation, res: Response, next: NextFunction) {
    // Usa o ID enviado pelo cliente ou gera um novo
    const correlationId =
      (req.headers['x-correlation-id'] as string) || uuidv4();

    // Disponibiliza no request para os controllers/services usarem
    req.correlationId = correlationId;

    // Devolve no header da resposta para o cliente poder rastrear
    res.setHeader('x-correlation-id', correlationId);

    next();
  }
}
