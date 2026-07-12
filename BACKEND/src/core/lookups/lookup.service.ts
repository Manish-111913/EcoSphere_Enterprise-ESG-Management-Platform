import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventBus } from '../events/event-bus';
import { CONFIG_UPDATED_EVENT } from '../config/app-config.service';

export interface LookupValueView {
  id: string;
  typeCode: string;
  code: string;
  label: string;
  metadata: unknown;
}

/**
 * Caches lookup_values so services can resolve status/severity/unit ids by
 * (typeCode, code) without hardcoding UUIDs (spec §A2 "nothing hardcoded").
 * Reloads on `config.updated`.
 */
@Injectable()
export class LookupService implements OnModuleInit {
  private readonly logger = new Logger(LookupService.name);
  private byKey = new Map<string, LookupValueView>(); // `${type}:${code}`
  private byId = new Map<string, LookupValueView>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
  ) {}

  async onModuleInit(): Promise<void> {
    this.events.on(CONFIG_UPDATED_EVENT, () => this.reload());
    await this.reload();
  }

  async reload(): Promise<void> {
    const values = await this.prisma.lookupValue.findMany({
      include: { lookupType: true },
    });
    const key = new Map<string, LookupValueView>();
    const id = new Map<string, LookupValueView>();
    for (const v of values) {
      const view: LookupValueView = {
        id: v.id,
        typeCode: v.lookupType.code,
        code: v.code,
        label: v.label,
        metadata: v.metadata,
      };
      key.set(`${view.typeCode}:${view.code}`, view);
      id.set(v.id, view);
    }
    this.byKey = key;
    this.byId = id;
    this.logger.log(`Loaded ${id.size} lookup values`);
  }

  id(typeCode: string, code: string): string {
    const v = this.byKey.get(`${typeCode}:${code}`);
    if (!v) throw new Error(`unknown lookup ${typeCode}:${code}`);
    return v.id;
  }

  byIdOrNull(id: string | null | undefined): LookupValueView | null {
    return id ? (this.byId.get(id) ?? null) : null;
  }
}
