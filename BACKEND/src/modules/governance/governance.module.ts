import { Module } from '@nestjs/common';
import { GamificationModule } from '../gamification/gamification.module';
import { PoliciesController } from './policies/policies.controller';
import { PoliciesService } from './policies/policies.service';
import { PolicyCronService } from './policies/policy-cron.service';
import { AuditsController } from './audits/audits.controller';
import { AuditsService } from './audits/audits.service';
import { IssuesController } from './issues/issues.controller';
import { IssuesService } from './issues/issues.service';
import { IssueCronService } from './issues/issue-cron.service';

/**
 * Governance domain: policies (W6), audits (W7), compliance issues (W8).
 * Imports GamificationModule for the shared TransitionService (issue machine).
 */
@Module({
  imports: [GamificationModule],
  controllers: [PoliciesController, AuditsController, IssuesController],
  providers: [
    PoliciesService,
    PolicyCronService,
    AuditsService,
    IssuesService,
    IssueCronService,
  ],
})
export class GovernanceModule {}
