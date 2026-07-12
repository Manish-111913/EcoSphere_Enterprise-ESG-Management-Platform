import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global error boundary. Emits the standard envelope (spec §A6/§A10):
 *   { success: false, data: null, error: { code, message, details }, meta: null }
 *
 * Business-rule errors (422) carry stable codes such as INSUFFICIENT_POINTS,
 * OUT_OF_STOCK, INVALID_TRANSITION, etc. 500s are logged and never leaked.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: unknown = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      code = this.defaultCodeForStatus(status);

      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        // Nest's built-in ValidationPipe puts field errors in `message: string[]`
        if (Array.isArray(b.message)) {
          code = 'VALIDATION_ERROR';
          message = 'Validation failed';
          details = b.message;
        } else {
          message = (b.message as string) ?? message;
          if (typeof b.code === 'string') code = b.code;
          if (b.details !== undefined) details = b.details;
        }
      }
    } else if (exception instanceof Error) {
      message = 'Internal server error';
      this.logger.error(exception.message, exception.stack);
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status} ${code}`,
      );
    }

    response.status(status).json({
      success: false,
      data: null,
      error: { code, message, details },
      meta: null,
    });
  }

  private defaultCodeForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'BUSINESS_RULE';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
