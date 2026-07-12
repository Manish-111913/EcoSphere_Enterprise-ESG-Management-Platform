import { Module } from '@nestjs/common';
import { GamificationModule } from '../gamification/gamification.module';
import {
  CsrActivitiesController,
  CsrParticipationsController,
} from './csr/csr.controller';
import { CsrService } from './csr/csr.service';
import { DiversityController } from './diversity/diversity.controller';
import { DiversityService } from './diversity/diversity.service';
import { TrainingController } from './training/training.controller';
import { TrainingService } from './training/training.service';

/**
 * Social domain: CSR (W2 approval → XP), diversity, training.
 * Imports GamificationModule for the shared XP + approval-policy services.
 */
@Module({
  imports: [GamificationModule],
  controllers: [
    CsrActivitiesController,
    CsrParticipationsController,
    DiversityController,
    TrainingController,
  ],
  providers: [CsrService, DiversityService, TrainingService],
})
export class SocialModule {}
