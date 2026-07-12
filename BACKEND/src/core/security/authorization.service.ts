import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EventBus } from '../events/event-bus';

export const RBAC_UPDATED_EVENT = 'rbac.updated';

/**
 * Caches the role → permission mapping (spec §A9: "reading cached
 * role_permissions"). Reloads on `rbac.updated`. Effective permissions for a
 * user are the union across their roles.
 */
@Injectable()
export class AuthorizationService implements OnModuleInit {
  private readonly logger = new Logger(AuthorizationService.name);
  private byRole = new Map<string, Set<string>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
  ) {}

  async onModuleInit(): Promise<void> {
    this.events.on(RBAC_UPDATED_EVENT, () => this.reload());
    await this.reload();
  }

  async reload(): Promise<void> {
    const roles = await this.prisma.role.findMany({
      include: {
        rolePermissions: { include: { permission: true } },
      },
    });
    const next = new Map<string, Set<string>>();
    for (const role of roles) {
      next.set(
        role.id,
        new Set(
          role.rolePermissions.map(
            (rp) => `${rp.permission.resource}:${rp.permission.action}`,
          ),
        ),
      );
    }
    this.byRole = next;
    this.logger.log(`Loaded permissions for ${next.size} roles`);
  }

  permissionsForRoles(roleIds: string[]): string[] {
    const set = new Set<string>();
    for (const roleId of roleIds) {
      const perms = this.byRole.get(roleId);
      if (perms) for (const p of perms) set.add(p);
    }
    return Array.from(set).sort();
  }

  /**
   * True when every role id is present in the cache. A miss means the cache is
   * stale relative to the DB (e.g. the DB was reseeded with new role ids while
   * the process kept running) — callers should reload before trusting an empty
   * permission set, otherwise the whole app 403s until the next restart.
   */
  hasAllRoles(roleIds: string[]): boolean {
    return roleIds.every((id) => this.byRole.has(id));
  }

  /** Short, stable hash of an effective permission set (JWT `ph` claim). */
  permissionHash(permissions: string[]): string {
    return createHash('sha256')
      .update([...permissions].sort().join('|'))
      .digest('hex')
      .slice(0, 16);
  }
}

