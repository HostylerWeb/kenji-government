import type { PrismaClient } from "@prisma/client";
import {
  GOVERNMENT_TAX_RATE_DEFAULT,
  decryptIngestSecret,
  SYSTEM_SETTING_KEYS,
} from "@kenji-government/shared";

export async function loadTaxRate(prisma: PrismaClient): Promise<number> {
  const row = await prisma.system_settings.findUnique({
    where: { key: SYSTEM_SETTING_KEYS.TAX_RATE },
  });
  if (!row?.value || typeof row.value !== "object") {
    return GOVERNMENT_TAX_RATE_DEFAULT;
  }
  const rate = (row.value as { rate?: number }).rate;
  return typeof rate === "number" ? rate : GOVERNMENT_TAX_RATE_DEFAULT;
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

export async function loadSmtpConfig(prisma: PrismaClient) {
  const row = await prisma.system_settings.findUnique({
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

  return {
    host: smtp.host,
    port: smtp.port ?? 587,
    user: smtp.user,
    pass: smtp.pass_encrypted ? decryptIngestSecret(smtp.pass_encrypted) : undefined,
    from: smtp.from,
  };
}

export async function loadReportStakeholderEmails(prisma: PrismaClient): Promise<string[]> {
  const row = await prisma.system_settings.findUnique({
    where: { key: SYSTEM_SETTING_KEYS.REPORT_STAKEHOLDER_EMAILS },
  });
  if (
    row?.value &&
    typeof row.value === "object" &&
    Array.isArray((row.value as { emails?: string[] }).emails)
  ) {
    return (row.value as { emails: string[] }).emails;
  }
  return [];
}
