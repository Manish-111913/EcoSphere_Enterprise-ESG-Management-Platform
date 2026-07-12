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
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { ConfigAdminService } from './config-admin.service';
import {
  CreateApprovalRuleDto,
  CreateDashboardConfigDto,
  CreateEsgWeightsDto,
  UpdateApprovalRuleDto,
  UpdateDashboardConfigDto,
  UpdateScoringConfigsDto,
} from './dto/config-admin.dto';

@SkipAudit()
@Controller()
export class ConfigAdminController {
  constructor(private readonly config: ConfigAdminService) {}

  // ESG weights
  @RequirePermission('settings:read')
  @Get('esg-weights')
  listWeights() {
    return this.config.listWeights();
  }

  @RequirePermission('settings:update')
  @Post('esg-weights')
  createWeights(
    @Body() dto: CreateEsgWeightsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.config.createWeights(dto, actor.id);
  }

  // Scoring configs
  @RequirePermission('settings:read')
  @Get('scoring-configs')
  listScoring() {
    return this.config.listScoringConfigs();
  }

  @RequirePermission('settings:update')
  @Put('scoring-configs')
  updateScoring(
    @Body() dto: UpdateScoringConfigsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.config.updateScoringConfigs(dto, actor.id);
  }

  // Approval rules
  @RequirePermission('settings:read')
  @Get('approval-rules')
  listApproval() {
    return this.config.listApprovalRules();
  }

  @RequirePermission('settings:update')
  @Post('approval-rules')
  createApproval(
    @Body() dto: CreateApprovalRuleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.config.createApprovalRule(dto, actor.id);
  }

  @RequirePermission('settings:update')
  @Put('approval-rules/:id')
  updateApproval(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApprovalRuleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.config.updateApprovalRule(id, dto, actor.id);
  }

  @RequirePermission('settings:update')
  @Delete('approval-rules/:id')
  deleteApproval(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.config.deleteApprovalRule(id, actor.id);
  }

  // Dashboard widget configs
  @RequirePermission('settings:read')
  @Get('dashboard-configs')
  listDashboard(@Query('roleId') roleId?: string) {
    return this.config.listDashboardConfigs(roleId);
  }

  @RequirePermission('settings:update')
  @Post('dashboard-configs')
  createDashboard(
    @Body() dto: CreateDashboardConfigDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.config.createDashboardConfig(dto, actor.id);
  }

  @RequirePermission('settings:update')
  @Put('dashboard-configs/:id')
  updateDashboard(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDashboardConfigDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.config.updateDashboardConfig(id, dto, actor.id);
  }

  @RequirePermission('settings:update')
  @Delete('dashboard-configs/:id')
  deleteDashboard(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.config.deleteDashboardConfig(id, actor.id);
  }
}
