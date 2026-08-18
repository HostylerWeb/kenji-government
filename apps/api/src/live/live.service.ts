import { Injectable } from "@nestjs/common";
import type { LiveFeedEvent } from "@kenji-government/shared";
import { PrismaService } from "../prisma/prisma.service";
import { LivePubSubService } from "./live-pubsub.service";
import { LiveCountersService } from "./live-counters.service";
import { Observable } from "rxjs";

@Injectable()
export class LiveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pubsub: LivePubSubService,
    private readonly counters: LiveCountersService,
  ) {}

  async getRecentActivity(operatorExternalId?: string, limit = 25) {
    const operator = operatorExternalId
      ? await this.prisma.client.operators.findUnique({
          where: { external_id: operatorExternalId },
          select: { id: true },
        })
      : null;

    if (operatorExternalId && !operator) {
      return { items: [] };
    }

    const rows = await this.prisma.client.live_activity_feed.findMany({
      where: operator ? { operator_id: operator.id } : undefined,
      include: {
        operator: {
          select: { external_id: true, trading_name: true },
        },
      },
      orderBy: { occurred_at: "desc" },
      take: limit,
    });

    return {
      items: rows.map((row) => this.toFeedEvent(row)),
    };
  }

  getCounters(operatorExternalId?: string) {
    return this.counters.getCounters(operatorExternalId);
  }

  createEventStream(operatorExternalId?: string): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      const unsubscribe = this.pubsub.subscribe(
        (event) => {
          subscriber.next({ data: JSON.stringify(event) } as MessageEvent);
        },
        operatorExternalId,
      );

      return () => unsubscribe();
    });
  }

  toFeedEvent(row: {
    id: string;
    operator_id: string;
    event_type: string;
    summary: string;
    amount: { toString(): string } | null;
    metadata: unknown;
    occurred_at: Date;
    operator?: { external_id: string; trading_name: string };
  }): LiveFeedEvent {
    return {
      id: row.id,
      operator_id: row.operator_id,
      operator_external_id: row.operator?.external_id ?? "",
      operator_name: row.operator?.trading_name ?? "",
      event_type: row.event_type,
      summary: row.summary,
      amount: row.amount?.toString() ?? null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      occurred_at: row.occurred_at.toISOString(),
    };
  }
}
