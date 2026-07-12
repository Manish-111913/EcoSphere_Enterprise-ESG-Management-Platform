import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

declare module 'express-serve-static-core' {
  interface Request {
    correlationId?: string;
  }
}

/**
 * Assigns/propagates a correlation id per request (spec §A10 "correlation ids").
 * Echoed back in the response header so logs can be tied to a single request.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers[CORRELATION_ID_HEADER];
    const id =
      (Array.isArray(incoming) ? incoming[0] : incoming) || randomUUID();
    req.correlationId = id;
    res.setHeader(CORRELATION_ID_HEADER, id);
    next();
  }
}
