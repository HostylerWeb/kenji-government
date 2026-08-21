import type { UserRole } from "@kenji-government/shared";

const SUBMISSION_REVIEW_ROLES: UserRole[] = [
  "super_admin",
  "admin",
  "supervisor",
  "analyst",
];

export function canReviewSubmissions(role: string | undefined): boolean {
  return !!role && SUBMISSION_REVIEW_ROLES.includes(role as UserRole);
}

export function submissionStatusVariant(
  status: string,
): "success" | "danger" | "warning" | "muted" | "primary" {
  switch (status) {
    case "approved":
      return "success";
    case "rejected":
      return "danger";
    case "revision_requested":
      return "warning";
    case "pending":
      return "primary";
    default:
      return "muted";
  }
}

export function submissionStatusLabel(status: string) {
  switch (status) {
    case "approved":
      return "Approved";
    case "pending":
      return "Pending";
    case "revision_requested":
      return "Revision Requested";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}

export type SubmissionTabTone = "success" | "warning" | "danger" | "muted";

export function submissionTabTone(status: string): SubmissionTabTone | "primary" {
  switch (status) {
    case "approved":
      return "success";
    case "rejected":
      return "danger";
    case "revision_requested":
      return "warning";
    case "pending":
      return "primary";
    default:
      return "muted";
  }
}
