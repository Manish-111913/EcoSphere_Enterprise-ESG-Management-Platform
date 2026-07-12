import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Wraps every successful response in the standard envelope (spec §A6):
 *   { success, data, error, meta }
 *
 * If a handler returns a shape like { data, meta } (e.g. paginated lists), the
 * meta is lifted to the envelope; otherwise the raw return value becomes `data`.
 */
export interface ResponseEnvelope<T> {
  success: true;
  data: T;
  error: null;
  meta: Record<string, unknown> | null;
}

interface PaginatedShape {
  data: unknown;
  meta: Record<string, unknown>;
}

function isPaginated(value: unknown): value is PaginatedShape {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'meta' in value &&
    Object.keys(value).length === 2
  );
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ResponseEnvelope<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ResponseEnvelope<T>> {
    return next.handle().pipe(
      map((payload) => {
        if (isPaginated(payload)) {
          return {
            success: true as const,
            data: payload.data as T,
            error: null,
            meta: payload.meta,
          };
        }
        return {
          success: true as const,
          data: payload,
          error: null,
          meta: null,
        };
      }),
    );
  }
}
