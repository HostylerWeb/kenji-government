import { Module } from "@nestjs/common";
import {
  EnforcementController,
  OperatorEnforcementController,
} from "./enforcement.controller";
import { EnforcementService } from "./enforcement.service";

@Module({
  controllers: [EnforcementController, OperatorEnforcementController],
  providers: [EnforcementService],
  exports: [EnforcementService],
})
export class EnforcementModule {}
