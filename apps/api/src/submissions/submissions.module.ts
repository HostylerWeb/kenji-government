import { Module } from "@nestjs/common";
import {
  SubmissionsController,
  OperatorSubmissionsController,
} from "./submissions.controller";
import { SubmissionsService } from "./submissions.service";

@Module({
  controllers: [SubmissionsController, OperatorSubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
