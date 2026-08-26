import { Module } from "@nestjs/common";
import { IntegrationsController } from "./integrations.controller";
import { ApplicationsController } from "./applications.controller";
import { IntegrationsService } from "./integrations.service";
import { AuditModule } from "../audit/audit.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [AuditModule, UsersModule],
  controllers: [IntegrationsController, ApplicationsController],
  providers: [IntegrationsService],
})
export class IntegrationsModule {}
