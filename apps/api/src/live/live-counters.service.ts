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

  private operatorGatewayPaymentsKey(externalId: string, date: string) {
    return `${COUNTERS_PREFIX}:operator:${externalId}:gateway_payments:${date}`;
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

  async recordTaxEarmarked(amount: number) {
    const date = this.todayKey();
    const client = this.redis.getClient();
    const amountCents = Math.round(amount * 100);
    await client.incrby(`${COUNTERS_PREFIX}:global:tax:${date}`, amountCents);
  }

  async recordGatewayPaymentCompleted(operatorExternalId: string, grossAmount: number) {
    const date = this.todayKey();
    const client = this.redis.getClient();
    const amountCents = Math.round(grossAmount * 100);

    await client
      .multi()
      .incr(`${COUNTERS_PREFIX}:global:gateway_payments:${date}`)
      .incr(this.operatorGatewayPaymentsKey(operatorExternalId, date))
      .incrby(this.globalRevenueKey(date), amountCents)
      .incrby(this.operatorRevenueKey(operatorExternalId, date), amountCents)
      .exec();
  }

  async recordGatewayPayment() {
    const date = this.todayKey();
    const client = this.redis.getClient();
    await client.incr(`${COUNTERS_PREFIX}:global:gateway_payments:${date}`);
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

    const paymentsKey = operatorExternalId
      ? this.operatorGatewayPaymentsKey(operatorExternalId, date)
      : `${COUNTERS_PREFIX}:global:gateway_payments:${date}`;

    const [ticketsRaw, revenueCentsRaw, taxCentsRaw, paymentsRaw] = await client.mget(
      ticketsKey,
      revenueKey,
      `${COUNTERS_PREFIX}:global:tax:${date}`,
      paymentsKey,
    );
    const tickets = Math.max(0, Number(ticketsRaw ?? 0));
    const revenueCents = Math.max(0, Number(revenueCentsRaw ?? 0));
    const taxCents = Math.max(0, Number(taxCentsRaw ?? 0));
    const gatewayPayments = Math.max(0, Number(paymentsRaw ?? 0));

    return {
      date,
      tickets_today: tickets,
      revenue_today: (revenueCents / 100).toFixed(2),
      tax_earmarked_today: (taxCents / 100).toFixed(2),
      gateway_payments_today: gatewayPayments,
      scope: operatorExternalId ? "operator" : "global",
      operator_external_id: operatorExternalId ?? null,
    };
  }
}
