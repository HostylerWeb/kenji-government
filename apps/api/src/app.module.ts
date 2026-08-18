import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";
import { StorageModule } from "./storage/storage.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { OperatorsModule } from "./operators/operators.module";
import { LicencesModule } from "./licences/licences.module";
import { AuditModule } from "./audit/audit.module";
import { SubmissionsModule } from "./submissions/submissions.module";
import { EnforcementModule } from "./enforcement/enforcement.module";
import { ComplianceModule } from "./compliance/compliance.module";
import { DocumentsModule } from "./documents/documents.module";
import { UsersModule } from "./users/users.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { LiveApiModule } from "./live/live-api.module";
import { ReportsModule } from "./reports/reports.module";
import { RegionalModule } from "./regional/regional.module";
import { AuditInterceptor } from "./audit/audit.interceptor";

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    HealthModule,
    AuthModule,
    OperatorsModule,
    LicencesModule,
    AuditModule,
    SubmissionsModule,
    EnforcementModule,
    ComplianceModule,
    DocumentsModule,
    UsersModule,
    DashboardModule,
    LiveApiModule,
    ReportsModule,
    RegionalModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
