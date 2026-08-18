import { Injectable } from "@nestjs/common";
import { RedisService } from "../redis/redis.service";

const COUNTERS_PREFIX = "gra:live:counters";

@Injectable()
export class LiveCountersService {
  constructor(private readonly redis: RedisService) {}

  todayKey(): string {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
  }

  private globalTicketsKey(date: string) {
    return `${COUNTERS_PREFIX}:global:tickets:${date}`;
  }

  private globalRevenueKey(date: string) {
    return `${COUNTERS_PREFIX}:global:revenue:${date}`;
  }

  private operatorTicketsKey(externalId: string, date: string) {
    return `${COUNTERS_PREFIX}:operator:${externalId}:tickets:${date}`;
  }

  private operatorRevenueKey(externalId: string, date: string) {
    return `${COUNTERS_PREFIX}:operator:${externalId}:revenue:${date}`;
  }

  async recordTicketPurchase(externalId: string, amount: number) {
    const date = this.todayKey();
    const client = this.redis.getClient();
    const amountCents = Math.round(amount * 100);

    await client
      .multi()
      .incr(this.globalTicketsKey(date))
      .incrby(this.globalRevenueKey(date), amountCents)
      .incr(this.operatorTicketsKey(externalId, date))
      .incrby(this.operatorRevenueKey(externalId, date), amountCents)
      .exec();
  }

  async recordTicketVoid(externalId: string, amount: number) {
    const date = this.todayKey();
    const client = this.redis.getClient();
    const amountCents = Math.round(amount * 100);

    await client
      .multi()
      .decr(this.globalTicketsKey(date))
      .incrby(this.globalRevenueKey(date), -amountCents)
      .decr(this.operatorTicketsKey(externalId, date))
      .incrby(this.operatorRevenueKey(externalId, date), -amountCents)
      .exec();
  }

  async getCounters(operatorExternalId?: string) {
    const date = this.todayKey();
    const client = this.redis.getClient();

    const ticketsKey = operatorExternalId
      ? this.operatorTicketsKey(operatorExternalId, date)
      : this.globalTicketsKey(date);
    const revenueKey = operatorExternalId
      ? this.operatorRevenueKey(operatorExternalId, date)
      : this.globalRevenueKey(date);

    const [ticketsRaw, revenueCentsRaw] = await client.mget(ticketsKey, revenueKey);
    const tickets = Math.max(0, Number(ticketsRaw ?? 0));
    const revenueCents = Math.max(0, Number(revenueCentsRaw ?? 0));

    return {
      date,
      tickets_today: tickets,
      revenue_today: (revenueCents / 100).toFixed(2),
      scope: operatorExternalId ? "operator" : "global",
      operator_external_id: operatorExternalId ?? null,
    };
  }
}
