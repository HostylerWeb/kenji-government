export const AUDIT_CATEGORIES = ["auth", "platform"] as const;
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

const AUTH_ACTIONS = new Set([
  "login",
  "logout",
  "profile_updated",
  "profile_password_changed",
]);

const AUTH_ACTION_PREFIXES = ["mfa_", "device_", "email_otp_"];

const NOISE_ACTION_PREFIXES = ["GET ", "POST ", "PUT ", "PATCH ", "DELETE "];

export function isNoiseAuditAction(action: string): boolean {
  return NOISE_ACTION_PREFIXES.some((prefix) => action.startsWith(prefix));
}

export function categorizeAuditAction(
  action: string,
  metadata?: unknown,
): AuditCategory {
  if (metadata && typeof metadata === "object" && metadata !== null) {
    const category = (metadata as Record<string, unknown>).category;
    if (category === "auth" || category === "platform") {
      return category;
    }
  }

  if (AUTH_ACTIONS.has(action)) return "auth";
  if (AUTH_ACTION_PREFIXES.some((prefix) => action.startsWith(prefix))) {
    return "auth";
  }

  return "platform";
}

const ACTION_LABELS: Record<string, string> = {
  login: "User signed in",
  logout: "User signed out",
  profile_updated: "Profile updated",
  profile_password_changed: "Password changed",
  operator_warning: "Warning issued to operator",
  operator_suspend: "Operator suspended",
  enforcement_case_created: "Enforcement case opened",
  enforcement_case_resolved: "Enforcement case resolved",
  enforcement_case_deleted: "Enforcement case deleted",
  enforcement_action_added: "Enforcement action recorded",
  submission_reviewed: "Submission reviewed",
  submission_approved: "Submission approved",
  submission_rejected: "Submission rejected",
  submission_revision_requested: "Submission revision requested",
  user_created: "Staff user created",
  user_updated: "Staff user updated",
  document_uploaded: "Document uploaded",
  operator_created: "Operator registered",
  operator_updated: "Operator record updated",
  "tax_withdrawal.initiated": "Tax withdrawal initiated",
  "tax_withdrawal.completed": "Tax withdrawal completed",
  "aml_alert.escalated_to_enforcement": "AML alert escalated to enforcement",
  "settings_updated": "System settings updated",
  "audit_log_wiped": "Audit log cleared",
};

export function formatAuditActionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];

  if (action.startsWith("enforcement_action_")) {
    const type = action.replace("enforcement_action_", "").replace(/_/g, " ");
    return `Enforcement ${type} recorded`;
  }

  return action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatAuditSummary(
  action: string,
  metadata?: Record<string, unknown> | null,
): string {
  if (!metadata) return "—";

  const parts: string[] = [];

  if (typeof metadata.summary === "string" && metadata.summary.trim()) {
    return metadata.summary.trim();
  }

  if (typeof metadata.external_id === "string") {
    parts.push(`Operator ${metadata.external_id}`);
  }
  if (typeof metadata.operator_name === "string") {
    parts.push(metadata.operator_name);
  }
  if (typeof metadata.case_number === "string") {
    parts.push(`Case ${metadata.case_number}`);
  }
  if (typeof metadata.case_title === "string") {
    parts.push(metadata.case_title);
  }
  if (typeof metadata.action_type === "string") {
    parts.push(`Action: ${metadata.action_type.replace(/_/g, " ")}`);
  }
  if (typeof metadata.status === "string") {
    parts.push(`Status: ${metadata.status.replace(/_/g, " ")}`);
  }
  if (typeof metadata.details === "string" && metadata.details.trim()) {
    parts.push(metadata.details.trim());
  }
  if (typeof metadata.email === "string") {
    parts.push(metadata.email);
  }
  if (typeof metadata.title === "string") {
    parts.push(metadata.title);
  }
  if (typeof metadata.document_type === "string") {
    parts.push(`Document type: ${metadata.document_type.replace(/_/g, " ")}`);
  }

  return parts.length > 0 ? parts.join(" · ") : "—";
}
