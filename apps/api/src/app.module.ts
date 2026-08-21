import { Module } from "@nestjs/common";
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
import { SettingsModule } from "./settings/settings.module";
import { PaymentsModule } from "./payments/payments.module";
import { RegionalModule } from "./regional/regional.module";
import { NotificationsModule } from "./notifications/notifications.module";

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
    SettingsModule,
    PaymentsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
