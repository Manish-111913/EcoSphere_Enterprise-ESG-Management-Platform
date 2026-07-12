import { Body, Controller, Post } from '@nestjs/common';
import { IsOptional, IsDateString } from 'class-validator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { ScoringService } from './scoring.service';

class RecomputeDto {
  @IsOptional() @IsDateString() periodStart?: string;
  @IsOptional() @IsDateString() periodEnd?: string;
}

@SkipAudit()
@Controller('scores')
export class ScoringController {
  constructor(private readonly scoring: ScoringService) {}

  /** Admin, synchronous — returns the recomputed rows (spec §A6.10 ops). */
  @RequirePermission('scores:recompute')
  @Post('recompute')
  recompute(@Body() dto: RecomputeDto, @CurrentUser() actor: AuthenticatedUser) {
    const end = dto.periodEnd ? new Date(dto.periodEnd) : new Date();
    const start = dto.periodStart
      ? new Date(dto.periodStart)
      : new Date(new Date(end).setFullYear(end.getFullYear() - 1));
    return this.scoring.recompute(start, end, actor.id);
  }
}
