import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { REPORT_QUEUE_NAME } from "@kenji-government/shared";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class ReportsQueueService {
  private readonly queue: Queue;

  constructor(private readonly redis: RedisService) {
    this.queue = new Queue(REPORT_QUEUE_NAME, {
      connection: this.redis.getClient(),
    });
  }

  async enqueueGenerate(reportRunId: string) {
    await this.queue.add(
      "generate",
      { reportRunId },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
  }

  getQueue(): Queue {
    return this.queue;
  }
}
