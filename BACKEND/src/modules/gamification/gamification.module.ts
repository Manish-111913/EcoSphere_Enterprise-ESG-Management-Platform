import { Module } from '@nestjs/common';
import { XpService } from './xp/xp.service';
import { ApprovalPolicyService } from './shared/approval-policy.service';
import { TransitionService } from './shared/transition.service';
import {
  ChallengesController,
  ChallengeParticipationsController,
} from './challenges/challenges.controller';
import { ChallengesService } from './challenges/challenges.service';
import { ChallengeCronService } from './challenges/challenge-cron.service';
import { BadgesController } from './badges/badges.controller';
import { BadgeService } from './badges/badge.service';
import { RewardsController } from './rewards/rewards.controller';
import { RewardsService } from './rewards/rewards.service';
import { LeaderboardController } from './leaderboard/leaderboard.controller';
import { LeaderboardService } from './leaderboard/leaderboard.service';

/**
 * Gamification domain: XP ledger, challenges (W3), badges (W4), rewards +
 * redemption (W5), leaderboard. Exports XP + approval policy for the social
 * domain (CSR) which shares the W2 approval pattern.
 */
@Module({
  controllers: [
    ChallengesController,
    ChallengeParticipationsController,
    BadgesController,
    RewardsController,
    LeaderboardController,
  ],
  providers: [
    XpService,
    ApprovalPolicyService,
    TransitionService,
    ChallengesService,
    ChallengeCronService,
    BadgeService,
    RewardsService,
    LeaderboardService,
  ],
  exports: [XpService, ApprovalPolicyService, TransitionService],
})
export class GamificationModule {}
