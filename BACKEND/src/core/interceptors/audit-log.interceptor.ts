import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditAction } from '@prisma/client';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import { SKIP_AUDIT_KEY } from '../../common/decorators/skip-audit.decorator';

/**
 * Writes an audit_logs row for every successful mutation (spec §A4/§A10:
 * "Every mutation writes audit_logs via an interceptor").
 *
 * Derives a generic action from the HTTP verb; domain-specific flows
 * (APPROVE/REJECT/TRANSITION/REDEEM/LOGIN/EXPORT/CONFIG_CHANGE) may record
 * richer entries directly in their services. Actor is null until auth (B1).
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  private static readonly VERB_ACTION: Record<string, AuditAction> = {
    POST: AuditAction.CREATE,
    PUT: AuditAction.UPDATE,
    PATCH: AuditAction.UPDATE,
    DELETE: AuditAction.DELETE,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const action = AuditLogInterceptor.VERB_ACTION[req.method];

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!action || skip) {
      return next.handle(); // reads and self-audited/secret routes are skipped
    }

    return next.handle().pipe(
      tap((data) => {
        void this.record(req, action, data);
      }),
    );
  }

  private async record(
    req: Request,
    action: AuditAction,
    data: unknown,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: req.user?.id ?? null,
          action,
          entityType: this.entityFromPath(req.originalUrl),
          entityId: this.entityId(data),
          after: this.safeJson(data),
          ip: req.ip ?? null,
          userAgent: req.headers['user-agent'] ?? null,
        },
      });
    } catch (err) {
      // Auditing must never break the request path.
      this.logger.error(`audit write failed: ${(err as Error).message}`);
    }
  }

  private entityFromPath(url: string): string {
    const path = url.split('?')[0];
    const parts = path.split('/').filter(Boolean); // ['api','v1','<entity>', ...]
    return parts[2] ?? 'unknown';
  }

  private entityId(data: unknown): string | null {
    if (data && typeof data === 'object' && 'id' in data) {
      const id = (data as { id: unknown }).id;
      return typeof id === 'string' ? id : null;
    }
    return null;
  }

  private safeJson(data: unknown): object | undefined {
    if (data && typeof data === 'object') {
      // Prisma Json column; JSON.parse(JSON.stringify) strips Dates/BigInt safely.
      try {
        return JSON.parse(JSON.stringify(data)) as object;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}
