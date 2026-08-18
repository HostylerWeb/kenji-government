import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import {
  INGEST_DLQ_NAME,
  INGEST_QUEUE_NAME,
} from "@kenji-government/shared";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class IngestQueueService {
  private readonly queue: Queue;
  private readonly deadLetterQueue: Queue;

  constructor(private readonly redis: RedisService) {
    const connection = this.redis.getClient();
    this.queue = new Queue(INGEST_QUEUE_NAME, { connection });
    this.deadLetterQueue = new Queue(INGEST_DLQ_NAME, { connection });
  }

  async enqueueMonthlyReturn(ingestEventId: string) {
    await this.queue.add(
      "monthly-return",
      { ingestEventId },
      {
        attempts: 5,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 1000,
        removeOnFail: false,
      },
    );
  }

  async moveToDeadLetter(
    ingestEventId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.deadLetterQueue.add("failed-ingest", {
      ingestEventId,
      errorMessage,
      failedAt: new Date().toISOString(),
    });
  }
}
