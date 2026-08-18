import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import type { AuthResponse, AuthUser } from "@kenji-government/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async login(email: string, password: string): Promise<AuthResponse> {
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

    await this.prisma.client.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    };

    const tokens = await this.issueTokens(authUser);

    await this.auditService.log({
      user_id: user.id,
      action: "login",
      entity_type: "users",
      entity_id: user.id,
    });

    return { ...tokens, user: authUser };
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

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      };

      const tokens = await this.issueTokens(authUser);
      return { ...tokens, user: authUser };
    } catch {
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

  private async issueTokens(user: AuthUser) {
    const access_token = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, role: user.role, type: "access" },
      {
        secret: process.env.JWT_SECRET ?? "dev-secret",
        expiresIn: 28800,
      },
    );

    const refresh_token = await this.jwtService.signAsync(
      { sub: user.id, type: "refresh" },
      {
        secret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret",
        expiresIn: 604800,
      },
    );

    return { access_token, refresh_token };
  }
}
