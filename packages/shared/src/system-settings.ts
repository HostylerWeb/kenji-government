import { z } from "zod";

export const SYSTEM_SETTING_KEYS = {
  TREASURY_ACCOUNT_REF: "treasury_account_ref",
} as const;

export type SystemSettingKey =
  (typeof SYSTEM_SETTING_KEYS)[keyof typeof SYSTEM_SETTING_KEYS];

export const GOVERNMENT_TAX_RATE_DEFAULT = 0.3;
export const GOVERNMENT_GATEWAY_FEE_RATE_DEFAULT = 0.025;

export function getGovernmentTaxRateFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env.GOVERNMENT_TAX_RATE?.trim();
  if (!raw) return GOVERNMENT_TAX_RATE_DEFAULT;
  const rate = Number(raw);
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    return GOVERNMENT_TAX_RATE_DEFAULT;
  }
  return rate;
}

export const treasuryAccountRefSchema = z.object({
  account_ref: z.string().min(1),
});

export const updateSystemSettingsSchema = z.object({
  treasury_account_ref: treasuryAccountRefSchema.optional(),
});

export type UpdateSystemSettingsInput = z.infer<typeof updateSystemSettingsSchema>;
