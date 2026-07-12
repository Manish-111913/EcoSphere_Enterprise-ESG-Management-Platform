import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { LookupsAdminController } from './lookups-admin.controller';
import { LookupsAdminService } from './lookups-admin.service';
import { ConfigAdminController } from './config-admin.controller';
import { ConfigAdminService } from './config-admin.service';
import { RolesAdminController } from './roles-admin.controller';
import { RolesAdminService } from './roles-admin.service';
import { AuditLogsController } from './audit-logs.controller';

/**
 * Settings & configuration administration (spec §A6.10): app_settings,
 * lookups/values/transitions, ESG weights, scoring configs, approval rules,
 * roles + permission mapping, dashboard configs, and the audit-log viewer.
 */
@Module({
  controllers: [
    SettingsController,
    LookupsAdminController,
    ConfigAdminController,
    RolesAdminController,
    AuditLogsController,
  ],
  providers: [
    SettingsService,
    LookupsAdminService,
    ConfigAdminService,
    RolesAdminService,
  ],
})
export class SettingsModule {}
