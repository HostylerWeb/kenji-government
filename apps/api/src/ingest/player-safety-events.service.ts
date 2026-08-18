import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  containsForbiddenPii,
  deriveHourAndDay,
  playerSafetyEventSchema,
  sessionAggregateSchema,
  type PlayerSafetyEventInput,
  type SessionAggregateInput,
} from "@kenji-government/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { IngestSiteContext } from "./decorators/ingest-site.decorator";

@Injectable()
export class PlayerSafetyEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async submitPlayerSafetyEvent(
    site: IngestSiteContext,
    payload: unknown,
    idempotencyKey: string,
  ) {
    this.rejectIfPii(payload);

    const parsed = playerSafetyEventSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const existing = await this.findIdempotentEvent(idempotencyKey);
    if (existing) {
      return this.formatIngestResponse(existing);
    }

    const timing = deriveHourAndDay(
      parsed.data.occurred_at,
      parsed.data.hour_of_day,
      parsed.data.day_of_week,
    );

    await this.prisma.client.player_safety_events.create({
      data: {
        operator_site_id: site.siteId,
        event_type: parsed.data.event_type,
        county: parsed.data.county,
        region: parsed.data.region,
        hour_of_day: timing.hour_of_day,
        day_of_week: timing.day_of_week,
        occurred_at: parsed.data.occurred_at,
      },
    });

    await this.recordIngestEvent(
      site,
      idempotencyKey,
      "player_safety",
      parsed.data,
    );

    const event = await this.prisma.client.ingest_events.findUnique({
      where: { idempotency_key: idempotencyKey },
    });

    return this.formatIngestResponse(event!);
  }

  async submitSessionAggregate(
    site: IngestSiteContext,
    payload: unknown,
    idempotencyKey: string,
  ) {
    this.rejectIfPii(payload);

    const parsed = sessionAggregateSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const existing = await this.findIdempotentEvent(idempotencyKey);
    if (existing) {
      return this.formatIngestResponse(existing);
    }

    const timing = deriveHourAndDay(
      parsed.data.bucket_start,
      parsed.data.hour_of_day,
      parsed.data.day_of_week,
    );

    const existingRow = await this.prisma.client.session_aggregate_events.findUnique({
      where: {
        operator_site_id_county_bucket_start: {
          operator_site_id: site.siteId,
          county: parsed.data.county,
          bucket_start: parsed.data.bucket_start,
        },
      },
    });

    const mergedBands = existingRow
      ? this.sumBandCounts(
          existingRow.stake_band_distribution as Record<string, number>,
          parsed.data.stake_band_distribution,
        )
      : parsed.data.stake_band_distribution;

    const mergedAgeBands = existingRow
      ? this.sumBandCounts(
          existingRow.age_band_distribution as Record<string, number>,
          parsed.data.age_band_distribution,
        )
      : parsed.data.age_band_distribution;

    await this.prisma.client.session_aggregate_events.upsert({
      where: {
        operator_site_id_county_bucket_start: {
          operator_site_id: site.siteId,
          county: parsed.data.county,
          bucket_start: parsed.data.bucket_start,
        },
      },
      create: {
        operator_site_id: site.siteId,
        county: parsed.data.county,
        region: parsed.data.region,
        bucket_start: parsed.data.bucket_start,
        day_of_week: timing.day_of_week,
        hour_of_day: timing.hour_of_day,
        session_count: parsed.data.session_count,
        total_session_minutes: parsed.data.total_session_minutes,
        stake_band_distribution:
          mergedBands as Prisma.InputJsonValue,
        age_band_distribution:
          mergedAgeBands as Prisma.InputJsonValue,
      },
      update: {
        session_count: {
          increment: parsed.data.session_count,
        },
        total_session_minutes: {
          increment: parsed.data.total_session_minutes,
        },
        stake_band_distribution: mergedBands as Prisma.InputJsonValue,
        age_band_distribution: mergedAgeBands as Prisma.InputJsonValue,
      },
    });

    await this.recordIngestEvent(
      site,
      idempotencyKey,
      "session_aggregate",
      parsed.data,
    );

    const event = await this.prisma.client.ingest_events.findUnique({
      where: { idempotency_key: idempotencyKey },
    });

    return this.formatIngestResponse(event!);
  }

  private rejectIfPii(payload: unknown) {
    const forbiddenKey = containsForbiddenPii(payload);
    if (forbiddenKey) {
      throw new BadRequestException(
        `Payload contains forbidden PII field: ${forbiddenKey}`,
      );
    }
  }

  private sumBandCounts(
    existing: Record<string, number> | null,
    incoming: Record<string, number>,
  ): Record<string, number> {
    const merged = { ...(existing ?? {}) };
    for (const [band, count] of Object.entries(incoming)) {
      merged[band] = (merged[band] ?? 0) + count;
    }
    return merged;
  }

  private async recordIngestEvent(
    site: IngestSiteContext,
    idempotencyKey: string,
    eventType: string,
    payload: PlayerSafetyEventInput | SessionAggregateInput,
  ) {
    await this.prisma.client.ingest_events.create({
      data: {
        operator_site_id: site.siteId,
        event_type: eventType,
        idempotency_key: idempotencyKey,
        raw_payload: payload as Prisma.InputJsonValue,
        status: "processed",
        processed_at: new Date(),
      },
    });
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
