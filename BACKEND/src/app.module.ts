import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreModule } from './core/core.module';
import { validateEnv } from './core/config/env.config';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { EnvironmentalModule } from './modules/environmental/environmental.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    CoreModule,
    HealthModule,
    AuthModule,
    UsersModule,
    DepartmentsModule,
    CategoriesModule,
    EnvironmentalModule,
    SettingsModule,
  ],
})
export class AppModule {}
