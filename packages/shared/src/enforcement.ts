import { z } from "zod";

export const ENFORCEMENT_CASE_TYPES = [
  "warning",
  "fine",
  "investigation",
  "suspension",
] as const;

export const ENFORCEMENT_CASE_NATURES = [
  "tax_non_compliance",
  "fraud_investigation",
  "inaccurate_reporting",
  "document_deficiency",
  "aml_concern",
  "licence_breach",
  "advertising_violation",
  "operational_breach",
  "internal_review",
  "other",
] as const;

export const ENFORCEMENT_CASE_PRIORITIES = ["low", "medium", "high"] as const;

export type EnforcementCaseType = (typeof ENFORCEMENT_CASE_TYPES)[number];
export type EnforcementCaseNature = (typeof ENFORCEMENT_CASE_NATURES)[number];
export type EnforcementCasePriority = (typeof ENFORCEMENT_CASE_PRIORITIES)[number];

export const enforcementCaseMetadataSchema = z.object({
  nature: z.enum(ENFORCEMENT_CASE_NATURES),
  priority: z.enum(ENFORCEMENT_CASE_PRIORITIES).default("medium"),
  requires_operator_response: z.boolean().default(false),
  is_internal: z.boolean().default(false),
  has_allegations: z.boolean().default(false),
  allegations_summary: z.string().trim().max(4000).optional(),
  requires_documents: z.boolean().default(false),
  required_documents: z.string().trim().max(2000).optional(),
  has_financial_penalty: z.boolean().default(false),
  fine_amount: z.string().trim().max(50).optional(),
  fine_due_by: z.string().trim().max(30).optional(),
  fine_payment_notes: z.string().trim().max(1000).optional(),
  has_supporting_evidence: z.boolean().default(false),
  supporting_evidence_notes: z.string().trim().max(2000).optional(),
  pending_document_request: z.boolean().optional(),
  document_request_due_by: z.string().trim().max(30).optional(),
  quick_warning: z.boolean().optional(),
});

export type EnforcementCaseMetadata = z.infer<typeof enforcementCaseMetadataSchema>;

export const createEnforcementCaseSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    case_type: z.enum(ENFORCEMENT_CASE_TYPES),
    description: z.string().trim().min(10).max(4000),
    nature: z.enum(ENFORCEMENT_CASE_NATURES),
    priority: z.enum(ENFORCEMENT_CASE_PRIORITIES).default("medium"),
    requires_operator_response: z.boolean().default(false),
    is_internal: z.boolean().default(false),
    has_allegations: z.boolean().default(false),
    allegations_summary: z.string().trim().max(4000).optional(),
    requires_documents: z.boolean().default(false),
    required_documents: z.string().trim().max(2000).optional(),
    has_financial_penalty: z.boolean().default(false),
    fine_amount: z.string().trim().max(50).optional(),
    fine_due_by: z.string().trim().max(30).optional(),
    fine_payment_notes: z.string().trim().max(1000).optional(),
    has_supporting_evidence: z.boolean().default(false),
    supporting_evidence_notes: z.string().trim().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.has_allegations) {
      if (!data.allegations_summary || data.allegations_summary.trim().length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["allegations_summary"],
          message: "Provide allegations or an issue summary (at least 10 characters).",
        });
      }
    }

    if (data.requires_documents) {
      if (!data.required_documents || data.required_documents.trim().length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["required_documents"],
          message: "List the documents or evidence required from the operator.",
        });
      }
    }

    const penaltyApplies = data.has_financial_penalty || data.case_type === "fine";
    if (penaltyApplies) {
      if (!data.fine_amount || data.fine_amount.trim().length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fine_amount"],
          message: "Enter the penalty amount.",
        });
      }
    }

    if (data.has_supporting_evidence) {
      if (
        !data.supporting_evidence_notes ||
        data.supporting_evidence_notes.trim().length < 3
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["supporting_evidence_notes"],
          message: "Describe the supporting evidence held on file.",
        });
      }
    }
  });

export type CreateEnforcementCaseInput = z.infer<typeof createEnforcementCaseSchema>;
