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
import { parsePagination, PageQuery } from '../../../common/pagination';
import { CsrService } from './csr.service';
import {
  CreateCsrActivityDto,
  DecisionRemarksDto,
  ProofDto,
  RejectDto,
  UpdateCsrActivityDto,
} from './dto/csr.dto';

@SkipAudit()
@Controller('csr-activities')
export class CsrActivitiesController {
  constructor(private readonly csr: CsrService) {}

  @RequirePermission('csr_activities:read')
  @Get()
  list(
    @Query() query: PageQuery,
    @Query('statusId') statusId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.csr.listActivities(parsePagination(query), { statusId, departmentId });
  }

  @RequirePermission('csr_activities:read')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.csr.getActivity(id);
  }

  @RequirePermission('csr_activities:create')
  @Post()
  create(@Body() dto: CreateCsrActivityDto, @CurrentUser() u: AuthenticatedUser) {
    return this.csr.createActivity(dto, u.id);
  }

  @RequirePermission('csr_activities:update')
  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCsrActivityDto, @CurrentUser() u: AuthenticatedUser) {
    return this.csr.updateActivity(id, dto, u.id);
  }

  @RequirePermission('csr_activities:delete')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.csr.removeActivity(id, u.id);
  }

  @RequirePermission('csr_participations:create')
  @Post(':id/participate')
  participate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.csr.participate(id, u);
  }
}

@SkipAudit()
@Controller('csr-participations')
export class CsrParticipationsController {
  constructor(private readonly csr: CsrService) {}

  @RequirePermission('csr_participations:read')
  @Get()
  list(
    @Query() query: PageQuery,
    @Query('activityId') activityId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('statusId') statusId?: string,
  ) {
    return this.csr.listParticipations(parsePagination(query), { activityId, employeeId, statusId });
  }

  @RequirePermission('csr_participations:create')
  @Post(':id/proof')
  proof(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ProofDto, @CurrentUser() u: AuthenticatedUser) {
    return this.csr.attachProof(id, dto.attachmentId, u);
  }

  @RequirePermission('csr_participations:create')
  @Post(':id/submit')
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.csr.submit(id, u);
  }

  @RequirePermission('csr_participations:approve')
  @Post(':id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DecisionRemarksDto, @CurrentUser() u: AuthenticatedUser) {
    return this.csr.approve(id, dto.remarks, u);
  }

  @RequirePermission('csr_participations:reject')
  @Post(':id/reject')
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectDto, @CurrentUser() u: AuthenticatedUser) {
    return this.csr.reject(id, dto.remarks, u);
  }

  @RequirePermission('csr_participations:withdraw')
  @Post(':id/withdraw')
  withdraw(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.csr.withdraw(id, u);
  }
}
