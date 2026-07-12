import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

/**
 * Guards a route with a `resource:action` permission (spec §A9).
 * Checked by PermissionGuard against the caller's cached role_permissions.
 */
export const RequirePermission = (
  permission: string,
): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permission);
