import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationRule,
  NotificationTemplate,
  Prisma,
  RecipientStrategy,
} from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AppConfigService } from '../../core/config/app-config.service';
import { EventBus } from '../../core/events/event-bus';
import { MailService } from '../../core/mail/mail.service';
import {
  BADGE_AWARDED,
  CHALLENGE_DECIDED,
  CSR_DECIDED,
  ISSUE_OVERDUE,
  ISSUE_RAISED,
  POLICY_REMINDER,
} from '../../common/domain-events';
import { NotificationEvent } from './notification-event';

type RuleWithTemplate = NotificationRule & { template: NotificationTemplate };

/**
 * W11: domain event → enabled notification_rules by event_code → recipient
 * strategy → template render → in-app rows (+ email adapter). Events are the
 * post-commit signals emitted by the domain services.
 */
@Injectable()
export class NotificationDispatcherService implements OnModuleInit {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  // All mandatory events wired here (spec §B5.4).
  private static readonly EVENTS = [
    ISSUE_RAISED,
    CSR_DECIDED,
    CHALLENGE_DECIDED,
    BADGE_AWARDED,
    POLICY_REMINDER,
    ISSUE_OVERDUE,
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AppConfigService,
    private readonly events: EventBus,
    private readonly mail: MailService,
  ) {}

  onModuleInit(): void {
    for (const code of NotificationDispatcherService.EVENTS) {
      this.events.on<NotificationEvent>(code, (payload) =>
        this.dispatch(code, payload),
      );
    }
  }

  async dispatch(eventCode: string, payload: NotificationEvent): Promise<void> {
    const rules = (await this.prisma.notificationRule.findMany({
      where: { eventCode, isEnabled: true },
      include: { template: true },
    })) as RuleWithTemplate[];

    for (const rule of rules) {
      const recipientIds = await this.resolveRecipients(rule, payload);
      if (recipientIds.length === 0) continue;

      const users = await this.prisma.user.findMany({
        where: { id: { in: recipientIds }, isActive: true, deletedAt: null },
        select: { id: true, email: true, firstName: true, lastName: true },
      });
      const channels = this.channels(rule);
      const emailEnabled =
        channels.includes('EMAIL') &&
        this.settings.getBoolean('email_notifications_enabled', false);

      const rows: Prisma.NotificationCreateManyInput[] = [];
      for (const u of users) {
        const data = {
          ...(payload.data ?? {}),
          employee_name: `${u.firstName} ${u.lastName}`,
        };
        const title = this.render(rule.template.titleTemplate, data);
        const body = this.render(rule.template.bodyTemplate, data);

        if (channels.includes('IN_APP')) {
          rows.push({
            userId: u.id,
            ruleId: rule.id,
            title,
            body,
            eventCode,
            entityType: payload.entityType ?? null,
            entityId: payload.entityId ?? null,
            channel: NotificationChannel.IN_APP,
          });
        }
        if (emailEnabled) {
          void this.mail.send({ to: u.email, subject: title, body });
        }
      }
      if (rows.length) {
        await this.prisma.notification.createMany({ data: rows });
      }
    }
  }

  private async resolveRecipients(
    rule: RuleWithTemplate,
    payload: NotificationEvent,
  ): Promise<string[]> {
    switch (rule.recipientStrategy) {
      case RecipientStrategy.ACTOR:
        return payload.actorId ? [payload.actorId] : [];
      case RecipientStrategy.OWNER:
        return payload.ownerId ? [payload.ownerId] : [];
      case RecipientStrategy.ALL_AFFECTED:
        return payload.affectedUserIds ?? [];
      case RecipientStrategy.ROLE: {
        if (!rule.recipientRoleId) return [];
        const rows = await this.prisma.userRole.findMany({
          where: { roleId: rule.recipientRoleId },
          select: { userId: true },
        });
        return rows.map((r) => r.userId);
      }
      case RecipientStrategy.DEPARTMENT_HEAD: {
        if (!payload.departmentId) return [];
        const dept = await this.prisma.department.findUnique({
          where: { id: payload.departmentId },
          select: { headUserId: true },
        });
        return dept?.headUserId ? [dept.headUserId] : [];
      }
      default:
        return [];
    }
  }

  private channels(rule: RuleWithTemplate): string[] {
    const raw = rule.channels;
    return Array.isArray(raw) ? (raw as string[]) : [];
  }

  private render(template: string, data: Record<string, string | number>): string {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) =>
      key in data ? String(data[key]) : '',
    );
  }
}
