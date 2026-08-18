import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  emailOtpVerifySchema,
  mfaConfirmSchema,
  mfaSetupSchema,
  mfaVerifySchema,
  securityPreferencesSchema,
} from "@kenji-government/shared";
import { AuthService } from "./auth.service";
import { LoginDto, RefreshTokenDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./guards/auth.guards";
import { CurrentUser } from "./decorators/current-user.decorator";
import type { AuthUser } from "@kenji-government/shared";
import { MfaService } from "./mfa.service";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mfaService: MfaService,
  ) {}

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(
      dto.email,
      dto.password,
      dto.device_fingerprint,
      dto.user_agent_label,
    );
  }

  @Post("email-otp/verify")
  verifyEmailOtp(@Body() body: unknown) {
    const parsed = emailOtpVerifySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.authService.verifyEmailOtp(
      parsed.data.challenge_token,
      parsed.data.code,
    );
  }

  @Post("mfa/verify")
  verifyMfa(@Body() body: unknown) {
    const parsed = mfaVerifySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.authService.verifyMfa(
      parsed.data.challenge_token,
      parsed.data.code,
    );
  }

  @Post("mfa/setup")
  async setupMfaLogin(@Body() body: unknown) {
    const parsed = mfaSetupSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    if (!parsed.data.challenge_token) {
      throw new BadRequestException("challenge_token is required");
    }
    const user = await this.mfaService.resolveUserFromChallenge(
      parsed.data.challenge_token,
      "mfa_setup",
    );
    return this.mfaService.beginSetup(user.id);
  }

  @Post("mfa/setup/authenticated")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  setupMfaAuthenticated(@CurrentUser() user: AuthUser) {
    return this.mfaService.beginSetup(user.id);
  }

  @Post("mfa/confirm")
  async confirmMfaLogin(@Body() body: unknown) {
    const parsed = mfaConfirmSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    if (!parsed.data.challenge_token) {
      throw new BadRequestException("challenge_token is required");
    }
    return this.authService.confirmMfaSetup(
      parsed.data.challenge_token,
      parsed.data.code,
    );
  }

  @Post("mfa/confirm/authenticated")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  confirmMfaAuthenticated(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = mfaConfirmSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.authService.confirmMfaSetup(
      undefined,
      parsed.data.code,
      user.id,
    );
  }

  @Post("mfa/disable")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  disableMfa(@CurrentUser() user: AuthUser) {
    return this.mfaService.disableMfa(user.id);
  }

  @Get("security-preferences")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getSecurityPreferences(@CurrentUser() user: AuthUser) {
    return this.authService.getSecurityPreferences(user.id);
  }

  @Post("security-preferences")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  updateSecurityPreferences(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = securityPreferencesSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.authService.updateSecurityPreferences(user.id, parsed.data);
  }

  @Post("refresh")
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  logout(@CurrentUser() user: AuthUser) {
    return this.authService.logout(user.id);
  }
}
