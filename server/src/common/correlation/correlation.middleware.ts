import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { AuthenticatedRequest } from '../types/authenticated-request';

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const incoming = req.header('x-correlation-id');
    const correlationId = incoming && incoming.length <= 128 ? incoming : uuid();
    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
  }
}
