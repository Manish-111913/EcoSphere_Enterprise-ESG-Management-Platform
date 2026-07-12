import { Module } from '@nestjs/common';
import { ScoringController } from './scoring.controller';
import { ScoringService } from './scoring.service';
import { ScoringCronService } from './scoring-cron.service';

@Module({
  controllers: [ScoringController],
  providers: [ScoringService, ScoringCronService],
  exports: [ScoringService],
})
export class ScoringModule {}
