import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { authenticator } from "otplib";
import {
  decryptIngestSecret,
  encryptIngestSecret,
  type AuthUser,
  type UserRole,
} from "@kenji-government/shared";
import { PrismaService } from "../prisma/prisma.service";

const MFA_ISSUER = "GRA Oversight Console";

type MfaChallengePayload = {
  sub: string;
  email: string;
  type: "mfa_challenge" | "mfa_setup";
};

@Injectable()
export class MfaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {
    authenticator.options = { window: 1 };
  }

  toAuthUser(user: {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    mfa_enabled: boolean;
    email_otp_new_device_enabled?: boolean;
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      mfa_enabled: user.mfa_enabled,
      email_otp_new_device_enabled: user.email_otp_new_device_enabled ?? true,
    };
  }

  issueChallengeToken(
    userId: string,
    email: string,
    type: MfaChallengePayload["type"],
  ): string {
    return this.jwtService.sign(
      { sub: userId, email, type },
      {
        secret: process.env.JWT_SECRET ?? "dev-secret",
        expiresIn: "10m",
      },
    );
  }

  verifyChallengeToken(
    token: string,
    expectedType: MfaChallengePayload["type"],
  ): MfaChallengePayload {
    try {
      const payload = this.jwtService.verify<MfaChallengePayload>(token, {
        secret: process.env.JWT_SECRET ?? "dev-secret",
      });
      if (payload.type !== expectedType) {
        throw new UnauthorizedException("Invalid challenge token");
      }
      return payload;
    } catch {
      throw new UnauthorizedException("Invalid or expired challenge token");
    }
  }

  async resolveUserFromChallenge(
    token: string,
    expectedType: MfaChallengePayload["type"],
  ) {
    const payload = this.verifyChallengeToken(token, expectedType);
    const user = await this.prisma.client.users.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.is_active) {
      throw new UnauthorizedException("User not found");
    }
    return user;
  }

  async beginSetup(userId: string) {
    const user = await this.prisma.client.users.findUnique({
      where: { id: userId },
    });
    if (!user || !user.is_active) {
      throw new UnauthorizedException("User not found");
    }

    const secret = authenticator.generateSecret();
    const encrypted = encryptIngestSecret(secret);

    await this.prisma.client.users.update({
      where: { id: userId },
      data: { mfa_secret: encrypted, mfa_enabled: false },
    });

    const otpauth_url = authenticator.keyuri(user.email, MFA_ISSUER, secret);

    return { otpauth_url, secret };
  }

  async confirmSetup(userId: string, code: string) {
    const user = await this.prisma.client.users.findUnique({
      where: { id: userId },
    });
    if (!user?.mfa_secret) {
      throw new BadRequestException("MFA setup not started");
    }

    const secret = decryptIngestSecret(user.mfa_secret);
    if (!this.verifyCode(code, secret)) {
      throw new UnauthorizedException("Invalid verification code");
    }

    await this.prisma.client.users.update({
      where: { id: userId },
      data: { mfa_enabled: true },
    });

    return this.toAuthUser({ ...user, mfa_enabled: true });
  }

  async verifyLoginCode(userId: string, code: string): Promise<AuthUser> {
    const user = await this.prisma.client.users.findUnique({
      where: { id: userId },
    });
    if (!user?.mfa_enabled || !user.mfa_secret) {
      throw new BadRequestException("MFA is not enabled");
    }

    const secret = decryptIngestSecret(user.mfa_secret);
    if (!this.verifyCode(code, secret)) {
      throw new UnauthorizedException("Invalid verification code");
    }

    return this.toAuthUser(user);
  }

  async disableMfa(userId: string) {
    const user = await this.prisma.client.users.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    await this.prisma.client.users.update({
      where: { id: userId },
      data: { mfa_enabled: false, mfa_secret: null },
    });

    return { success: true };
  }

  private verifyCode(code: string, secret: string): boolean {
    const normalized = code.replace(/\s/g, "");
    return authenticator.verify({ token: normalized, secret });
  }
}
