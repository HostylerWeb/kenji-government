import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { LIVE_REDIS_CHANNELS, type LiveFeedEvent } from "@kenji-government/shared";
import { RedisService } from "../redis/redis.service";
import Redis from "ioredis";

@Injectable()
export class LivePubSubService implements OnModuleDestroy {
  private readonly logger = new Logger(LivePubSubService.name);
  private readonly subscriber: Redis;

  constructor(private readonly redis: RedisService) {
    this.subscriber = new Redis(
      process.env.REDIS_URL ?? "redis://localhost:6382",
      { maxRetriesPerRequest: null },
    );
  }

  async publish(event: LiveFeedEvent, eventCategory: "ticket" | "payment" | "operator") {
    const payload = JSON.stringify(event);
    const client = this.redis.getClient();

    const channel =
      eventCategory === "ticket"
        ? LIVE_REDIS_CHANNELS.TICKET
        : eventCategory === "payment"
          ? LIVE_REDIS_CHANNELS.PAYMENT
          : LIVE_REDIS_CHANNELS.OPERATOR;

    await client.publish(channel, payload);
    await client.publish(LIVE_REDIS_CHANNELS.ALL, payload);
  }

  subscribe(
    onMessage: (event: LiveFeedEvent) => void,
    operatorExternalId?: string,
  ): () => void {
    const handler = (channel: string, message: string) => {
      if (channel !== LIVE_REDIS_CHANNELS.ALL) return;
      try {
        const event = JSON.parse(message) as LiveFeedEvent;
        if (
          operatorExternalId &&
          event.operator_external_id !== operatorExternalId
        ) {
          return;
        }
        onMessage(event);
      } catch (err) {
        this.logger.warn(`Invalid live event payload: ${String(err)}`);
      }
    };

    this.subscriber.on("message", handler);
    this.subscriber.subscribe(LIVE_REDIS_CHANNELS.ALL).catch((err) => {
      this.logger.error(`Redis subscribe failed: ${String(err)}`);
    });

    return () => {
      this.subscriber.off("message", handler);
      this.subscriber.unsubscribe(LIVE_REDIS_CHANNELS.ALL).catch(() => {});
    };
  }

  async onModuleDestroy() {
    await this.subscriber.quit();
  }
}
