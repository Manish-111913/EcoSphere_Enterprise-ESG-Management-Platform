import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AppConfigService } from '../../../core/config/app-config.service';

export type LeaderboardScope = 'individual' | 'department';
export type LeaderboardPeriod = 'month' | 'quarter' | 'all';

export interface RankedRow {
  rank: number;
  id: string;
  name: string;
  department?: string;
  total: number;
}

interface CacheEntry {
  data: RankedRow[];
  expiresAt: number;
}

/** Ledger-computed leaderboard with a short in-memory cache (spec §A6.6). */
@Injectable()
export class LeaderboardService {
  private cache = new Map<string, CacheEntry>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AppConfigService,
  ) {}

  async leaderboard(
    scope: LeaderboardScope,
    period: LeaderboardPeriod,
    departmentId?: string,
  ): Promise<RankedRow[]> {
    const key = `${scope}:${period}:${departmentId ?? ''}`;
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) return cached.data;

    const windowStart = this.windowStart(period);
    const rows =
      scope === 'department'
        ? await this.byDepartment(windowStart)
        : await this.byIndividual(windowStart, departmentId);
    const ranked = rows.map((r, i) => ({ rank: i + 1, ...r }));

    const ttl = this.settings.getNumber('dashboard_cache_ttl', 60) * 1000;
    this.cache.set(key, { data: ranked, expiresAt: now + ttl });
    return ranked;
  }

  private async byIndividual(windowStart: Date, departmentId?: string): Promise<Omit<RankedRow, 'rank'>[]> {
    const deptFilter = departmentId
      ? Prisma.sql`AND u.department_id = ${departmentId}::uuid`
      : Prisma.empty;
    return this.prisma.$queryRaw<Omit<RankedRow, 'rank'>[]>(Prisma.sql`
      SELECT u.id AS id,
             u.first_name || ' ' || u.last_name AS name,
             d.name AS department,
             COALESCE(SUM(x.points), 0)::int AS total
      FROM users u
      JOIN xp_ledger x ON x.employee_id = u.id AND x.entry_type = 'EARN' AND x.created_at >= ${windowStart}
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE u.deleted_at IS NULL ${deptFilter}
      GROUP BY u.id, u.first_name, u.last_name, d.name
      ORDER BY total DESC, MIN(x.created_at) ASC
      LIMIT 100`);
  }

  private async byDepartment(windowStart: Date): Promise<Omit<RankedRow, 'rank'>[]> {
    return this.prisma.$queryRaw<Omit<RankedRow, 'rank'>[]>(Prisma.sql`
      SELECT d.id AS id, d.name AS name,
             COALESCE(SUM(x.points), 0)::int AS total
      FROM departments d
      JOIN users u ON u.department_id = d.id AND u.deleted_at IS NULL
      JOIN xp_ledger x ON x.employee_id = u.id AND x.entry_type = 'EARN' AND x.created_at >= ${windowStart}
      WHERE d.deleted_at IS NULL
      GROUP BY d.id, d.name
      ORDER BY total DESC
      LIMIT 100`);
  }

  private windowStart(period: LeaderboardPeriod): Date {
    const now = new Date();
    if (period === 'all') return new Date(0);
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    if (period === 'quarter') {
      return new Date(Date.UTC(y, Math.floor(m / 3) * 3, 1));
    }
    return new Date(Date.UTC(y, m, 1)); // month
  }
}
