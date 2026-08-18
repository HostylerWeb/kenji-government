import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { MfaService } from "./mfa.service";
import { DeviceTrustService } from "./device-trust.service";
import { EmailOtpService } from "./email-otp.service";
import { JwtStrategy } from "./jwt.strategy";
import { AuditModule } from "../audit/audit.module";
import { SettingsModule } from "../settings/settings.module";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({}),
    AuditModule,
    SettingsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    MfaService,
    DeviceTrustService,
    EmailOtpService,
    JwtStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
