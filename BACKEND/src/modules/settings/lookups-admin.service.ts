import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { EventBus } from '../../core/events/event-bus';
import { CONFIG_UPDATED_EVENT } from '../../core/config/app-config.service';
import {
  CreateLookupTypeDto,
  CreateLookupValueDto,
  CreateTransitionDto,
  UpdateLookupValueDto,
} from './dto/lookup.dto';

@Injectable()
export class LookupsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventBus,
  ) {}

  listTypes() {
    return this.prisma.lookupType.findMany({
      include: { values: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { code: 'asc' },
    });
  }

  async createType(dto: CreateLookupTypeDto, actorId: string) {
    if (await this.prisma.lookupType.findUnique({ where: { code: dto.code } })) {
      throw new ConflictException({ code: 'CONFLICT', message: 'Lookup type code exists' });
    }
    const type = await this.prisma.lookupType.create({
      data: { code: dto.code, description: dto.description, isSystem: false },
    });
    await this.record(actorId, AuditAction.CREATE, 'lookup_type', type.id, null, type);
    this.bust();
    return type;
  }

  async createValue(dto: CreateLookupValueDto, actorId: string) {
    const type = await this.prisma.lookupType.findUnique({ where: { id: dto.lookupTypeId } });
    if (!type) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Lookup type not found' });
    const dup = await this.prisma.lookupValue.findFirst({
      where: { lookupTypeId: dto.lookupTypeId, code: dto.code },
    });
    if (dup) throw new ConflictException({ code: 'CONFLICT', message: 'Value code exists for this type' });

    const value = await this.prisma.lookupValue.create({
      data: {
        lookupTypeId: dto.lookupTypeId,
        code: dto.code,
        label: dto.label,
        color: dto.color,
        sortOrder: dto.sortOrder ?? 0,
        metadata: (dto.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
    await this.record(actorId, AuditAction.CREATE, 'lookup_value', value.id, null, value);
    this.bust();
    return value;
  }

  async updateValue(id: string, dto: UpdateLookupValueDto, actorId: string) {
    const before = await this.prisma.lookupValue.findUnique({
      where: { id },
      include: { lookupType: true },
    });
    if (!before) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Lookup value not found' });

    // System lookups are deactivate-only: cosmetic fields + isActive, never code.
    if (before.lookupType.isSystem && dto.code && dto.code !== before.code) {
      throw new UnprocessableEntityException({
        code: 'BUSINESS_RULE',
        message: 'System lookup codes cannot be changed (deactivate-only)',
      });
    }
    const after = await this.prisma.lookupValue.update({
      where: { id },
      data: {
        code: before.lookupType.isSystem ? undefined : dto.code,
        label: dto.label,
        color: dto.color,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
        metadata: (dto.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
    await this.record(actorId, AuditAction.UPDATE, 'lookup_value', id, before, after);
    this.bust();
    return after;
  }

  async deleteValue(id: string, actorId: string): Promise<{ message: string }> {
    const before = await this.prisma.lookupValue.findUnique({
      where: { id },
      include: { lookupType: true },
    });
    if (!before) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Lookup value not found' });
    if (before.lookupType.isSystem) {
      throw new UnprocessableEntityException({
        code: 'BUSINESS_RULE',
        message: 'System lookup values cannot be deleted; deactivate instead',
      });
    }
    try {
      await this.prisma.lookupValue.delete({ where: { id } });
    } catch {
      throw new UnprocessableEntityException({
        code: 'BUSINESS_RULE',
        message: 'Lookup value is referenced by records; deactivate instead',
      });
    }
    await this.record(actorId, AuditAction.DELETE, 'lookup_value', id, before, null);
    this.bust();
    return { message: 'Lookup value deleted' };
  }

  // ─────────────── transitions ───────────────
  listTransitions(lookupTypeId?: string) {
    return this.prisma.lookupTransition.findMany({
      where: lookupTypeId ? { lookupTypeId } : {},
    });
  }

  async createTransition(dto: CreateTransitionDto, actorId: string) {
    const dup = await this.prisma.lookupTransition.findFirst({
      where: { fromValueId: dto.fromValueId, toValueId: dto.toValueId },
    });
    if (dup) throw new ConflictException({ code: 'CONFLICT', message: 'Transition already exists' });
    const t = await this.prisma.lookupTransition.create({
      data: {
        lookupTypeId: dto.lookupTypeId,
        fromValueId: dto.fromValueId,
        toValueId: dto.toValueId,
        allowedPermission: dto.allowedPermission,
      },
    });
    await this.record(actorId, AuditAction.CREATE, 'lookup_transition', t.id, null, t);
    this.bust();
    return t;
  }

  async deleteTransition(id: string, actorId: string): Promise<{ message: string }> {
    const before = await this.prisma.lookupTransition.findUnique({ where: { id } });
    if (!before) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Transition not found' });
    await this.prisma.lookupTransition.delete({ where: { id } });
    await this.record(actorId, AuditAction.DELETE, 'lookup_transition', id, before, null);
    this.bust();
    return { message: 'Transition deleted' };
  }

  private bust(): void {
    this.events.publish(CONFIG_UPDATED_EVENT, { scope: 'lookups' });
  }

  private record(
    actorId: string,
    action: AuditAction,
    entityType: string,
    entityId: string,
    before: unknown,
    after: unknown,
  ): Promise<void> {
    return this.audit.record({ actorId, action, entityType, entityId, before, after });
  }
}
