import { z } from "zod";

export const monthlyReturnSchema = z.object({
  reporting_year: z.number().int().min(2020).max(2100),
  reporting_month: z.number().int().min(1).max(12),
  tickets_sold: z.number().int().nonnegative(),
  gross_revenue: z.number().nonnegative(),
  prizes_paid: z.number().nonnegative(),
  expenses: z.number().nonnegative(),
  gross_gaming_revenue: z.number().nonnegative(),
  tax_due: z.number().nonnegative().optional(),
  tax_paid: z.number().nonnegative(),
  notes: z.string().max(2000).optional(),
});

export const ingestDocumentTypeSchema = z.enum([
  "trading_licence",
  "registration",
  "tax_certificate",
  "audit_report",
  "insurance",
  "other",
]);

export const heartbeatSchema = z.object({
  site_version: z.string().max(100).optional(),
  message: z.string().max(500).optional(),
});

export type MonthlyReturnInput = z.infer<typeof monthlyReturnSchema>;
export type HeartbeatInput = z.infer<typeof heartbeatSchema>;

export const INGEST_QUEUE_NAME = "ingest-process";
export const INGEST_DLQ_NAME = "ingest-process-failed";

export const DEFAULT_TAX_RATE = 0.15;
export const INGEST_RATE_LIMIT_PER_MINUTE = 60;

const isoDateTime = z.coerce.date();

export const ticketEventActionSchema = z.enum(["purchased", "voided"]);
export const paymentEventActionSchema = z.enum(["completed", "failed"]);

export const ticketEventSchema = z.object({
  action: ticketEventActionSchema,
  ticket_id: z.string().min(1).max(64),
  raffle_id: z.string().max(64).optional(),
  raffle_name: z.string().max(200).optional(),
  amount: z.number().nonnegative(),
  currency: z.string().max(8).optional(),
  purchased_at: isoDateTime,
});

export const paymentEventSchema = z.object({
  action: paymentEventActionSchema,
  payment_id: z.string().min(1).max(64),
  amount: z.number().nonnegative(),
  currency: z.string().max(8).optional(),
  method: z.string().max(32).optional(),
  reference: z.string().max(128).optional(),
  occurred_at: isoDateTime,
});

export const operatorUpdatedEventSchema = z.object({
  field: z.string().min(1).max(64),
  previous_value: z.string().max(256).optional(),
  new_value: z.string().min(1).max(256),
  occurred_at: isoDateTime.optional(),
});

export type TicketEventInput = z.infer<typeof ticketEventSchema>;
export type PaymentEventInput = z.infer<typeof paymentEventSchema>;
export type OperatorUpdatedEventInput = z.infer<typeof operatorUpdatedEventSchema>;

export const LIVE_EVENT_TYPES = {
  TICKET_PURCHASED: "ticket.purchased",
  TICKET_VOIDED: "ticket.voided",
  PAYMENT_COMPLETED: "payment.completed",
  PAYMENT_FAILED: "payment.failed",
  OPERATOR_UPDATED: "operator.updated",
} as const;

export const LIVE_REDIS_CHANNELS = {
  ALL: "gra:live:all",
  TICKET: "gra:live:ticket",
  PAYMENT: "gra:live:payment",
  OPERATOR: "gra:live:operator",
} as const;

export type LiveFeedEvent = {
  id: string;
  operator_id: string;
  operator_external_id: string;
  operator_name: string;
  event_type: string;
  summary: string;
  amount: string | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
};
