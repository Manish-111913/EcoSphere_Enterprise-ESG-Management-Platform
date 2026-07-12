import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChallengesService } from './challenges.service';

/** Nightly-ish deadline scanner (spec W3): Active past deadline → Under Review. */
@Injectable()
export class ChallengeCronService {
  constructor(private readonly challenges: ChallengesService) {}

  @Cron(CronExpression.EVERY_HOUR)
  handleDeadlines(): Promise<number> {
    return this.challenges.transitionExpired();
  }
}
