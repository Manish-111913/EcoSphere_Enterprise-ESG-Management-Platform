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
import { BadgeService } from './badge.service';
import {
  CreateBadgeDto,
  ManualAwardDto,
  ReevaluateDto,
  UpdateBadgeDto,
} from './dto/badge.dto';

@SkipAudit()
@Controller()
export class BadgesController {
  constructor(private readonly badges: BadgeService) {}

  @RequirePermission('badges:read')
  @Get('badges')
  list() {
    return this.badges.list();
  }

  @RequirePermission('badges:read')
  @Get('badge-awards')
  awards(@Query('employee') employeeId?: string) {
    return this.badges.listAwards(employeeId);
  }

  @RequirePermission('badges:create')
  @Post('badges')
  create(@Body() dto: CreateBadgeDto, @CurrentUser() u: AuthenticatedUser) {
    return this.badges.create(dto, u.id);
  }

  @RequirePermission('badges:update')
  @Put('badges/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBadgeDto, @CurrentUser() u: AuthenticatedUser) {
    return this.badges.update(id, dto, u.id);
  }

  @RequirePermission('badges:delete')
  @Delete('badges/:id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.badges.remove(id, u.id);
  }

  @RequirePermission('badges:award')
  @Post('badges/:id/award')
  award(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ManualAwardDto, @CurrentUser() u: AuthenticatedUser) {
    return this.badges.manualAward(id, dto.employeeId, u.id);
  }

  @RequirePermission('badges:award')
  @Post('badges/reevaluate')
  reevaluate(@Body() dto: ReevaluateDto) {
    return this.badges.reevaluate(dto.employeeId);
  }
}
