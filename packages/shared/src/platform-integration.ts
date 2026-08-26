import { createHmac, timingSafeEqual } from "crypto";

export function signPlatformIntegrationBody(
  body: string,
  secret: string,
): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function verifyPlatformIntegrationSignature(
  body: string,
  signature: string | undefined,
  secret: string | undefined,
): boolean {
  if (!signature?.trim() || !secret?.trim()) return false;
  const expected = signPlatformIntegrationBody(body, secret);
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature.trim(), "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export type GraOperatorApplicationPayload = {
  platform_operator_id: string;
  proposed_external_id: string;
  staging_hostname: string;
  callback_url: string;
  legal_name: string;
  trading_name: string;
  registration_number?: string;
  kra_pin?: string;
  beneficial_owner?: string;
  email?: string;
  phone?: string;
  county?: string;
  region?: string;
  website?: string;
  licence_number?: string;
};

export type GraCredentialsCallbackPayload = {
  platform_operator_id: string;
  gra_registry_id: string;
  gra_application_id: string;
  api_key: string;
  hmac_secret: string;
  status: "approved";
};

export type GraApplicationRejectedPayload = {
  platform_operator_id: string;
  gra_application_id: string;
  status: "rejected";
  rejection_reason: string;
};

export type GraPlatformOperatorTeardownPayload = {
  platform_operator_id: string;
  gra_registry_id?: string;
};
