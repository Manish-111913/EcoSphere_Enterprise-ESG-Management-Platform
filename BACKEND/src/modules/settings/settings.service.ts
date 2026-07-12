import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AppSetting, AuditAction, SettingValueType } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { EventBus } from '../../core/events/event-bus';
import { CONFIG_UPDATED_EVENT } from '../../core/config/app-config.service';

export interface SettingView {
  key: string;
  value: unknown;
  valueType: SettingValueType;
  category: string | null;
  description: string | null;
  isPublic: boolean;
}

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventBus,
  ) {}

  /** Admins (settings:read) see all; everyone else sees only public settings. */
  async list(canReadAll: boolean): Promise<SettingView[]> {
    const rows = await this.prisma.appSetting.findMany({
      where: canReadAll ? {} : { isPublic: true },
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
    return rows.map((r) => this.toView(r));
  }

  async update(
    key: string,
    rawValue: unknown,
    actorId: string,
  ): Promise<SettingView> {
    const before = await this.prisma.appSetting.findUnique({ where: { key } });
    if (!before) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: `Unknown setting: ${key}` });
    }
    const serialized = this.validateAndSerialize(rawValue, before.valueType, key);

    const after = await this.prisma.appSetting.update({
      where: { key },
      data: { value: serialized, updatedBy: actorId },
    });
    await this.audit.record({
      actorId,
      action: AuditAction.CONFIG_CHANGE,
      entityType: 'app_setting',
      entityId: key,
      before: this.toView(before),
      after: this.toView(after),
    });
    // cache-bust: AppConfigService + LookupService reload on this event
    this.events.publish(CONFIG_UPDATED_EVENT, { key });
    return this.toView(after);
  }

  private validateAndSerialize(
    value: unknown,
    type: SettingValueType,
    key: string,
  ): string {
    const fail = (msg: string): never => {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: `Setting "${key}": ${msg}`,
      });
    };
    switch (type) {
      case SettingValueType.number: {
        const n = Number(value);
        if (!Number.isFinite(n)) return fail('value must be a number');
        return String(n);
      }
      case SettingValueType.boolean: {
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (value === 'true' || value === 'false') return value;
        return fail('value must be a boolean');
      }
      case SettingValueType.json: {
        try {
          if (typeof value === 'string') {
            JSON.parse(value);
            return value;
          }
          return JSON.stringify(value);
        } catch {
          return fail('value must be valid JSON');
        }
      }
      case SettingValueType.string:
      default:
        return String(value ?? '');
    }
  }

  private toView(row: AppSetting): SettingView {
    return {
      key: row.key,
      value: this.parse(row.value, row.valueType),
      valueType: row.valueType,
      category: row.category,
      description: row.description,
      isPublic: row.isPublic,
    };
  }

  private parse(raw: string | null, type: SettingValueType): unknown {
    if (raw === null) return null;
    switch (type) {
      case SettingValueType.number:
        return Number(raw);
      case SettingValueType.boolean:
        return raw === 'true';
      case SettingValueType.json:
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      default:
        return raw;
    }
  }
}
