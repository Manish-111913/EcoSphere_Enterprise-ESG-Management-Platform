import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { EventBus } from '../../core/events/event-bus';
import { RBAC_UPDATED_EVENT } from '../../core/security/authorization.service';
import { CreateRoleDto, SetPermissionsDto, UpdateRoleDto } from './dto/role.dto';

@Injectable()
export class RolesAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventBus,
  ) {}

  async listRoles() {
    const roles = await this.prisma.role.findMany({
      include: {
        _count: { select: { rolePermissions: true, userRoles: true } },
      },
      orderBy: { name: 'asc' },
    });
    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      permissionCount: r._count.rolePermissions,
      userCount: r._count.userRoles,
    }));
  }

  listPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }

  async getPermissions(roleId: string) {
    await this.getRoleOrThrow(roleId);
    const rows = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });
    return rows.map((rp) => ({
      id: rp.permission.id,
      key: `${rp.permission.resource}:${rp.permission.action}`,
    }));
  }

  async createRole(dto: CreateRoleDto, actorId: string) {
    if (await this.prisma.role.findUnique({ where: { name: dto.name } })) {
      throw new ConflictException({ code: 'CONFLICT', message: 'Role name already exists' });
    }
    const role = await this.prisma.role.create({
      data: { name: dto.name, description: dto.description, isSystem: false },
    });
    await this.audit.record({ actorId, action: AuditAction.CONFIG_CHANGE, entityType: 'role', entityId: role.id, after: role });
    return role;
  }

  async updateRole(id: string, dto: UpdateRoleDto, actorId: string) {
    const before = await this.getRoleOrThrow(id);
    if (dto.name && dto.name !== before.name) {
      if (await this.prisma.role.findUnique({ where: { name: dto.name } })) {
        throw new ConflictException({ code: 'CONFLICT', message: 'Role name already exists' });
      }
    }
    const after = await this.prisma.role.update({ where: { id }, data: dto });
    await this.audit.record({ actorId, action: AuditAction.CONFIG_CHANGE, entityType: 'role', entityId: id, before, after });
    return after;
  }

  async deleteRole(id: string, actorId: string): Promise<{ message: string }> {
    const before = await this.getRoleOrThrow(id);
    if (before.isSystem) {
      throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'System roles cannot be deleted' });
    }
    const users = await this.prisma.userRole.count({ where: { roleId: id } });
    if (users > 0) {
      throw new UnprocessableEntityException({
        code: 'BUSINESS_RULE',
        message: 'Role is assigned to users; reassign them first',
      });
    }
    await this.prisma.role.delete({ where: { id } });
    await this.audit.record({ actorId, action: AuditAction.CONFIG_CHANGE, entityType: 'role', entityId: id, before, after: null });
    this.events.publish(RBAC_UPDATED_EVENT, { roleId: id });
    return { message: 'Role deleted' };
  }

  /** Replace a role's permissions — the Admin-editable mapping (spec §A3.1). */
  async setPermissions(roleId: string, dto: SetPermissionsDto, actorId: string) {
    await this.getRoleOrThrow(roleId);
    if (dto.permissionIds.length) {
      const found = await this.prisma.permission.count({
        where: { id: { in: dto.permissionIds } },
      });
      if (found !== dto.permissionIds.length) {
        throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'One or more permissions not found' });
      }
    }
    const before = await this.getPermissions(roleId);
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({ roleId, permissionId })),
      }),
    ]);
    const after = await this.getPermissions(roleId);
    await this.audit.record({
      actorId,
      action: AuditAction.CONFIG_CHANGE,
      entityType: 'role_permissions',
      entityId: roleId,
      before,
      after,
    });
    this.events.publish(RBAC_UPDATED_EVENT, { roleId }); // bust AuthorizationService cache
    return after;
  }

  private async getRoleOrThrow(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Role not found' });
    return role;
  }
}
