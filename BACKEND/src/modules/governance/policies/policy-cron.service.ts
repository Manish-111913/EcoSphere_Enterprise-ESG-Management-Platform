import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PoliciesService } from './policies.service';

/** Daily policy acknowledgement reminder scanner (spec §A10 jobs / W6). */
@Injectable()
export class PolicyCronService {
  constructor(private readonly policies: PoliciesService) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  handleReminders(): Promise<{ policies: number; reminded: number }> {
    return this.policies.reminderScan();
  }
}
