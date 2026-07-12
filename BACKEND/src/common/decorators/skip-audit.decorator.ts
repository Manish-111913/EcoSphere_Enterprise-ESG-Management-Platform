import { SetMetadata } from '@nestjs/common';

export const SKIP_AUDIT_KEY = 'skipAudit';

/**
 * Excludes a route from the generic audit-log interceptor — used where the
 * service writes its own sanitized audit entry (auth flows) or where the
 * response carries secrets (tokens) that must never land in audit_logs.
 */
export const SkipAudit = (): MethodDecorator & ClassDecorator =>
  SetMetadata(SKIP_AUDIT_KEY, true);
