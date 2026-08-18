import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";
import { StorageModule } from "../storage/storage.module";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { ReportsQueueService } from "./reports-queue.service";

@Module({
  imports: [PrismaModule, RedisModule, StorageModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsQueueService],
  exports: [ReportsService],
})
export class ReportsModule {}
