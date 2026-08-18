import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";
import { LivePubSubService } from "./live-pubsub.service";
import { LiveCountersService } from "./live-counters.service";
import { LiveService } from "./live.service";

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [LivePubSubService, LiveCountersService, LiveService],
  exports: [LivePubSubService, LiveCountersService, LiveService],
})
export class LiveModule {}
