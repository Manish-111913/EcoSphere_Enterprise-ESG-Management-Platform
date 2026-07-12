import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppConfigModule } from './config/app-config.module';
import { EventsModule } from './events/events.module';
import { PrismaModule } from './prisma/prisma.module';
import { LookupModule } from './lookups/lookup.module';
import { SecurityModule } from './security/security.module';
import { AuditModule } from './audit/audit.module';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';

/**
 * Cross-cutting foundation: DB access, in-process events, DB-backed config,
 * lookup cache, security (JWT + RBAC guards), correlation-id middleware,
 * request logging, and the audit-log interceptor. Imported once by AppModule.
 */
@Module({
  imports: [
    PrismaModule,
    EventsModule,
    AppConfigModule,
    LookupModule,
    SecurityModule,
    AuditModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
  exports: [
    PrismaModule,
    EventsModule,
    AppConfigModule,
    LookupModule,
    SecurityModule,
    AuditModule,
  ],
})
export class CoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
