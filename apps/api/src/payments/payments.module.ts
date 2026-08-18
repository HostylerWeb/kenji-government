import { Module } from "@nestjs/common";
import { SettingsModule } from "../settings/settings.module";
import { EnforcementModule } from "../enforcement/enforcement.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [SettingsModule, EnforcementModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
