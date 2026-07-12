import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { IsDefined } from 'class-validator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { SettingsService } from './settings.service';

class UpdateSettingDto {
  @IsDefined()
  value!: unknown;
}

@SkipAudit()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  // Any authenticated user; the service filters to the public subset unless
  // the caller holds settings:read (spec §A6.10).
  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.settings.list(user.permissions.includes('settings:read'));
  }

  @RequirePermission('settings:update')
  @Put(':key')
  update(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.settings.update(key, dto.value, actor.id);
  }
}
