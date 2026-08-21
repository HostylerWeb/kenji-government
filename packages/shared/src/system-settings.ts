import { z } from "zod";

export const SYSTEM_SETTING_KEYS = {
  TAX_RATE: "tax_rate",
  GATEWAY_FEE_RATE: "gateway_fee_rate",
  SMTP: "smtp",
  REPORT_STAKEHOLDER_EMAILS: "report_stakeholder_emails",
  TREASURY_ACCOUNT_REF: "treasury_account_ref",
} as const;

export type SystemSettingKey =
  (typeof SYSTEM_SETTING_KEYS)[keyof typeof SYSTEM_SETTING_KEYS];

export const GOVERNMENT_TAX_RATE_DEFAULT = 0.3;
export const GOVERNMENT_GATEWAY_FEE_RATE_DEFAULT = 0.025;

export const taxRateSettingSchema = z.object({
  rate: z.number().min(0).max(1),
});

export const gatewayFeeRateSettingSchema = z.object({
  rate: z.number().min(0).max(1),
});

export const smtpSettingSchema = z.object({
  host: z.string().min(1).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  user: z.string().optional(),
  pass_encrypted: z.string().optional(),
  from: z.string().email().optional(),
});

export const reportStakeholderEmailsSchema = z.object({
  emails: z.array(z.string().email()),
});

export const treasuryAccountRefSchema = z.object({
  account_ref: z.string().min(1),
});

export const updateSystemSettingsSchema = z.object({
  tax_rate: taxRateSettingSchema.optional(),
  gateway_fee_rate: gatewayFeeRateSettingSchema.optional(),
  smtp: z
    .object({
      host: z.string().min(1).optional(),
      port: z.number().int().min(1).max(65535).optional(),
      user: z.string().optional(),
      pass: z.string().optional(),
      from: z.string().email().optional(),
    })
    .optional(),
  report_stakeholder_emails: reportStakeholderEmailsSchema.optional(),
  treasury_account_ref: treasuryAccountRefSchema.optional(),
});

export type UpdateSystemSettingsInput = z.infer<typeof updateSystemSettingsSchema>;
