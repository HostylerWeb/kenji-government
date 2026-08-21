import { z } from "zod";

/** Payload the payment gateway sends to GRA after processing a raffle ticket charge. */
export const gatewayPaymentSchema = z.object({
  external_transaction_id: z.string().min(1).max(128),
  gross_amount: z.number().positive(),
  ticket_reference: z.string().max(128).optional(),
  currency: z.string().length(3).default("KES"),
  status: z.enum(["completed", "failed"]).default("completed"),
  decline_reason: z.string().max(256).optional(),
  kyc_status: z.enum(["verified", "pending", "flagged"]).optional(),
  payer_fingerprint: z.string().max(128).optional(),
  county: z.string().max(64).optional(),
  completed_at: z.string().datetime().optional(),
  operator_amount: z.number().nonnegative().optional(),
  tax_amount: z.number().nonnegative().optional(),
  gateway_fee_rate: z.number().min(0).max(1).optional(),
  gateway_fee_amount: z.number().nonnegative().optional(),
});

export type GatewayPaymentInput = z.infer<typeof gatewayPaymentSchema>;

export const TAX_WITHDRAWAL_QUEUE_JOB = "tax-withdrawal-eod";
