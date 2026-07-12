import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventBus } from '../events/event-bus';

export const CONFIG_UPDATED_EVENT = 'config.updated';

/**
 * DB-backed configuration (spec §A4). Reads app_settings into an in-memory
 * cache; busts + reloads on the `config.updated` event. All business config
 * (toggles, thresholds, expiries, limits) is read through here — never from
 * process.env and never hardcoded.
 */
@Injectable()
export class AppConfigService implements OnModuleInit {
  private readonly logger = new Logger(AppConfigService.name);
  private cache = new Map<string, unknown>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
  ) {}

  async onModuleInit(): Promise<void> {
    this.events.on(CONFIG_UPDATED_EVENT, () => this.reload());
    await this.reload();
  }

  /** Reload the whole settings cache from the database. */
  async reload(): Promise<void> {
    const rows = await this.prisma.appSetting.findMany();
    const next = new Map<string, unknown>();
    for (const row of rows) {
      next.set(row.key, this.parse(row.value, row.valueType));
    }
    this.cache = next;
    this.logger.log(`Loaded ${next.size} settings into cache`);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  get<T = unknown>(key: string, fallback?: T): T {
    const value = this.cache.get(key);
    return (value === undefined ? fallback : value) as T;
  }

  getString(key: string, fallback = ''): string {
    const v = this.cache.get(key);
    return v === undefined || v === null ? fallback : String(v);
  }

  getNumber(key: string, fallback = 0): number {
    const v = this.cache.get(key);
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  getBoolean(key: string, fallback = false): boolean {
    const v = this.cache.get(key);
    return typeof v === 'boolean' ? v : fallback;
  }

  getJson<T>(key: string, fallback: T): T {
    const v = this.cache.get(key);
    return (v === undefined ? fallback : v) as T;
  }

  private parse(
    raw: string | null,
    valueType: 'string' | 'number' | 'boolean' | 'json',
  ): unknown {
    if (raw === null) return null;
    switch (valueType) {
      case 'number':
        return Number(raw);
      case 'boolean':
        return raw === 'true' || raw === '1';
      case 'json':
        try {
          return JSON.parse(raw);
        } catch {
          this.logger.warn(`setting parse failed (json): "${raw}"`);
          return null;
        }
      case 'string':
      default:
        return raw;
    }
  }
}
