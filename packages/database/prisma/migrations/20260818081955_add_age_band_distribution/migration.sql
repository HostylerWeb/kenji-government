-- AlterTable
ALTER TABLE "player_safety_aggregates" ADD COLUMN     "age_band_distribution" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "session_aggregate_events" ADD COLUMN     "age_band_distribution" JSONB NOT NULL DEFAULT '{}';
