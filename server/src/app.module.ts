import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { typeOrmAsyncOptions } from './common/database/typeorm.config';
import { validateEnv } from './common/config/env.validation';
import { DatabaseModule } from './common/database/database.module';
import { CorrelationModule } from './common/correlation/correlation.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { MediaModule } from './modules/media/media.module';
import { PoliciesModule } from './modules/policies/policies.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ReportsModule } from './modules/reports/reports.module';
import { HealthModule } from './modules/health/health.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './modules/authorization/guards/permissions.guard';
import { AuditLogInterceptor } from './modules/audit/audit-log.interceptor';
import { ResponseMessageInterceptor } from './common/interceptors/response-message.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv
    }),
    TypeOrmModule.forRootAsync(typeOrmAsyncOptions),
    ScheduleModule.forRoot(),
    DatabaseModule,
    CorrelationModule,
    AuditModule,
    OrganizationsModule,
    AuthModule,
    AuthorizationModule,
    MediaModule,
    PoliciesModule,
    SchedulingModule,
    AttendanceModule,
    ReportsModule,
    HealthModule
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseMessageInterceptor }
  ]
})
export class AppModule {}
