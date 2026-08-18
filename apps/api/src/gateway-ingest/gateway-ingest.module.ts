import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";
import { LiveModule } from "../live/live.module";
import { SettingsModule } from "../settings/settings.module";
import { GatewayIngestController } from "./gateway-ingest.controller";
import { GatewayPaymentService } from "../ingest/gateway-payment.service";
import { ApiKeyHmacGuard } from "../ingest/guards/api-key-hmac.guard";
import { RateLimitService } from "../ingest/rate-limit.service";

@Module({
  imports: [PrismaModule, RedisModule, LiveModule, SettingsModule],
  controllers: [GatewayIngestController],
  providers: [GatewayPaymentService, ApiKeyHmacGuard, RateLimitService],
})
export class GatewayIngestModule {}
