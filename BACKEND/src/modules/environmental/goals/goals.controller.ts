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
import { GoalsService } from './goals.service';
import { CreateGoalDto, UpdateGoalDto } from './dto/goal.dto';

@SkipAudit()
@Controller('environmental-goals')
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @RequirePermission('goals:read')
  @Get()
  list(
    @Query('departmentId') departmentId?: string,
    @Query('statusId') statusId?: string,
  ) {
    return this.goals.list({ departmentId, statusId });
  }

  @RequirePermission('goals:read')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.goals.get(id);
  }

  @RequirePermission('goals:read')
  @Get(':id/progress')
  progress(@Param('id', ParseUUIDPipe) id: string) {
    return this.goals.progress(id);
  }

  @RequirePermission('goals:create')
  @Post()
  create(@Body() dto: CreateGoalDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.goals.create(dto, actor.id);
  }

  @RequirePermission('goals:update')
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGoalDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.goals.update(id, dto, actor.id);
  }

  @RequirePermission('goals:delete')
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.goals.remove(id, actor.id);
  }
}
