import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import {
  GOVERNMENT_TAX_RATE_DEFAULT,
  encryptIngestSecret,
  decryptIngestSecret,
  isSuperAdmin,
  SYSTEM_SETTING_KEYS,
  type AuthUser,
  type UpdateSystemSettingsInput,
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
  report_stakeholder_emails: string[];
  treasury_account_ref: string | null;
  can_edit: boolean;
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTaxRate(): Promise<number> {
    const row = await this.prisma.client.system_settings.findUnique({
      where: { key: SYSTEM_SETTING_KEYS.TAX_RATE },
    });
    if (!row?.value || typeof row.value !== "object") {
      return GOVERNMENT_TAX_RATE_DEFAULT;
    }
    const rate = (row.value as { rate?: number }).rate;
    return typeof rate === "number" ? rate : GOVERNMENT_TAX_RATE_DEFAULT;
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

  async getSmtpConfig(): Promise<{
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
    from?: string;
  } | null> {
    const row = await this.prisma.client.system_settings.findUnique({
      where: { key: SYSTEM_SETTING_KEYS.SMTP },
    });
    if (!row?.value || typeof row.value !== "object") {
      return null;
    }
    const smtp = row.value as {
      host?: string;
      port?: number;
      user?: string;
      pass_encrypted?: string;
      from?: string;
    };
    if (!smtp.host) return null;

    let pass: string | undefined;
    if (smtp.pass_encrypted) {
      pass = decryptIngestSecret(smtp.pass_encrypted);
    }

    return {
      host: smtp.host,
      port: smtp.port ?? 587,
      user: smtp.user,
      pass,
      from: smtp.from,
    };
  }

  async getPublicSettings(user: AuthUser): Promise<PublicSystemSettings> {
    const taxRate = await this.getTaxRate();
    const smtpRow = await this.prisma.client.system_settings.findUnique({
      where: { key: SYSTEM_SETTING_KEYS.SMTP },
    });
    const emailsRow = await this.prisma.client.system_settings.findUnique({
      where: { key: SYSTEM_SETTING_KEYS.REPORT_STAKEHOLDER_EMAILS },
    });
    const treasuryRow = await this.prisma.client.system_settings.findUnique({
      where: { key: SYSTEM_SETTING_KEYS.TREASURY_ACCOUNT_REF },
    });

    const smtpValue =
      smtpRow?.value && typeof smtpRow.value === "object"
        ? (smtpRow.value as {
            host?: string;
            port?: number;
            user?: string;
            pass_encrypted?: string;
            from?: string;
          })
        : {};

    const emails =
      emailsRow?.value &&
      typeof emailsRow.value === "object" &&
      Array.isArray((emailsRow.value as { emails?: string[] }).emails)
        ? (emailsRow.value as { emails: string[] }).emails
        : [];

    const treasuryRef =
      treasuryRow?.value &&
      typeof treasuryRow.value === "object"
        ? (treasuryRow.value as { account_ref?: string }).account_ref ?? null
        : null;

    return {
      tax_rate: taxRate,
      smtp: {
        host: smtpValue.host ?? null,
        port: smtpValue.port ?? null,
        user: smtpValue.user ?? null,
        from: smtpValue.from ?? null,
        configured: Boolean(smtpValue.host),
      },
      report_stakeholder_emails: emails,
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

    if (data.tax_rate) {
      await this.upsertSetting(
        SYSTEM_SETTING_KEYS.TAX_RATE,
        { rate: data.tax_rate.rate },
        user.id,
      );
    }

    if (data.smtp) {
      const existing = await this.prisma.client.system_settings.findUnique({
        where: { key: SYSTEM_SETTING_KEYS.SMTP },
      });
      const current =
        existing?.value && typeof existing.value === "object"
          ? (existing.value as Record<string, unknown>)
          : {};

      const next: Record<string, unknown> = { ...current };
      if (data.smtp.host !== undefined) next.host = data.smtp.host;
      if (data.smtp.port !== undefined) next.port = data.smtp.port;
      if (data.smtp.user !== undefined) next.user = data.smtp.user;
      if (data.smtp.from !== undefined) next.from = data.smtp.from;
      if (data.smtp.pass) {
        next.pass_encrypted = encryptIngestSecret(data.smtp.pass);
      }

      await this.upsertSetting(
        SYSTEM_SETTING_KEYS.SMTP,
        next as Prisma.InputJsonValue,
        user.id,
      );
    }

    if (data.report_stakeholder_emails) {
      await this.upsertSetting(
        SYSTEM_SETTING_KEYS.REPORT_STAKEHOLDER_EMAILS,
        { emails: data.report_stakeholder_emails.emails },
        user.id,
      );
    }

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
