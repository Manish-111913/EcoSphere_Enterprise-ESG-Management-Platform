import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { SkipAudit } from '../../../common/decorators/skip-audit.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { RewardsService } from './rewards.service';
import { CreateRewardDto, UpdateRewardDto } from './dto/reward.dto';

@SkipAudit()
@Controller()
export class RewardsController {
  constructor(private readonly rewards: RewardsService) {}

  @RequirePermission('rewards:read')
  @Get('rewards')
  list() {
    return this.rewards.list();
  }

  @RequirePermission('rewards:create')
  @Post('rewards')
  create(@Body() dto: CreateRewardDto, @CurrentUser() u: AuthenticatedUser) {
    return this.rewards.create(dto, u.id);
  }

  @RequirePermission('rewards:update')
  @Put('rewards/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRewardDto, @CurrentUser() u: AuthenticatedUser) {
    return this.rewards.update(id, dto, u.id);
  }

  @RequirePermission('rewards:delete')
  @Delete('rewards/:id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.rewards.remove(id, u.id);
  }

  @RequirePermission('rewards:redeem')
  @Post('rewards/:id/redeem')
  redeem(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.rewards.redeem(id, u);
  }

  @RequirePermission('rewards:read')
  @Get('redemptions')
  redemptions(
    @Query('employee') employeeId?: string,
    @Query('statusId') statusId?: string,
  ) {
    return this.rewards.listRedemptions({ employeeId, statusId });
  }

  @RequirePermission('rewards:fulfill')
  @Post('redemptions/:id/fulfill')
  fulfill(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.rewards.fulfill(id, u.id);
  }

  @RequirePermission('rewards:fulfill')
  @Post('redemptions/:id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.rewards.cancel(id, u.id);
  }
}
