import { Module } from "@nestjs/common";
import { OperatorsController } from "./operators.controller";
import { OperatorsService } from "./operators.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [OperatorsController],
  providers: [OperatorsService],
})
export class OperatorsModule {}
