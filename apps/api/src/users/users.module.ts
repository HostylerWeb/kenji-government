import { Module } from "@nestjs/common";
import { UsersController, OperatorSitesController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  controllers: [UsersController, OperatorSitesController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
