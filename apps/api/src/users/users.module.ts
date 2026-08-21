import { Module } from "@nestjs/common";
import { UsersController, OperatorSitesController } from "./users.controller";
import { UsersService } from "./users.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [UsersController, OperatorSitesController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
