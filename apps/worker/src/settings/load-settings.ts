import type { PrismaClient } from "@prisma/client";
import {
  getGovernmentTaxRateFromEnv,
  SYSTEM_SETTING_KEYS,
} from "@kenji-government/shared";

export function loadTaxRate(): number {
  return getGovernmentTaxRateFromEnv();
}

export async function loadTreasuryAccountRef(prisma: PrismaClient): Promise<string> {
  const row = await prisma.system_settings.findUnique({
    where: { key: SYSTEM_SETTING_KEYS.TREASURY_ACCOUNT_REF },
  });
  if (!row?.value || typeof row.value !== "object") {
    return "KE-TREASURY-DEFAULT";
  }
  return (row.value as { account_ref?: string }).account_ref ?? "KE-TREASURY-DEFAULT";
}

export function loadSmtpConfig() {
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
