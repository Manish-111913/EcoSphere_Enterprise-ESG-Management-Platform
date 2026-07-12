import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IssuesService } from './issues.service';

/** Nightly overdue flagger (spec §A10 jobs / W8). */
@Injectable()
export class IssueCronService {
  constructor(private readonly issues: IssuesService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  handleOverdue(): Promise<{ flagged: number }> {
    return this.issues.scanOverdue();
  }
}
