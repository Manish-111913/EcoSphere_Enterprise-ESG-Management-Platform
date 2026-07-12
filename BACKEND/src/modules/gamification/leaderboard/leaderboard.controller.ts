import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import {
  LeaderboardPeriod,
  LeaderboardScope,
  LeaderboardService,
} from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  @RequirePermission('leaderboard:read')
  @Get()
  get(
    @Query('scope') scope: LeaderboardScope = 'individual',
    @Query('period') period: LeaderboardPeriod = 'month',
    @Query('departmentId') departmentId?: string,
  ) {
    const s: LeaderboardScope = scope === 'department' ? 'department' : 'individual';
    const p: LeaderboardPeriod = ['month', 'quarter', 'all'].includes(period) ? period : 'month';
    return this.leaderboard.leaderboard(s, p, departmentId);
  }
}
