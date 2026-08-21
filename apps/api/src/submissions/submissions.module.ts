import { Module } from "@nestjs/common";
import {
  SubmissionsController,
  OperatorSubmissionsController,
} from "./submissions.controller";
import { SubmissionsService } from "./submissions.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [SubmissionsController, OperatorSubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
