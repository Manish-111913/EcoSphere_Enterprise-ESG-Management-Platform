import {
  Body,
  Controller,
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
import { IssuesService } from './issues.service';
import {
  ChangeOwnerDto,
  CreateIssueDto,
  TransitionIssueDto,
  UpdateIssueDto,
} from './dto/issue.dto';

@SkipAudit()
@Controller('compliance-issues')
export class IssuesController {
  constructor(private readonly issues: IssuesService) {}

  @RequirePermission('issues:read')
  @Get()
  list(
    @Query('statusId') statusId?: string,
    @Query('ownerId') ownerId?: string,
    @Query('severityId') severityId?: string,
  ) {
    return this.issues.list({ statusId, ownerId, severityId });
  }

  @RequirePermission('issues:read')
  @Get('overdue')
  overdue() {
    return this.issues.overdue();
  }

  // Admin/ops trigger for the nightly overdue flagger (also runs on cron).
  @RequirePermission('issues:update')
  @Post('scan-overdue')
  scanOverdue() {
    return this.issues.scanOverdue();
  }

  @RequirePermission('issues:read')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.issues.get(id);
  }

  @RequirePermission('issues:create')
  @Post()
  create(@Body() dto: CreateIssueDto, @CurrentUser() u: AuthenticatedUser) {
    return this.issues.create(dto, u.id);
  }

  @RequirePermission('issues:update')
  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateIssueDto, @CurrentUser() u: AuthenticatedUser) {
    return this.issues.update(id, dto, u.id);
  }

  @RequirePermission('issues:update')
  @Put(':id/owner')
  changeOwner(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeOwnerDto, @CurrentUser() u: AuthenticatedUser) {
    return this.issues.changeOwner(id, dto.ownerId, u.id);
  }

  @RequirePermission('issues:transition')
  @Post(':id/transition')
  transition(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TransitionIssueDto, @CurrentUser() u: AuthenticatedUser) {
    return this.issues.transition(id, dto.toStatus, dto.resolutionNotes, u);
  }
}
