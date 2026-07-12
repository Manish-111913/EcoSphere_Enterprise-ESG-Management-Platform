import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from './authorization.service';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: string[];
  ph: string;
  typ: 'access';
}

/**
 * Global authentication: verifies the access JWT, confirms the user is still
 * active, and attaches the effective permission set (spec §A9 middleware chain
 * "JWT verify → active check → permission guard → controller").
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (payload.typ !== 'access') {
      throw new UnauthorizedException('Not an access token');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User inactive or not found');
    }

    const roleIds = user.userRoles.map((ur) => ur.roleId);
    const roleNames = user.userRoles.map((ur) => ur.role.name);
    // Self-heal a stale RBAC cache: if the user carries a role id the cache has
    // never seen (typically after a DB reseed that churned role ids), reload
    // once so we don't 403 every request until the process restarts.
    if (roleIds.length > 0 && !this.authz.hasAllRoles(roleIds)) {
      await this.authz.reload();
    }
    const authed: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      departmentId: user.departmentId,
      isActive: user.isActive,
      roleIds,
      roleNames,
      permissions: this.authz.permissionsForRoles(roleIds),
    };
    req.user = authed;
    return true;
  }

  private extractToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header) return null;
    const [scheme, value] = header.split(' ');
    return scheme === 'Bearer' && value ? value : null;
  }
}
