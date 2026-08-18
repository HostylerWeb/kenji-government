import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ticketEventSchema,
  paymentEventSchema,
  operatorUpdatedEventSchema,
  LIVE_EVENT_TYPES,
  LIVE_REDIS_CHANNELS,
} from "@kenji-government/shared";

describe("realtime ingest schemas", () => {
  it("validates ticket purchased event", () => {
    const result = ticketEventSchema.safeParse({
      action: "purchased",
      ticket_id: "TKT-1",
      amount: 500,
      purchased_at: "2026-08-18T10:00:00+03:00",
    });
    assert.equal(result.success, true);
  });

  it("validates payment completed event", () => {
    const result = paymentEventSchema.safeParse({
      action: "completed",
      payment_id: "PAY-1",
      amount: 500,
      occurred_at: "2026-08-18T10:00:01+03:00",
    });
    assert.equal(result.success, true);
  });

  it("rejects invalid ticket action", () => {
    const result = ticketEventSchema.safeParse({
      action: "invalid",
      ticket_id: "TKT-1",
      amount: 500,
      purchased_at: "2026-08-18T10:00:00+03:00",
    });
    assert.equal(result.success, false);
  });

  it("validates operator updated event", () => {
    const result = operatorUpdatedEventSchema.safeParse({
      field: "site_status",
      new_value: "maintenance",
    });
    assert.equal(result.success, true);
  });

  it("exports live event type constants", () => {
    assert.equal(LIVE_EVENT_TYPES.TICKET_PURCHASED, "ticket.purchased");
    assert.equal(LIVE_REDIS_CHANNELS.ALL, "gra:live:all");
  });
});
