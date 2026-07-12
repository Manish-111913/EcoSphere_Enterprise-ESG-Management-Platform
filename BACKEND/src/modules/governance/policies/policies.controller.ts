import {
  Body,
  Controller,
  Get,
  Ip,
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
import { PoliciesService } from './policies.service';
import { CreatePolicyDto, UpdatePolicyDto } from './dto/policy.dto';

@SkipAudit()
@Controller('policies')
export class PoliciesController {
  constructor(private readonly policies: PoliciesService) {}

  @RequirePermission('policies:read')
  @Get()
  list(@Query('statusId') statusId?: string) {
    return this.policies.list({ statusId });
  }

  @RequirePermission('policies:read')
  @Get('pending-acknowledgement')
  pending(@CurrentUser() user: AuthenticatedUser) {
    return this.policies.pendingForUser(user);
  }

  @RequirePermission('policies:read')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.policies.get(id);
  }

  @RequirePermission('policies:read')
  @Get(':id/acknowledgements')
  acks(@Param('id', ParseUUIDPipe) id: string) {
    return this.policies.acknowledgements(id);
  }

  // Admin/ops trigger for the reminder scanner (also runs on cron).
  @RequirePermission('policies:update')
  @Post('run-reminders')
  runReminders() {
    return this.policies.reminderScan();
  }

  @RequirePermission('policies:create')
  @Post()
  create(@Body() dto: CreatePolicyDto, @CurrentUser() u: AuthenticatedUser) {
    return this.policies.create(dto, u.id);
  }

  @RequirePermission('policies:update')
  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePolicyDto, @CurrentUser() u: AuthenticatedUser) {
    return this.policies.update(id, dto, u.id);
  }

  @RequirePermission('policies:publish')
  @Post(':id/publish')
  publish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.policies.publish(id, u.id);
  }

  @RequirePermission('policies:acknowledge')
  @Post(':id/acknowledge')
  acknowledge(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthenticatedUser, @Ip() ip: string) {
    return this.policies.acknowledge(id, u, ip);
  }
}
