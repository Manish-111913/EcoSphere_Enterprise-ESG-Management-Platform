import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Request } from 'express';
import {
  AuthenticatedUser,
  DataScopeLevel,
  ResolvedScope,
} from '../types/authenticated-user';

export const DATA_SCOPE_KEY = 'dataScope';
const ADMIN_ROLE = 'Admin';
const DEPT_HEAD_ROLE = 'Department Head';

/**
 * Declares the maximum data-scope a route exposes (spec §A9 OWN/DEPARTMENT/ALL).
 * The effective scope is narrowed to the caller's role by @ScopeContext.
 */
export const DataScope = (level: DataScopeLevel): MethodDecorator =>
  SetMetadata(DATA_SCOPE_KEY, level);

export function resolveDataScope(
  user: AuthenticatedUser,
  declared: DataScopeLevel,
): ResolvedScope {
  let level: DataScopeLevel;
  if (user.roleNames.includes(ADMIN_ROLE)) {
    level = 'ALL';
  } else if (declared === 'ALL' && user.roleNames.includes(DEPT_HEAD_ROLE)) {
    level = 'DEPARTMENT';
  } else if (declared === 'ALL') {
    level = 'OWN';
  } else {
    level = declared;
  }
  return { level, userId: user.id, departmentId: user.departmentId };
}

/** Param decorator: resolves the route's @DataScope against the caller. */
export const ScopeContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ResolvedScope => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const user = req.user;
    if (!user) {
      throw new Error('ScopeContext requires an authenticated user');
    }
    const declared: DataScopeLevel =
      Reflect.getMetadata(DATA_SCOPE_KEY, ctx.getHandler()) ?? 'ALL';
    return resolveDataScope(user, declared);
  },
);
