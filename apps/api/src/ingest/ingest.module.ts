import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";
import { DocumentsModule } from "../documents/documents.module";
import { LiveModule } from "../live/live.module";
import { IngestController } from "./ingest.controller";
import { IngestService } from "./ingest.service";
import { IngestQueueService } from "./ingest-queue.service";
import { RateLimitService } from "./rate-limit.service";
import { RealtimeEventsService } from "./realtime-events.service";
import { PlayerSafetyEventsService } from "./player-safety-events.service";
import { ApiKeyHmacGuard } from "./guards/api-key-hmac.guard";

@Module({
  imports: [PrismaModule, RedisModule, DocumentsModule, LiveModule],
  controllers: [IngestController],
  providers: [
    IngestService,
    IngestQueueService,
    RateLimitService,
    RealtimeEventsService,
    PlayerSafetyEventsService,
    ApiKeyHmacGuard,
  ],
})
export class IngestModule {}
