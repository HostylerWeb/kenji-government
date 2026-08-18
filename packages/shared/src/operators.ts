import { z } from "zod";

export const operatorStatusSchema = z.enum([
  "active",
  "suspended",
  "revoked",
  "pending",
]);

export const complianceStatusSchema = z.enum([
  "compliant",
  "at_risk",
  "non_compliant",
]);

export const createOperatorSchema = z.object({
  external_id: z.string().min(1),
  legal_name: z.string().min(1),
  trading_name: z.string().min(1),
  registration_number: z.string().optional(),
  beneficial_owner: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  county: z.string().optional(),
  region: z.string().optional(),
  website: z.string().url().optional(),
  status: operatorStatusSchema.optional(),
  compliance_status: complianceStatusSchema.optional(),
});

export const updateOperatorSchema = createOperatorSchema.partial();

export type CreateOperatorInput = z.infer<typeof createOperatorSchema>;
export type UpdateOperatorInput = z.infer<typeof updateOperatorSchema>;

export const createLicenceSchema = z.object({
  licence_number: z.string().min(1),
  licence_type: z.enum(["raffle", "competition", "mixed"]).optional(),
  issued_at: z.string(),
  expires_at: z.string(),
  status: z.enum(["active", "expired", "suspended", "revoked"]).optional(),
});

export const updateLicenceSchema = createLicenceSchema.partial();

export type CreateLicenceInput = z.infer<typeof createLicenceSchema>;
export type UpdateLicenceInput = z.infer<typeof updateLicenceSchema>;
