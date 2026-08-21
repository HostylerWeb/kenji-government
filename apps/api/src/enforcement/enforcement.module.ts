import { Module } from "@nestjs/common";
import {
  EnforcementController,
  OperatorEnforcementController,
} from "./enforcement.controller";
import { EnforcementService } from "./enforcement.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [EnforcementController, OperatorEnforcementController],
  providers: [EnforcementService],
  exports: [EnforcementService],
})
export class EnforcementModule {}
