import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import {
  getGovernmentTaxRateFromEnv,
  GOVERNMENT_GATEWAY_FEE_RATE_DEFAULT,
  isSuperAdmin,
  SYSTEM_SETTING_KEYS,
  type AuthUser,
  updateSystemSettingsSchema,
} from "@kenji-government/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { Prisma } from "@prisma/client";

type PublicSystemSettings = {
  tax_rate: number;
  smtp: {
    host: string | null;
    port: number | null;
    user: string | null;
    from: string | null;
    configured: boolean;
  };
  treasury_account_ref: string | null;
  can_edit: boolean;
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  getTaxRate(): number {
    return getGovernmentTaxRateFromEnv();
  }

  getGatewayFeeRate(): number {
    return GOVERNMENT_GATEWAY_FEE_RATE_DEFAULT;
  }

  async getTreasuryAccountRef(): Promise<string> {
    const row = await this.prisma.client.system_settings.findUnique({
      where: { key: SYSTEM_SETTING_KEYS.TREASURY_ACCOUNT_REF },
    });
    if (!row?.value || typeof row.value !== "object") {
      return "KE-TREASURY-DEFAULT";
    }
    const ref = (row.value as { account_ref?: string }).account_ref;
    return ref ?? "KE-TREASURY-DEFAULT";
  }

  getSmtpConfig(): {
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
    from?: string;
  } | null {
    const host = process.env.SMTP_HOST?.trim();
    if (!host) return null;

    return {
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      user: process.env.SMTP_USER?.trim() || undefined,
      pass: process.env.SMTP_PASS?.trim() || undefined,
      from: process.env.SMTP_FROM?.trim() || undefined,
    };
  }

  async getPublicSettings(user: AuthUser): Promise<PublicSystemSettings> {
    const taxRate = this.getTaxRate();
    const smtp = this.getSmtpConfig();
    const treasuryRow = await this.prisma.client.system_settings.findUnique({
      where: { key: SYSTEM_SETTING_KEYS.TREASURY_ACCOUNT_REF },
    });

    const treasuryRef =
      treasuryRow?.value &&
      typeof treasuryRow.value === "object"
        ? (treasuryRow.value as { account_ref?: string }).account_ref ?? null
        : null;

    return {
      tax_rate: taxRate,
      smtp: {
        host: smtp?.host ?? null,
        port: smtp?.port ?? null,
        user: smtp?.user ?? null,
        from: smtp?.from ?? null,
        configured: Boolean(smtp?.host),
      },
      treasury_account_ref: treasuryRef,
      can_edit: isSuperAdmin(user.role),
    };
  }

  async updateSettings(user: AuthUser, payload: unknown) {
    if (!isSuperAdmin(user.role)) {
      throw new ForbiddenException(
        "Only super administrators may change system settings",
      );
    }

    const parsed = updateSystemSettingsSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;

    if (data.treasury_account_ref) {
      await this.upsertSetting(
        SYSTEM_SETTING_KEYS.TREASURY_ACCOUNT_REF,
        { account_ref: data.treasury_account_ref.account_ref },
        user.id,
      );
    }

    await this.prisma.client.audit_logs.create({
      data: {
        user_id: user.id,
        action: "settings.updated",
        entity_type: "system_settings",
        metadata: { keys: Object.keys(data) },
      },
    });

    return this.getPublicSettings(user);
  }

  private async upsertSetting(
    key: string,
    value: Prisma.InputJsonValue,
    userId: string,
  ) {
    await this.prisma.client.system_settings.upsert({
      where: { key },
      create: { key, value, updated_by: userId },
      update: { value, updated_by: userId },
    });
  }
}
