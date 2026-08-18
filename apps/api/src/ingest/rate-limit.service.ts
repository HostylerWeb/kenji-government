import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { INGEST_RATE_LIMIT_PER_MINUTE } from "@kenji-government/shared";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class RateLimitService {
  constructor(private readonly redis: RedisService) {}

  async check(apiKeyPrefix: string): Promise<void> {
    const minute = Math.floor(Date.now() / 60000);
    const key = `ingest:rate:${apiKeyPrefix}:${minute}`;
    const client = this.redis.getClient();
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, 60);
    }
    if (count > INGEST_RATE_LIMIT_PER_MINUTE) {
      throw new HttpException(
        "Rate limit exceeded (60 requests per minute)",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
