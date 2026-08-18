-- CreateTable
CREATE TABLE "live_activity_feed" (
    "id" UUID NOT NULL,
    "operator_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "amount" DECIMAL(18,2),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_activity_feed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "live_activity_feed_operator_id_occurred_at_idx" ON "live_activity_feed"("operator_id", "occurred_at");

-- CreateIndex
CREATE INDEX "live_activity_feed_occurred_at_idx" ON "live_activity_feed"("occurred_at");

-- AddForeignKey
ALTER TABLE "live_activity_feed" ADD CONSTRAINT "live_activity_feed_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;
