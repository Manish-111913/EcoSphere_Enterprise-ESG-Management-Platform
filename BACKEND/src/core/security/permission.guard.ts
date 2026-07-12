import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { REQUIRE_PERMISSION_KEY } from '../../common/decorators/require-permission.decorator';

/**
 * Enforces @RequirePermission('resource:action') against the caller's cached
 * permissions. 403 responses include the missing permission code (spec §A10).
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<string>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true; // authenticated is sufficient

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user;
    if (!user) throw new UnauthorizedException('Authentication required');

    if (!user.permissions.includes(required)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: `Missing permission: ${required}`,
        details: { permission: required },
      });
    }
    return true;
  }
}
