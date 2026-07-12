import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CoreModule } from './core/core.module';
import { validateEnv } from './core/config/env.config';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { EnvironmentalModule } from './modules/environmental/environmental.module';
import { SettingsModule } from './modules/settings/settings.module';
import { FilesModule } from './modules/files/files.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { SocialModule } from './modules/social/social.module';
import { GovernanceModule } from './modules/governance/governance.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { DashboardModule } from './modules/dashboards/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    CoreModule,
    HealthModule,
    AuthModule,
    UsersModule,
    DepartmentsModule,
    CategoriesModule,
    EnvironmentalModule,
    SettingsModule,
    FilesModule,
    GamificationModule,
    SocialModule,
    GovernanceModule,
    NotificationsModule,
    ScoringModule,
    DashboardModule,
    ReportsModule,
  ],
})
export class AppModule {}
