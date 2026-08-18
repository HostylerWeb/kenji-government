import { z } from "zod";
import type { UserRole } from "./auth";

export const REPORT_QUEUE_NAME = "report-generate";

export const REPORT_SLUGS = {
  GGR_BY_OPERATOR_MONTHLY: "ggr_by_operator_monthly",
  TAX_COLLECTED_VS_DUE: "tax_collected_vs_due",
  COMPLIANCE_STATUS_SUMMARY: "compliance_status_summary",
  REGIONAL_COMMERCIAL_SUMMARY: "regional_commercial_summary",
  PLAYER_SAFETY_AGGREGATES: "player_safety_aggregates",
  PAYMENT_GATEWAY_DAILY_VOLUME: "payment_gateway_daily_volume",
  AML_ALERT_SUMMARY: "aml_alert_summary",
  CBK_AML_PAYMENT_EXPORT: "cbk_aml_payment_export",
  OPERATOR_LICENCE_EXPIRY: "operator_licence_expiry",
} as const;

export const reportFormatSchema = z.enum(["csv", "pdf"]);

export const ggrReportParamsSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
});

export const dateRangeParamsSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export const ROLE_RANK: Record<UserRole, number> = {
  auditor: 1,
  analyst: 2,
  supervisor: 3,
  admin: 4,
  super_admin: 5,
};

export function isSuperAdmin(role: UserRole): boolean {
  return role === "super_admin";
}

export function isAdminOrAbove(role: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK.admin;
}

/** Roles that regular admins may assign (not admin or super_admin). */
export const ADMIN_ASSIGNABLE_ROLES: UserRole[] = [
  "supervisor",
  "analyst",
  "auditor",
];

/** Roles super admins may assign. */
export const SUPER_ADMIN_ASSIGNABLE_ROLES: UserRole[] = [
  "super_admin",
  "admin",
  "supervisor",
  "analyst",
  "auditor",
];

export function roleMeetsMinimum(
  userRole: UserRole,
  requiredRole: UserRole,
): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[requiredRole];
}

export type ReportParameterField = {
  name: string;
  type: "number" | "text" | "date";
  label: string;
  default?: string | number;
  min?: number;
  max?: number;
};
