import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import type {
  AuthResponse,
  AuthUser,
  LoginResponse,
  SecurityPreferences,
  SecurityPreferencesInput,
} from "@kenji-government/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { MfaService } from "./mfa.service";
import { DeviceTrustService } from "./device-trust.service";
import { EmailOtpService } from "./email-otp.service";

type LoginChallengePayload = {
  sub: string;
  email: string;
  type: "login_challenge";
  device_fingerprint_hash: string;
  email_otp_verified: boolean;
  user_agent_label?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly mfa: MfaService,
    private readonly devices: DeviceTrustService,
    private readonly emailOtp: EmailOtpService,
  ) {}

  async login(
    email: string,
    password: string,
    deviceFingerprint?: string,
    userAgentLabel?: string,
  ): Promise<LoginResponse | AuthResponse> {
    const user = await this.prisma.client.users.findUnique({
      where: { email },
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const authUser = this.mfa.toAuthUser(user);
    const fpHash = deviceFingerprint
      ? this.devices.hashFingerprint(deviceFingerprint)
      : "";

    const deviceTrusted =
      fpHash ? await this.devices.isDeviceTrusted(user.id, fpHash) : true;

    const needsEmailOtp =
      user.email_otp_new_device_enabled &&
      fpHash &&
      !deviceTrusted;

    const needsTotp = user.mfa_enabled;

    if (needsEmailOtp) {
      await this.emailOtp.sendLoginOtp(user.id, user.email);
      return {
        status: "email_otp_required",
        challenge_token: this.issueLoginChallenge(
          user.id,
          user.email,
          fpHash,
          false,
          userAgentLabel,
        ),
        user: authUser,
        message: "Verification code sent to your email address.",
      };
    }

    if (needsTotp) {
      return {
        status: "mfa_required",
        challenge_token: this.issueLoginChallenge(
          user.id,
          user.email,
          fpHash,
          true,
          userAgentLabel,
        ),
        user: authUser,
      };
    }

    return this.completeLogin(user, fpHash, userAgentLabel);
  }

  async verifyEmailOtp(
    challengeToken: string,
    code: string,
  ): Promise<LoginResponse | AuthResponse> {
    const payload = this.verifyLoginChallenge(challengeToken);
    if (payload.email_otp_verified) {
      throw new UnauthorizedException("Email already verified");
    }

    await this.emailOtp.verifyLoginOtp(payload.sub, code);

    const user = await this.prisma.client.users.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.is_active) {
      throw new UnauthorizedException("User not found");
    }

    const authUser = this.mfa.toAuthUser(user);

    if (user.mfa_enabled) {
      return {
        status: "mfa_required",
        challenge_token: this.issueLoginChallenge(
          user.id,
          user.email,
          payload.device_fingerprint_hash,
          true,
          payload.user_agent_label,
        ),
        user: authUser,
      };
    }

    return this.completeLogin(
      user,
      payload.device_fingerprint_hash,
      payload.user_agent_label,
    );
  }

  async verifyMfa(challengeToken: string, code: string): Promise<AuthResponse> {
    const payload = this.parseChallengeToken(challengeToken);

    let userId: string;
    let fpHash = "";
    let userAgentLabel: string | undefined;

    if (payload.type === "login_challenge") {
      if (!payload.email_otp_verified) {
        const user = await this.prisma.client.users.findUnique({
          where: { id: payload.sub },
        });
        if (user?.email_otp_new_device_enabled) {
          throw new UnauthorizedException("Email verification required first");
        }
      }
      userId = payload.sub;
      fpHash = payload.device_fingerprint_hash;
      userAgentLabel = payload.user_agent_label;
    } else if (payload.type === "mfa_challenge") {
      userId = payload.sub;
    } else {
      throw new UnauthorizedException("Invalid challenge token");
    }

    const user = await this.prisma.client.users.findUnique({
      where: { id: userId },
    });
    if (!user || !user.is_active) {
      throw new UnauthorizedException("User not found");
    }

    const authUser = await this.mfa.verifyLoginCode(user.id, code);
    return this.completeLogin(user, fpHash, userAgentLabel, authUser);
  }

  async confirmMfaSetup(
    challengeToken: string | undefined,
    code: string,
    userId?: string,
  ): Promise<AuthResponse> {
    let userIdToConfirm = userId;

    if (challengeToken) {
      const user = await this.mfa.resolveUserFromChallenge(
        challengeToken,
        "mfa_setup",
      );
      userIdToConfirm = user.id;
    }

    if (!userIdToConfirm) {
      throw new UnauthorizedException("Authentication required");
    }

    const authUser = await this.mfa.confirmSetup(userIdToConfirm, code);
    const user = await this.prisma.client.users.findUnique({
      where: { id: userIdToConfirm },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return this.completeLogin(user, "", undefined, authUser);
  }

  async getSecurityPreferences(userId: string): Promise<SecurityPreferences> {
    const user = await this.prisma.client.users.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    return {
      google_authenticator_enabled: user.mfa_enabled,
      email_otp_new_device_enabled: user.email_otp_new_device_enabled,
    };
  }

  async updateSecurityPreferences(
    userId: string,
    input: SecurityPreferencesInput,
  ): Promise<SecurityPreferences> {
    const user = await this.prisma.client.users.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const data: {
      email_otp_new_device_enabled?: boolean;
      mfa_enabled?: boolean;
    } = {};

    if (input.email_otp_new_device_enabled !== undefined) {
      data.email_otp_new_device_enabled = input.email_otp_new_device_enabled;
    }

    if (input.google_authenticator_enabled === false) {
      data.mfa_enabled = false;
      await this.prisma.client.users.update({
        where: { id: userId },
        data: {
          ...data,
          mfa_secret: null,
        },
      });
    } else if (input.google_authenticator_enabled === true && !user.mfa_enabled) {
      throw new UnauthorizedException(
        "Complete Google Authenticator setup before enabling",
      );
    } else if (Object.keys(data).length > 0) {
      await this.prisma.client.users.update({
        where: { id: userId },
        data,
      });
    }

    return this.getSecurityPreferences(userId);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    try {
      const payload = this.jwtService.verify<{ sub: string; type?: string }>(
        refreshToken,
        { secret: process.env.JWT_REFRESH_SECRET },
      );

      if (payload.type !== "refresh") {
        throw new UnauthorizedException("Invalid refresh token");
      }

      const user = await this.prisma.client.users.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.is_active) {
        throw new UnauthorizedException("User not found");
      }

      const authUser = this.mfa.toAuthUser(user);
      const tokens = await this.issueTokens(authUser);
      return { ...tokens, user: authUser };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async logout(userId: string) {
    await this.auditService.log({
      user_id: userId,
      action: "logout",
      entity_type: "users",
      entity_id: userId,
    });
    return { success: true };
  }

  private async completeLogin(
    user: {
      id: string;
      email: string;
      full_name: string;
      role: AuthUser["role"];
      mfa_enabled: boolean;
      email_otp_new_device_enabled: boolean;
    },
    fingerprintHash?: string,
    userAgentLabel?: string,
    authUser?: AuthUser,
  ): Promise<AuthResponse> {
    await this.prisma.client.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    if (fingerprintHash) {
      await this.devices.trustDevice(
        user.id,
        fingerprintHash,
        userAgentLabel,
      );
    }

    const resolvedUser =
      authUser ??
      this.mfa.toAuthUser({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        mfa_enabled: user.mfa_enabled,
        email_otp_new_device_enabled: user.email_otp_new_device_enabled,
      });

    const tokens = await this.issueTokens(resolvedUser);

    await this.auditService.log({
      user_id: user.id,
      action: "login",
      entity_type: "users",
      entity_id: user.id,
    });

    return { ...tokens, user: resolvedUser };
  }

  private issueLoginChallenge(
    userId: string,
    email: string,
    fingerprintHash: string,
    emailOtpVerified: boolean,
    userAgentLabel?: string,
  ): string {
    return this.jwtService.sign(
      {
        sub: userId,
        email,
        type: "login_challenge",
        device_fingerprint_hash: fingerprintHash,
        email_otp_verified: emailOtpVerified,
        user_agent_label: userAgentLabel,
      } satisfies LoginChallengePayload,
      {
        secret: process.env.JWT_SECRET ?? "dev-secret",
        expiresIn: 600,
      },
    );
  }

  private verifyLoginChallenge(token: string): LoginChallengePayload {
    const payload = this.parseChallengeToken(token);
    if (payload.type !== "login_challenge") {
      throw new UnauthorizedException("Invalid challenge token");
    }
    return payload as LoginChallengePayload;
  }

  private parseChallengeToken(token: string): LoginChallengePayload & {
    type: string;
  } {
    try {
      return this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET ?? "dev-secret",
      }) as LoginChallengePayload & { type: string };
    } catch {
      throw new UnauthorizedException("Invalid or expired challenge token");
    }
  }

  private async issueTokens(user: AuthUser) {
    const accessExpiresIn = parseJwtExpires(process.env.JWT_EXPIRES_IN ?? "30m");
    const refreshExpiresIn = parseJwtExpires(
      process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
    );

    const access_token = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, role: user.role, type: "access" },
      {
        secret: process.env.JWT_SECRET ?? "dev-secret",
        expiresIn: accessExpiresIn,
      },
    );

    const refresh_token = await this.jwtService.signAsync(
      { sub: user.id, type: "refresh" },
      {
        secret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret",
        expiresIn: refreshExpiresIn,
      },
    );

    return { access_token, refresh_token };
  }
}

function parseJwtExpires(value: string): number {
  const match = value.match(/^(\d+)([smhd])$/);
  if (!match) return Number(value) || 1800;
  const amount = Number(match[1]);
  switch (match[2]) {
    case "s":
      return amount;
    case "m":
      return amount * 60;
    case "h":
      return amount * 3600;
    case "d":
      return amount * 86400;
    default:
      return 1800;
  }
}
