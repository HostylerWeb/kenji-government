import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { Worker, Queue } from "bullmq";
import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";
import {
  INGEST_DLQ_NAME,
  INGEST_QUEUE_NAME,
  REPORT_QUEUE_NAME,
  TAX_WITHDRAWAL_QUEUE_JOB,
} from "@kenji-government/shared";
import { processMonthlyReturn } from "./processors/monthly-return.processor";
import { processReportRun, runScheduledReports } from "./reports/process-report";
import {
  aggregatePlayerSafetyRange,
} from "./player-safety/aggregate-player-safety";
import { runEodTaxWithdrawal } from "./payments/tax-withdrawal";

loadEnv({ path: resolve(__dirname, "../../../.env") });

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6382";
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const prisma = new PrismaClient();
const deadLetterQueue = new Queue(INGEST_DLQ_NAME, { connection });
const reportQueue = new Queue(REPORT_QUEUE_NAME, { connection });

async function recordAdminAlert(ingestEventId: string, errorMessage: string) {
  const admin = await prisma.users.findFirst({
    where: {
      role: { in: ["super_admin", "admin"] },
      is_active: true,
    },
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

const ingestWorker = new Worker(
  INGEST_QUEUE_NAME,
  async (job) => {
    if (job.name === "monthly-return") {
      await processMonthlyReturn(prisma, job.data.ingestEventId);
    }
  },
  { connection, concurrency: 5 },
);

ingestWorker.on("failed", async (job, error) => {
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

async function registerScheduledReports() {
  await reportQueue.add(
    "scheduled-daily",
    {},
    {
      repeat: { pattern: "0 3 * * *" },
      jobId: "scheduled-daily-reports",
    },
  );
  console.log("Scheduled daily reports at 06:00 EAT (03:00 UTC)");
}

async function registerPlayerSafetyAggregation() {
  await reportQueue.add(
    "player-safety-nightly",
    {},
    {
      repeat: { pattern: "0 21 * * *" },
      jobId: "player-safety-nightly-aggregate",
    },
  );
  console.log("Scheduled player safety aggregation at midnight EAT (21:00 UTC)");
}

registerScheduledReports().catch((err) => {
  console.error("Failed to register scheduled reports:", err);
});

registerPlayerSafetyAggregation().catch((err) => {
  console.error("Failed to register player safety aggregation:", err);
});

async function registerEodTaxWithdrawal() {
  await reportQueue.add(
    TAX_WITHDRAWAL_QUEUE_JOB,
    {},
    {
      repeat: { pattern: "59 20 * * *" },
      jobId: "tax-withdrawal-eod",
    },
  );
  console.log("Scheduled EOD tax withdrawal at 23:59 EAT (20:59 UTC)");
}

registerEodTaxWithdrawal().catch((err) => {
  console.error("Failed to register EOD tax withdrawal:", err);
});

const reportWorker = new Worker(
  REPORT_QUEUE_NAME,
  async (job) => {
    if (job.name === "generate") {
      await processReportRun(prisma, job.data.reportRunId);
    }
    if (job.name === "scheduled-daily") {
      await runScheduledReports(prisma);
    }
    if (job.name === "player-safety-nightly") {
      const result = await aggregatePlayerSafetyRange(prisma, 1);
      console.log(
        `Player safety aggregation complete: ${JSON.stringify(result)}`,
      );
    }
    if (job.name === TAX_WITHDRAWAL_QUEUE_JOB) {
      const result = await runEodTaxWithdrawal(prisma);
      console.log(`EOD tax withdrawal: ${JSON.stringify(result)}`);
    }
  },
  { connection, concurrency: 2 },
);

reportWorker.on("failed", (job, error) => {
  console.error(`Report job failed: ${job?.id} — ${error.message}`);
});

console.log(
  `Worker listening on queues: ${INGEST_QUEUE_NAME}, ${REPORT_QUEUE_NAME}`,
);
