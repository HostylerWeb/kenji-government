import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  gatewayPaymentSchema,
  LIVE_EVENT_TYPES,
} from "@kenji-government/shared";
import { PrismaService } from "../prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";
import { LivePubSubService } from "../live/live-pubsub.service";
import { LiveCountersService } from "../live/live-counters.service";
import type { IngestSiteContext } from "./decorators/ingest-site.decorator";
import { evaluateAmlRules } from "./aml-rules";

@Injectable()
export class GatewayPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly pubsub: LivePubSubService,
    private readonly counters: LiveCountersService,
  ) {}

  async submitGatewayPayment(
    site: IngestSiteContext,
    payload: unknown,
    idempotencyKey: string,
  ) {
    const parsed = gatewayPaymentSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const existingEvent = await this.prisma.client.ingest_events.findUnique({
      where: { idempotency_key: idempotencyKey },
    });
    if (existingEvent) {
      return {
        ingest_event_id: existingEvent.id,
        status: existingEvent.status,
        message: "Already processed (idempotent)",
      };
    }

    const existingTx = await this.prisma.client.payment_transactions.findUnique({
      where: { external_transaction_id: parsed.data.external_transaction_id },
    });
    if (existingTx) {
      throw new BadRequestException("Duplicate external_transaction_id");
    }

    if (parsed.data.status === "failed") {
      return this.recordFailedPayment(site, parsed.data, idempotencyKey);
    }

    return this.recordCompletedPayment(site, parsed.data, idempotencyKey);
  }

  private async recordCompletedPayment(
    site: IngestSiteContext,
    data: ReturnType<typeof gatewayPaymentSchema.parse>,
    idempotencyKey: string,
  ) {
    const taxRate = await this.settings.getTaxRate();
    const gross = data.gross_amount;
    const taxAmount = data.tax_amount ?? roundMoney(gross * taxRate);
    const operatorAmount = data.operator_amount ?? roundMoney(gross - taxAmount);

    const completedAt = data.completed_at
      ? new Date(data.completed_at)
      : new Date();

    const operator = await this.prisma.client.operators.findUnique({
      where: { id: site.operatorId },
    });

    const aml = evaluateAmlRules({
      grossAmount: gross,
      kycStatus: data.kyc_status ?? "pending",
      payerFingerprint: data.payer_fingerprint,
    });

    const payment = await this.prisma.client.payment_transactions.create({
      data: {
        external_transaction_id: data.external_transaction_id,
        operator_id: site.operatorId,
        operator_site_id: site.siteId,
        ticket_reference: data.ticket_reference,
        gross_amount: gross,
        operator_amount: operatorAmount,
        tax_amount: taxAmount,
        tax_rate: taxRate,
        currency: data.currency,
        status: "completed",
        kyc_status: data.kyc_status ?? "pending",
        aml_risk_score: aml.riskScore,
        payer_fingerprint: data.payer_fingerprint,
        county: data.county ?? operator?.county,
        completed_at: completedAt,
      },
    });

    await this.prisma.client.tax_escrow_entries.create({
      data: {
        payment_transaction_id: payment.id,
        tax_amount: taxAmount,
        status: "earmarked",
        earmarked_at: completedAt,
      },
    });

    if (aml.alert) {
      await this.prisma.client.aml_alerts.create({
        data: {
          payment_transaction_id: payment.id,
          operator_id: site.operatorId,
          alert_type: aml.alert.type,
          severity: aml.alert.severity,
          details: aml.alert.details as Prisma.InputJsonValue,
          status: "open",
        },
      });
    }

    const ingestEvent = await this.prisma.client.ingest_events.create({
      data: {
        operator_site_id: site.siteId,
        event_type: "gateway.payment",
        idempotency_key: idempotencyKey,
        raw_payload: {
          payment_transaction_id: payment.id,
          tax_amount: taxAmount,
          external_transaction_id: data.external_transaction_id,
          gross_amount: gross,
          status: "completed",
        },
        status: "processed",
        processed_at: new Date(),
      },
    });

    await this.counters.recordTaxEarmarked(taxAmount);
    await this.counters.recordGatewayPaymentCompleted(
      site.operatorExternalId,
      gross,
    );

    const feedRow = await this.prisma.client.live_activity_feed.create({
      data: {
        operator_id: site.operatorId,
        event_type: LIVE_EVENT_TYPES.PAYMENT_COMPLETED,
        summary: `Gateway payment KES ${gross.toFixed(2)} (tax KES ${taxAmount.toFixed(2)})`,
        amount: new Prisma.Decimal(gross),
        metadata: {
          payment_transaction_id: payment.id,
          tax_amount: taxAmount,
          external_transaction_id: data.external_transaction_id,
        },
        occurred_at: completedAt,
      },
      include: {
        operator: { select: { external_id: true, trading_name: true } },
      },
    });

    await this.pubsub.publish(
      {
        id: feedRow.id,
        operator_id: feedRow.operator_id,
        operator_external_id: feedRow.operator.external_id,
        operator_name: feedRow.operator.trading_name,
        event_type: feedRow.event_type,
        summary: feedRow.summary,
        amount: feedRow.amount?.toString() ?? null,
        metadata: feedRow.metadata as Record<string, unknown>,
        occurred_at: feedRow.occurred_at.toISOString(),
      },
      "payment",
    );

    return {
      ingest_event_id: ingestEvent.id,
      payment_transaction_id: payment.id,
      gross_amount: gross,
      tax_amount: taxAmount,
      operator_amount: operatorAmount,
      tax_rate: taxRate,
      status: "completed",
    };
  }

  private async recordFailedPayment(
    site: IngestSiteContext,
    data: ReturnType<typeof gatewayPaymentSchema.parse>,
    idempotencyKey: string,
  ) {
    const taxRate = await this.settings.getTaxRate();
    const gross = data.gross_amount;
    const declineReason = data.decline_reason ?? "Payment declined";

    const operator = await this.prisma.client.operators.findUnique({
      where: { id: site.operatorId },
    });

    const payment = await this.prisma.client.payment_transactions.create({
      data: {
        external_transaction_id: data.external_transaction_id,
        operator_id: site.operatorId,
        operator_site_id: site.siteId,
        ticket_reference: data.ticket_reference,
        gross_amount: gross,
        operator_amount: 0,
        tax_amount: 0,
        tax_rate: taxRate,
        currency: data.currency,
        status: "failed",
        kyc_status: data.kyc_status ?? "pending",
        payer_fingerprint: data.payer_fingerprint,
        county: data.county ?? operator?.county,
      },
    });

    const occurredAt = new Date();

    const ingestEvent = await this.prisma.client.ingest_events.create({
      data: {
        operator_site_id: site.siteId,
        event_type: "gateway.payment.failed",
        idempotency_key: idempotencyKey,
        raw_payload: {
          payment_transaction_id: payment.id,
          external_transaction_id: data.external_transaction_id,
          gross_amount: gross,
          status: "failed",
          decline_reason: declineReason,
        },
        status: "processed",
        processed_at: new Date(),
      },
    });

    const feedRow = await this.prisma.client.live_activity_feed.create({
      data: {
        operator_id: site.operatorId,
        event_type: LIVE_EVENT_TYPES.PAYMENT_FAILED,
        summary: `Gateway payment failed KES ${gross.toFixed(2)} — ${declineReason}`,
        amount: new Prisma.Decimal(gross),
        metadata: {
          payment_transaction_id: payment.id,
          external_transaction_id: data.external_transaction_id,
          decline_reason: declineReason,
        },
        occurred_at: occurredAt,
      },
      include: {
        operator: { select: { external_id: true, trading_name: true } },
      },
    });

    await this.pubsub.publish(
      {
        id: feedRow.id,
        operator_id: feedRow.operator_id,
        operator_external_id: feedRow.operator.external_id,
        operator_name: feedRow.operator.trading_name,
        event_type: feedRow.event_type,
        summary: feedRow.summary,
        amount: feedRow.amount?.toString() ?? null,
        metadata: feedRow.metadata as Record<string, unknown>,
        occurred_at: feedRow.occurred_at.toISOString(),
      },
      "payment",
    );

    return {
      ingest_event_id: ingestEvent.id,
      payment_transaction_id: payment.id,
      gross_amount: gross,
      status: "failed",
      decline_reason: declineReason,
    };
  }
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
