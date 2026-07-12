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
import { AuditsService } from './audits.service';
import { CompleteAuditDto, CreateAuditDto, UpdateAuditDto } from './dto/audit.dto';

@SkipAudit()
@Controller('audits')
export class AuditsController {
  constructor(private readonly audits: AuditsService) {}

  @RequirePermission('audits:read')
  @Get()
  list(@Query('statusId') statusId?: string, @Query('departmentId') departmentId?: string) {
    return this.audits.list({ statusId, departmentId });
  }

  @RequirePermission('audits:read')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.audits.get(id);
  }

  @RequirePermission('audits:read')
  @Get(':id/issues')
  issues(@Param('id', ParseUUIDPipe) id: string) {
    return this.audits.issues(id);
  }

  @RequirePermission('audits:create')
  @Post()
  create(@Body() dto: CreateAuditDto, @CurrentUser() u: AuthenticatedUser) {
    return this.audits.create(dto, u.id);
  }

  @RequirePermission('audits:update')
  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAuditDto, @CurrentUser() u: AuthenticatedUser) {
    return this.audits.update(id, dto, u.id);
  }

  @RequirePermission('audits:execute')
  @Post(':id/start')
  start(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.audits.start(id, u.id);
  }

  @RequirePermission('audits:execute')
  @Post(':id/complete')
  complete(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CompleteAuditDto, @CurrentUser() u: AuthenticatedUser) {
    return this.audits.complete(id, dto, u.id);
  }
}
