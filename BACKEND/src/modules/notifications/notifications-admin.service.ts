import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import {
  CreateRuleDto,
  CreateTemplateDto,
  UpdateRuleDto,
  UpdateTemplateDto,
} from './dto/notification.dto';

@Injectable()
export class NotificationsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly dispatcher: NotificationDispatcherService,
  ) {}

  // ─────────────── templates ───────────────
  listTemplates() {
    return this.prisma.notificationTemplate.findMany({ orderBy: { code: 'asc' } });
  }

  async createTemplate(dto: CreateTemplateDto, actorId: string) {
    if (await this.prisma.notificationTemplate.findUnique({ where: { code: dto.code } })) {
      throw new ConflictException({ code: 'CONFLICT', message: 'Template code exists' });
    }
    const tpl = await this.prisma.notificationTemplate.create({
      data: {
        code: dto.code,
        titleTemplate: dto.titleTemplate,
        bodyTemplate: dto.bodyTemplate,
        channelDefaults: (dto.channelDefaults as Prisma.InputJsonValue) ?? undefined,
      },
    });
    await this.audit.record({ actorId, action: AuditAction.CONFIG_CHANGE, entityType: 'notification_template', entityId: tpl.id, after: tpl });
    return tpl;
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto, actorId: string) {
    const before = await this.getTemplateOrThrow(id);
    const after = await this.prisma.notificationTemplate.update({
      where: { id },
      data: {
        titleTemplate: dto.titleTemplate,
        bodyTemplate: dto.bodyTemplate,
        channelDefaults: (dto.channelDefaults as Prisma.InputJsonValue) ?? undefined,
      },
    });
    await this.audit.record({ actorId, action: AuditAction.CONFIG_CHANGE, entityType: 'notification_template', entityId: id, before, after });
    return after;
  }

  async deleteTemplate(id: string, actorId: string) {
    const before = await this.getTemplateOrThrow(id);
    const inUse = await this.prisma.notificationRule.count({ where: { templateId: id } });
    if (inUse > 0) {
      throw new ConflictException({ code: 'CONFLICT', message: 'Template is used by rules' });
    }
    await this.prisma.notificationTemplate.delete({ where: { id } });
    await this.audit.record({ actorId, action: AuditAction.CONFIG_CHANGE, entityType: 'notification_template', entityId: id, before, after: null });
    return { message: 'Template deleted' };
  }

  // ─────────────── rules ───────────────
  listRules() {
    return this.prisma.notificationRule.findMany({ include: { template: true }, orderBy: { eventCode: 'asc' } });
  }

  async createRule(dto: CreateRuleDto, actorId: string) {
    await this.getTemplateOrThrow(dto.templateId);
    const rule = await this.prisma.notificationRule.create({
      data: {
        eventCode: dto.eventCode,
        templateId: dto.templateId,
        channels: dto.channels,
        recipientStrategy: dto.recipientStrategy,
        recipientRoleId: dto.recipientRoleId,
        scheduleCron: dto.scheduleCron,
        isEnabled: dto.isEnabled ?? true,
      },
    });
    await this.audit.record({ actorId, action: AuditAction.CONFIG_CHANGE, entityType: 'notification_rule', entityId: rule.id, after: rule });
    return rule;
  }

  async updateRule(id: string, dto: UpdateRuleDto, actorId: string) {
    const before = await this.getRuleOrThrow(id);
    if (dto.templateId) await this.getTemplateOrThrow(dto.templateId);
    const after = await this.prisma.notificationRule.update({
      where: { id },
      data: {
        eventCode: dto.eventCode,
        templateId: dto.templateId,
        channels: dto.channels,
        recipientStrategy: dto.recipientStrategy,
        recipientRoleId: dto.recipientRoleId,
        scheduleCron: dto.scheduleCron,
        isEnabled: dto.isEnabled,
      },
    });
    await this.audit.record({ actorId, action: AuditAction.CONFIG_CHANGE, entityType: 'notification_rule', entityId: id, before, after });
    return after;
  }

  async deleteRule(id: string, actorId: string) {
    const before = await this.getRuleOrThrow(id);
    await this.prisma.notificationRule.delete({ where: { id } });
    await this.audit.record({ actorId, action: AuditAction.CONFIG_CHANGE, entityType: 'notification_rule', entityId: id, before, after: null });
    return { message: 'Rule deleted' };
  }

  /** Fire a rule with sample data, delivered to the calling admin. */
  async testRule(id: string, data: Record<string, string | number> | undefined, actorId: string) {
    const rule = await this.getRuleOrThrow(id);
    await this.dispatcher.dispatch(rule.eventCode, {
      ownerId: actorId,
      actorId,
      affectedUserIds: [actorId],
      entityType: 'test',
      data: data ?? { test: 'true' },
    });
    return { message: `Test notification for rule "${rule.eventCode}" dispatched` };
  }

  private async getTemplateOrThrow(id: string) {
    const t = await this.prisma.notificationTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Template not found' });
    return t;
  }

  private async getRuleOrThrow(id: string) {
    const r = await this.prisma.notificationRule.findUnique({ where: { id } });
    if (!r) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Rule not found' });
    return r;
  }
}
