import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { Worker, Queue } from "bullmq";
import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { INGEST_DLQ_NAME, INGEST_QUEUE_NAME } from "@kenji-government/shared";
import { processMonthlyReturn } from "./processors/monthly-return.processor";

loadEnv({ path: resolve(__dirname, "../../../.env") });

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6382";
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const prisma = new PrismaClient();
const deadLetterQueue = new Queue(INGEST_DLQ_NAME, { connection });

async function recordAdminAlert(ingestEventId: string, errorMessage: string) {
  const admin = await prisma.users.findFirst({
    where: { role: "admin", is_active: true },
    select: { id: true },
  });

  await prisma.audit_logs.create({
    data: {
      user_id: admin?.id ?? null,
      action: "ingest.job_failed",
      entity_type: "ingest_events",
      entity_id: ingestEventId,
      metadata: { error: errorMessage },
    },
  });
}

const worker = new Worker(
  INGEST_QUEUE_NAME,
  async (job) => {
    if (job.name === "monthly-return") {
      await processMonthlyReturn(prisma, job.data.ingestEventId);
    }
  },
  { connection, concurrency: 5 },
);

worker.on("failed", async (job, error) => {
  if (!job) return;
  const ingestEventId = job.data?.ingestEventId as string | undefined;
  if (!ingestEventId) return;

  const maxAttempts = job.opts.attempts ?? 1;
  const isFinalFailure = job.attemptsMade >= maxAttempts;

  if (!isFinalFailure) {
    await prisma.ingest_events.update({
      where: { id: ingestEventId },
      data: {
        status: "received",
        error_message: error.message,
      },
    });
    return;
  }

  await prisma.ingest_events.update({
    where: { id: ingestEventId },
    data: {
      status: "failed",
      error_message: error.message,
      processed_at: new Date(),
    },
  });

  await deadLetterQueue.add("failed-ingest", {
    ingestEventId,
    errorMessage: error.message,
    failedAt: new Date().toISOString(),
  });

  await recordAdminAlert(ingestEventId, error.message);
  console.error(`Ingest job moved to DLQ: ${ingestEventId} — ${error.message}`);
});

console.log(`Worker listening on queue: ${INGEST_QUEUE_NAME}`);
