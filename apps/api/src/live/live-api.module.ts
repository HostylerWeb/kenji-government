import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { LiveModule } from "./live.module";
import { LiveController } from "./live.controller";

@Module({
  imports: [LiveModule, AuthModule],
  controllers: [LiveController],
})
export class LiveApiModule {}
