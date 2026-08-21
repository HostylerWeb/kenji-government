import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  LIVE_EVENT_TYPES,
  operatorUpdatedEventSchema,
  paymentEventSchema,
  ticketEventSchema,
  type LiveFeedEvent,
  type OperatorUpdatedEventInput,
  type PaymentEventInput,
} from "@kenji-government/shared";
import { PrismaService } from "../prisma/prisma.service";
import { LivePubSubService } from "../live/live-pubsub.service";
import { LiveService } from "../live/live.service";
import type { IngestSiteContext } from "./decorators/ingest-site.decorator";

@Injectable()
export class RealtimeEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pubsub: LivePubSubService,
    private readonly live: LiveService,
  ) {}

  async submitTicketEvent(
    site: IngestSiteContext,
    payload: unknown,
    idempotencyKey: string,
  ) {
    const parsed = ticketEventSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const existing = await this.findIdempotentEvent(idempotencyKey);
    if (existing) {
      return this.formatIngestResponse(existing);
    }

    // Ticket events are accepted for operator audit/idempotency only — they are
    // not written to the oversight feed, Redis counters, or SSE streams.
    const event = await this.prisma.client.ingest_events.create({
      data: {
        operator_site_id: site.siteId,
        event_type: "ticket",
        idempotency_key: idempotencyKey,
        raw_payload: parsed.data as Prisma.InputJsonValue,
        status: "processed",
        processed_at: new Date(),
      },
    });

    return this.formatIngestResponse(event);
  }

  async submitPaymentEvent(
    site: IngestSiteContext,
    payload: unknown,
    idempotencyKey: string,
  ) {
    const parsed = paymentEventSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const existing = await this.findIdempotentEvent(idempotencyKey);
    if (existing) {
      return this.formatIngestResponse(existing);
    }

    const eventType =
      parsed.data.action === "completed"
        ? LIVE_EVENT_TYPES.PAYMENT_COMPLETED
        : LIVE_EVENT_TYPES.PAYMENT_FAILED;

    const feedEvent = await this.persistEvent(
      site,
      idempotencyKey,
      "payment",
      eventType,
      this.paymentSummary(parsed.data),
      parsed.data.amount,
      {
        payment_id: parsed.data.payment_id,
        action: parsed.data.action,
        method: parsed.data.method,
        reference: parsed.data.reference,
        currency: parsed.data.currency ?? "KES",
      },
      new Date(parsed.data.occurred_at),
    );

    await this.pubsub.publish(feedEvent, "payment");

    const event = await this.prisma.client.ingest_events.findUnique({
      where: { idempotency_key: idempotencyKey },
    });

    return this.formatIngestResponse(event!);
  }

  async submitOperatorUpdatedEvent(
    site: IngestSiteContext,
    payload: unknown,
    idempotencyKey: string,
  ) {
    const parsed = operatorUpdatedEventSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const existing = await this.findIdempotentEvent(idempotencyKey);
    if (existing) {
      return this.formatIngestResponse(existing);
    }

    const occurredAt = parsed.data.occurred_at
      ? new Date(parsed.data.occurred_at)
      : new Date();

    const feedEvent = await this.persistEvent(
      site,
      idempotencyKey,
      "operator_updated",
      LIVE_EVENT_TYPES.OPERATOR_UPDATED,
      this.operatorUpdatedSummary(parsed.data),
      null,
      {
        field: parsed.data.field,
        previous_value: parsed.data.previous_value,
        new_value: parsed.data.new_value,
      },
      occurredAt,
    );

    await this.pubsub.publish(feedEvent, "operator");

    const event = await this.prisma.client.ingest_events.findUnique({
      where: { idempotency_key: idempotencyKey },
    });

    return this.formatIngestResponse(event!);
  }

  private async persistEvent(
    site: IngestSiteContext,
    idempotencyKey: string,
    ingestEventType: string,
    feedEventType: string,
    summary: string,
    amount: number | null,
    metadata: Record<string, unknown>,
    occurredAt: Date,
  ): Promise<LiveFeedEvent> {
    const operator = await this.prisma.client.operators.findUnique({
      where: { external_id: site.operatorExternalId },
      select: { id: true, external_id: true, trading_name: true },
    });

    if (!operator) {
      throw new BadRequestException("Operator not found for site");
    }

    const feedRow = await this.prisma.client.live_activity_feed.create({
      data: {
        operator_id: operator.id,
        event_type: feedEventType,
        summary,
        amount: amount ?? undefined,
        metadata: metadata as Prisma.InputJsonValue,
        occurred_at: occurredAt,
      },
      include: {
        operator: { select: { external_id: true, trading_name: true } },
      },
    });

    await this.prisma.client.ingest_events.create({
      data: {
        operator_site_id: site.siteId,
        event_type: ingestEventType,
        idempotency_key: idempotencyKey,
        raw_payload: { feed_id: feedRow.id, ...metadata },
        status: "processed",
        processed_at: new Date(),
      },
    });

    return this.live.toFeedEvent(feedRow);
  }

  private paymentSummary(data: PaymentEventInput) {
    const amount = `Ksh ${data.amount.toLocaleString("en-KE")}`;
    return data.action === "completed"
      ? `Payment completed ${amount}`
      : `Payment failed ${amount}`;
  }

  private operatorUpdatedSummary(data: OperatorUpdatedEventInput) {
    const prev = data.previous_value ? ` (was ${data.previous_value})` : "";
    return `Operator ${data.field} → ${data.new_value}${prev}`;
  }

  private async findIdempotentEvent(idempotencyKey: string) {
    return this.prisma.client.ingest_events.findUnique({
      where: { idempotency_key: idempotencyKey },
    });
  }

  private formatIngestResponse(event: {
    id: string;
    event_type: string;
    status: string;
    created_at: Date;
    processed_at: Date | null;
  }) {
    return {
      ingest_event_id: event.id,
      event_type: event.event_type,
      status: event.status,
      received_at: event.created_at.toISOString(),
      processed_at: event.processed_at?.toISOString() ?? null,
    };
  }
}
