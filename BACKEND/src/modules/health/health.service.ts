import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

export interface HealthReport {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
  version: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly version: string =
    process.env.npm_package_version ?? '0.1.0';

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthReport> {
    let db: 'up' | 'down' = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = 'up';
    } catch (err) {
      this.logger.error('Database health check failed', err as Error);
    }

    return {
      status: db === 'up' ? 'ok' : 'degraded',
      db,
      version: this.version,
    };
  }
}
