import type { aml_alert_severity, aml_alert_type } from "@prisma/client";

type AmlAlert = {
  type: aml_alert_type;
  severity: aml_alert_severity;
  details: Record<string, unknown>;
};

export function evaluateAmlRules(input: {
  grossAmount: number;
  kycStatus: "verified" | "pending" | "flagged";
  payerFingerprint?: string;
}): { riskScore: number; alert?: AmlAlert } {
  let riskScore = 0;
  let alert: AmlAlert | undefined;

  if (input.kycStatus === "flagged") {
    riskScore += 60;
    alert = {
      type: "kyc_mismatch",
      severity: "high",
      details: { reason: "KYC flagged at payment time" },
    };
  } else if (input.kycStatus === "pending") {
    riskScore += 25;
  }

  if (input.grossAmount >= 50000) {
    riskScore += 30;
    alert = {
      type: "structuring",
      severity: "medium",
      details: {
        reason: "High-value ticket payment",
        gross_amount: input.grossAmount,
      },
    };
  }

  if (input.grossAmount >= 100000) {
    riskScore = Math.max(riskScore, 70);
    alert = {
      type: "velocity",
      severity: "high",
      details: {
        reason: "Very high single payment",
        gross_amount: input.grossAmount,
      },
    };
  }

  if (!input.payerFingerprint) {
    riskScore += 10;
  }

  return { riskScore: Math.min(100, riskScore), alert };
}
