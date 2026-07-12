import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { NotificationsService } from './notifications.service';
import { NotificationsAdminService } from './notifications-admin.service';
import {
  CreateRuleDto,
  CreateTemplateDto,
  TestRuleDto,
  UpdateRuleDto,
  UpdateTemplateDto,
} from './dto/notification.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @RequirePermission('notifications:read')
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('unread', new ParseBoolPipe({ optional: true })) unread?: boolean,
  ) {
    return this.notifications.list(user.id, unread ?? false);
  }

  @RequirePermission('notifications:update')
  @Put('read-all')
  readAll(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.markAllRead(user.id);
  }

  @RequirePermission('notifications:update')
  @Put(':id/read')
  read(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notifications.markRead(id, user.id);
  }
}

@SkipAudit()
@Controller()
export class NotificationsAdminController {
  constructor(private readonly admin: NotificationsAdminService) {}

  // templates
  @RequirePermission('notifications:manage')
  @Get('notification-templates')
  listTemplates() {
    return this.admin.listTemplates();
  }

  @RequirePermission('notifications:manage')
  @Post('notification-templates')
  createTemplate(@Body() dto: CreateTemplateDto, @CurrentUser() u: AuthenticatedUser) {
    return this.admin.createTemplate(dto, u.id);
  }

  @RequirePermission('notifications:manage')
  @Put('notification-templates/:id')
  updateTemplate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTemplateDto, @CurrentUser() u: AuthenticatedUser) {
    return this.admin.updateTemplate(id, dto, u.id);
  }

  @RequirePermission('notifications:manage')
  @Delete('notification-templates/:id')
  deleteTemplate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.admin.deleteTemplate(id, u.id);
  }

  // rules
  @RequirePermission('notifications:manage')
  @Get('notification-rules')
  listRules() {
    return this.admin.listRules();
  }

  @RequirePermission('notifications:manage')
  @Post('notification-rules')
  createRule(@Body() dto: CreateRuleDto, @CurrentUser() u: AuthenticatedUser) {
    return this.admin.createRule(dto, u.id);
  }

  @RequirePermission('notifications:manage')
  @Put('notification-rules/:id')
  updateRule(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRuleDto, @CurrentUser() u: AuthenticatedUser) {
    return this.admin.updateRule(id, dto, u.id);
  }

  @RequirePermission('notifications:manage')
  @Delete('notification-rules/:id')
  deleteRule(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.admin.deleteRule(id, u.id);
  }

  @RequirePermission('notifications:manage')
  @Post('notification-rules/:id/test')
  testRule(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TestRuleDto, @CurrentUser() u: AuthenticatedUser) {
    return this.admin.testRule(id, dto.data, u.id);
  }
}
