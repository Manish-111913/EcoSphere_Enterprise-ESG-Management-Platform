import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @RequirePermission('dashboards:read')
  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.summary(user);
  }

  @RequirePermission('dashboards:read')
  @Get('carbon-trend')
  carbonTrend(
    @CurrentUser() user: AuthenticatedUser,
    @Query('months', new DefaultValuePipe(12), ParseIntPipe) months: number,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.dashboard.carbonTrend(months, departmentId, user);
  }

  @RequirePermission('dashboards:read')
  @Get('department-rankings')
  rankings(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.departmentRankings(user);
  }

  @RequirePermission('dashboards:read')
  @Get('csr-trend')
  csrTrend(
    @CurrentUser() user: AuthenticatedUser,
    @Query('months', new DefaultValuePipe(6), ParseIntPipe) months: number,
  ) {
    return this.dashboard.csrTrend(months, user);
  }

  @RequirePermission('dashboards:read')
  @Get('activity-feed')
  activityFeed(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit', new DefaultValuePipe(15), ParseIntPipe) limit: number,
  ) {
    return this.dashboard.activityFeed(limit, user);
  }

  @RequirePermission('dashboards:read')
  @Get('pending-approvals')
  pendingApprovals(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.pendingApprovals(user);
  }
}
