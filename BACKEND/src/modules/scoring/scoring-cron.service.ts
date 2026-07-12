import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScoringService } from './scoring.service';

/** Scheduled score recompute (spec §A10 jobs / W9-W10). */
@Injectable()
export class ScoringCronService {
  private readonly logger = new Logger(ScoringCronService.name);

  constructor(private readonly scoring: ScoringService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleRecompute(): Promise<void> {
    const end = new Date();
    const start = new Date(new Date(end).setFullYear(end.getFullYear() - 1));
    const res = await this.scoring.recompute(start, end, null);
    this.logger.log(`scheduled recompute: org total=${res.org.total}`);
  }
}
