-- CreateEnum
CREATE TYPE "player_safety_event_type" AS ENUM ('play_safe', 'self_exclusion', 'session_end', 'stake_placed');

-- CreateTable
CREATE TABLE "player_safety_events" (
    "id" UUID NOT NULL,
    "operator_site_id" UUID NOT NULL,
    "event_type" "player_safety_event_type" NOT NULL,
    "county" TEXT NOT NULL,
    "region" TEXT,
    "hour_of_day" INTEGER NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "stake_amount_band" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_safety_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_aggregate_events" (
    "id" UUID NOT NULL,
    "operator_site_id" UUID NOT NULL,
    "county" TEXT NOT NULL,
    "region" TEXT,
    "bucket_start" TIMESTAMPTZ(6) NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "hour_of_day" INTEGER NOT NULL,
    "session_count" BIGINT NOT NULL DEFAULT 0,
    "total_session_minutes" BIGINT NOT NULL DEFAULT 0,
    "stake_band_distribution" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_aggregate_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_safety_aggregates" (
    "id" UUID NOT NULL,
    "reporting_period_id" UUID,
    "bucket_date" DATE NOT NULL,
    "county" TEXT NOT NULL,
    "region" TEXT,
    "play_safe_activations" BIGINT NOT NULL DEFAULT 0,
    "self_exclusion_requests" BIGINT NOT NULL DEFAULT 0,
    "session_count" BIGINT NOT NULL DEFAULT 0,
    "avg_session_minutes" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "peak_hour" INTEGER,
    "stake_band_distribution" JSONB NOT NULL DEFAULT '{}',
    "hour_by_day_matrix" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "player_safety_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "player_safety_events_county_occurred_at_idx" ON "player_safety_events"("county", "occurred_at");

-- CreateIndex
CREATE INDEX "player_safety_events_operator_site_id_occurred_at_idx" ON "player_safety_events"("operator_site_id", "occurred_at");

-- CreateIndex
CREATE INDEX "player_safety_events_event_type_occurred_at_idx" ON "player_safety_events"("event_type", "occurred_at");

-- CreateIndex
CREATE INDEX "session_aggregate_events_county_bucket_start_idx" ON "session_aggregate_events"("county", "bucket_start");

-- CreateIndex
CREATE UNIQUE INDEX "session_aggregate_events_operator_site_id_county_bucket_sta_key" ON "session_aggregate_events"("operator_site_id", "county", "bucket_start");

-- CreateIndex
CREATE INDEX "player_safety_aggregates_county_idx" ON "player_safety_aggregates"("county");

-- CreateIndex
CREATE INDEX "player_safety_aggregates_bucket_date_idx" ON "player_safety_aggregates"("bucket_date");

-- CreateIndex
CREATE UNIQUE INDEX "player_safety_aggregates_bucket_date_county_key" ON "player_safety_aggregates"("bucket_date", "county");

-- AddForeignKey
ALTER TABLE "player_safety_events" ADD CONSTRAINT "player_safety_events_operator_site_id_fkey" FOREIGN KEY ("operator_site_id") REFERENCES "operator_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_aggregate_events" ADD CONSTRAINT "session_aggregate_events_operator_site_id_fkey" FOREIGN KEY ("operator_site_id") REFERENCES "operator_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_safety_aggregates" ADD CONSTRAINT "player_safety_aggregates_reporting_period_id_fkey" FOREIGN KEY ("reporting_period_id") REFERENCES "reporting_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
