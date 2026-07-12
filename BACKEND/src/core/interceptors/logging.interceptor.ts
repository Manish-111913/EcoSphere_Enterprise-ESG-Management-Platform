import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Structured request logging with correlation ids (spec §A10).
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl } = req;
    const cid = req.correlationId ?? '-';
    const startedAt = process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => this.log(method, originalUrl, cid, startedAt, 'ok'),
        error: (err) =>
          this.log(method, originalUrl, cid, startedAt, `err:${err?.status ?? 500}`),
      }),
    );
  }

  private log(
    method: string,
    url: string,
    cid: string,
    startedAt: bigint,
    outcome: string,
  ): void {
    const ms = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    this.logger.log(
      `${method} ${url} ${outcome} ${ms.toFixed(1)}ms cid=${cid}`,
    );
  }
}
