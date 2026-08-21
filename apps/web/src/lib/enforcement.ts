import type {
  EnforcementCaseMetadata,
  EnforcementCaseNature,
  EnforcementCasePriority,
  EnforcementCaseType,
} from "@kenji-government/shared";

export const CASE_TYPE_LABELS: Record<EnforcementCaseType, string> = {
  warning: "Formal Warning",
  fine: "Financial Penalty",
  investigation: "Investigation",
  suspension: "Suspension Proceedings",
};

export const CASE_NATURE_LABELS: Record<EnforcementCaseNature, string> = {
  tax_non_compliance: "Tax non-compliance",
  fraud_investigation: "Fraud or misrepresentation",
  inaccurate_reporting: "Inaccurate reporting",
  document_deficiency: "Missing or deficient documents",
  aml_concern: "AML / suspicious activity",
  licence_breach: "Licence breach",
  advertising_violation: "Advertising violation",
  operational_breach: "Operational breach",
  internal_review: "Internal GRA review",
  other: "Other",
};

export const CASE_PRIORITY_LABELS: Record<EnforcementCasePriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function parseEnforcementMetadata(
  value: unknown,
): EnforcementCaseMetadata | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.nature !== "string") return null;
  return {
    nature: record.nature as EnforcementCaseNature,
    priority: (record.priority as EnforcementCasePriority) ?? "medium",
    requires_operator_response: Boolean(record.requires_operator_response),
    is_internal: Boolean(record.is_internal),
    has_allegations: Boolean(record.has_allegations),
    allegations_summary:
      typeof record.allegations_summary === "string"
        ? record.allegations_summary
        : undefined,
    requires_documents: Boolean(record.requires_documents),
    required_documents:
      typeof record.required_documents === "string"
        ? record.required_documents
        : undefined,
    has_financial_penalty: Boolean(record.has_financial_penalty),
    fine_amount:
      typeof record.fine_amount === "string" ? record.fine_amount : undefined,
    fine_due_by:
      typeof record.fine_due_by === "string" ? record.fine_due_by : undefined,
    fine_payment_notes:
      typeof record.fine_payment_notes === "string"
        ? record.fine_payment_notes
        : undefined,
    has_supporting_evidence: Boolean(record.has_supporting_evidence),
    supporting_evidence_notes:
      typeof record.supporting_evidence_notes === "string"
        ? record.supporting_evidence_notes
        : undefined,
    pending_document_request: Boolean(record.pending_document_request),
    document_request_due_by:
      typeof record.document_request_due_by === "string"
        ? record.document_request_due_by
        : undefined,
  };
}

export function priorityVariant(
  priority: EnforcementCasePriority,
): "danger" | "warning" | "muted" {
  switch (priority) {
    case "high":
      return "danger";
    case "medium":
      return "warning";
    default:
      return "muted";
  }
}

export function getCaseNextSteps(metadata: EnforcementCaseMetadata | null): string[] {
  if (!metadata) {
    return ["Review the case summary and record the next enforcement action."];
  }

  const steps: string[] = [];

  if (metadata.is_internal) {
    steps.push("Conduct internal review and gather supporting evidence.");
  } else if (metadata.requires_operator_response) {
    steps.push("Issue formal notice to the operator and request their response.");
  } else {
    steps.push("Document findings and determine the appropriate enforcement action.");
  }

  if (metadata.requires_documents && metadata.required_documents?.trim()) {
    steps.push(`Obtain required documents: ${metadata.required_documents.trim()}`);
  }

  if (metadata.has_financial_penalty && metadata.fine_amount) {
    steps.push(
      `Issue financial penalty of KES ${metadata.fine_amount}${
        metadata.fine_due_by ? ` due by ${metadata.fine_due_by}` : ""
      }.`,
    );
  }

  if (metadata.has_supporting_evidence && metadata.supporting_evidence_notes?.trim()) {
    steps.push("Review supporting evidence already held on file.");
  }

  if (metadata.nature === "fraud_investigation" || metadata.nature === "aml_concern") {
    steps.push("Verify transactions, supporting records, and whether escalation is warranted.");
  }

  if (metadata.nature === "document_deficiency" || metadata.nature === "inaccurate_reporting") {
    steps.push("Cross-check submissions and supporting filings for inconsistencies.");
  }

  steps.push("Record all actions in the case timeline for audit purposes.");

  return steps;
}

export function isQuickWarningCase(caseRecord: { metadata?: unknown }): boolean {
  const metadata = parseEnforcementMetadata(caseRecord.metadata);
  if (!metadata) return false;
  return Boolean((caseRecord.metadata as Record<string, unknown>)?.quick_warning);
}

export function filterEnforcementCases<T extends { status: string; metadata?: unknown; case_type?: string }>(
  cases: T[],
  bucket: "open" | "resolved",
  caseType?: EnforcementCaseType | "all",
) {
  return cases.filter((caseRecord) => {
    if (isQuickWarningCase(caseRecord)) return false;
    if (caseType && caseType !== "all" && caseRecord.case_type !== caseType) {
      return false;
    }
    if (bucket === "open") {
      return caseRecord.status === "open" || caseRecord.status === "escalated";
    }
    return caseRecord.status === "resolved" || caseRecord.status === "closed";
  });
}

export function formatActionDetails(details: string | null | undefined): string {
  if (!details) return "";
  const trimmed = details.trim();
  if (trimmed.startsWith("Document request issued")) {
    return trimmed;
  }
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return trimmed;
  }
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    return Object.entries(parsed)
      .map(([key, value]) => `${key.replace(/_/g, " ")}: ${String(value)}`)
      .join(" · ");
  } catch {
    return trimmed;
  }
}
